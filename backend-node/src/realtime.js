// FILE: backend-node/src/realtime.js
// PURPOSE: WebSocket realtime layer — authoritative shared room state, broadcast to all clients.
// TRANSPORT: ws over /ws. Multi-instance fan-out via Redis pub/sub. Durable via Postgres JSONB.

const { WebSocketServer } = require('ws');
const crypto = require('crypto');

// Collections the room is allowed to hold. Anything else is rejected at the boundary.
const COLLECTIONS = new Set(['deals', 'campaigns', 'messages', 'applications', 'notifications', 'events']);
const OPS = new Set(['set', 'merge', 'append', 'delete']);

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_MESSAGES_PER_DEAL = 500;
const MAX_KEYS_PER_COLLECTION = 5000;
const HEARTBEAT_MS = 30000;
const PERSIST_DEBOUNCE_MS = 2000;
const REDIS_CHANNEL = 'rt:mutations';
const ROOM_ID = 'global';

const INSTANCE_ID = crypto.randomBytes(8).toString('hex');

function emptyState() {
  return { deals: {}, campaigns: {}, messages: {}, applications: {}, notifications: {}, events: {} };
}

/**
 * Apply one mutation to the room state.
 * Returns the normalized mutation if it changed anything, else null.
 * Normalizing here (rather than trusting the client) is what keeps every
 * instance's state convergent — the same op always produces the same result.
 */
function applyMutation(state, { op, collection, key, value }) {
  if (!OPS.has(op) || !COLLECTIONS.has(collection)) return null;
  if (typeof key !== 'string' || !key || key.length > 200) return null;

  const bucket = state[collection] || (state[collection] = {});

  switch (op) {
    case 'set':
      if (!(key in bucket) && Object.keys(bucket).length >= MAX_KEYS_PER_COLLECTION) return null;
      bucket[key] = value;
      return { op, collection, key, value };

    case 'merge': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
      if (!(key in bucket) && Object.keys(bucket).length >= MAX_KEYS_PER_COLLECTION) return null;
      const current = bucket[key] && typeof bucket[key] === 'object' ? bucket[key] : {};
      bucket[key] = { ...current, ...value };
      return { op: 'set', collection, key, value: bucket[key] };
    }

    case 'append': {
      const arr = Array.isArray(bucket[key]) ? bucket[key] : [];
      // Idempotency: a client retrying after a dropped ack must not double-post.
      if (value && typeof value === 'object' && value.id != null) {
        if (arr.some((m) => m && m.id === value.id)) return null;
      }
      const next = [...arr, value];
      // Trim from the front so a long-running deal room stays bounded.
      bucket[key] = next.length > MAX_MESSAGES_PER_DEAL ? next.slice(-MAX_MESSAGES_PER_DEAL) : next;
      return { op: 'set', collection, key, value: bucket[key] };
    }

    case 'delete':
      if (!(key in bucket)) return null;
      delete bucket[key];
      return { op, collection, key };

    default:
      return null;
  }
}

function attachRealtime({ server, pgPool, redisClient, redisUrl }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

  let state = emptyState();
  let ready = false;
  let persistTimer = null;
  let dirty = false;

  // ---- Durability ------------------------------------------------------

  async function ensureTable() {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS shared_state (
        room_id    TEXT PRIMARY KEY,
        state      JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async function loadState() {
    const res = await pgPool.query('SELECT state FROM shared_state WHERE room_id = $1', [ROOM_ID]);
    if (res.rows.length && res.rows[0].state && typeof res.rows[0].state === 'object') {
      state = { ...emptyState(), ...res.rows[0].state };
    }
  }

  async function persistNow() {
    if (!dirty) return;
    dirty = false;
    try {
      await pgPool.query(
        `INSERT INTO shared_state (room_id, state, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (room_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
        [ROOM_ID, JSON.stringify(state)]
      );
    } catch (err) {
      dirty = true; // retry on the next tick rather than silently losing the write
      console.error('[realtime] persist failed:', err.message);
    }
  }

  // Chat is write-heavy; writing Postgres per keystroke would melt the pool.
  // Coalesce into one write every PERSIST_DEBOUNCE_MS.
  function schedulePersist() {
    dirty = true;
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  // ---- Fan-out ---------------------------------------------------------

  function localBroadcast(payload, exceptSocket) {
    const data = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client !== exceptSocket && client.readyState === 1) {
        client.send(data);
      }
    }
  }

  let publisher = null;
  async function setupRedisFanout() {
    if (!redisUrl) return;
    try {
      // A subscriber connection cannot issue normal commands, so it must be its own client.
      const subscriber = redisClient.duplicate();
      publisher = redisClient;
      await subscriber.connect();
      await subscriber.subscribe(REDIS_CHANNEL, (raw) => {
        try {
          const env = JSON.parse(raw);
          if (env.origin === INSTANCE_ID) return; // already applied locally
          const applied = applyMutation(state, env.mutation);
          if (applied) {
            schedulePersist();
            localBroadcast({ type: 'mutate', ...applied });
          }
        } catch { /* ignore malformed cross-instance frame */ }
      });
      console.log('[realtime] Redis fan-out active');
    } catch (err) {
      console.error('[realtime] Redis fan-out unavailable, running single-instance:', err.message);
    }
  }

  function publishMutation(mutation) {
    if (!publisher) return;
    publisher
      .publish(REDIS_CHANNEL, JSON.stringify({ origin: INSTANCE_ID, mutation }))
      .catch((err) => console.error('[realtime] publish failed:', err.message));
  }

  function broadcastPresence() {
    let online = 0;
    for (const c of wss.clients) if (c.readyState === 1) online++;
    localBroadcast({ type: 'presence', online });
  }

  // ---- Connection lifecycle -------------------------------------------

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    // Hand the newcomer the full room so its UI is correct on first paint.
    socket.send(JSON.stringify({ type: 'sync', state, ready }));
    broadcastPresence();

    socket.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          return;

        case 'sync':
          socket.send(JSON.stringify({ type: 'sync', state, ready }));
          return;

        case 'mutate': {
          const applied = applyMutation(state, msg);
          if (!applied) return;
          schedulePersist();
          // Echo to the sender too: the server's normalized value is authoritative,
          // so the optimistic local copy gets reconciled rather than drifting.
          localBroadcast({ type: 'mutate', ...applied });
          publishMutation(applied);
          return;
        }

        default:
          return;
      }
    });

    socket.on('close', broadcastPresence);
    socket.on('error', () => { try { socket.terminate(); } catch { /* already gone */ } });
  });

  // Render's proxy silently drops idle sockets; without this the server keeps
  // writing into half-open connections and never frees them.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) { socket.terminate(); continue; }
      socket.isAlive = false;
      try { socket.ping(); } catch { /* terminated mid-loop */ }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  // ---- HTTP upgrade ----------------------------------------------------

  server.on('upgrade', (req, socket, head) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  // ---- Boot ------------------------------------------------------------

  async function init() {
    try {
      await ensureTable();
      await loadState();
      ready = true;
      console.log('[realtime] state loaded, room ready');
    } catch (err) {
      // Serve from empty state rather than refusing connections — the UI degrades
      // to "no history yet" instead of failing to connect at all.
      console.error('[realtime] init failed, serving empty room:', err.message);
      ready = true;
    }
    await setupRedisFanout();
  }

  async function shutdown() {
    clearInterval(heartbeat);
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    await persistNow();
    for (const c of wss.clients) { try { c.close(1001, 'server shutting down'); } catch { /* noop */ } }
    wss.close();
  }

  return { init, shutdown, wss, stats: () => ({ clients: wss.clients.size, ready, instance: INSTANCE_ID }) };
}

module.exports = { attachRealtime, applyMutation, COLLECTIONS };
