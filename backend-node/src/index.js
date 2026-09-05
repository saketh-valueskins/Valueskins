const express = require('express');
const http = require('http');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { attachRealtime } = require('./realtime');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});
app.use(limiter);

// PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.connect().catch(console.error);

// Health check
app.get('/health/live', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'valueskins-api'
  });
});

// Readiness check
app.get('/health/ready', async (req, res) => {
  try {
    const dbResult = await pgPool.query('SELECT NOW()');
    const redisResult = await redisClient.ping();

    res.json({
      status: 'ready',
      database: dbResult.rows[0] ? 'connected' : 'error',
      redis: redisResult === 'PONG' ? 'connected' : 'error'
    });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});

// Admin: Cleanup all data (reset to fresh state)
app.post('/admin/cleanup', async (req, res) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('🗑️  Starting database cleanup...');

    // Truncate all tables
    await pgPool.query(`
      TRUNCATE TABLE IF EXISTS messages CASCADE;
      TRUNCATE TABLE IF EXISTS deal_messages CASCADE;
      TRUNCATE TABLE IF EXISTS deal_applications CASCADE;
      TRUNCATE TABLE IF EXISTS deals CASCADE;
      TRUNCATE TABLE IF EXISTS creator_profiles CASCADE;
      TRUNCATE TABLE IF EXISTS brand_profiles CASCADE;
      TRUNCATE TABLE IF EXISTS users CASCADE;
      TRUNCATE TABLE IF EXISTS audit_logs CASCADE;
      TRUNCATE TABLE IF EXISTS activity_logs CASCADE;
    `);

    // Reset all sequences
    await pgPool.query(`
      ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS creators_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS brands_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS deals_id_seq RESTART WITH 1;
      ALTER SEQUENCE IF EXISTS messages_id_seq RESTART WITH 1;
    `);

    // Clear Redis cache
    await redisClient.flushDb();

    // Verify cleanup
    const userCount = await pgPool.query('SELECT COUNT(*) FROM users');
    const dealCount = await pgPool.query('SELECT COUNT(*) FROM deals');
    const creatorCount = await pgPool.query('SELECT COUNT(*) FROM creator_profiles');
    const brandCount = await pgPool.query('SELECT COUNT(*) FROM brand_profiles');

    res.json({
      status: 'cleanup_complete',
      cleared: {
        users: parseInt(userCount.rows[0].count),
        deals: parseInt(dealCount.rows[0].count),
        creators: parseInt(creatorCount.rows[0].count),
        brands: parseInt(brandCount.rows[0].count),
        redis: 'flushed'
      },
      timestamp: new Date().toISOString()
    });

    console.log('✅ Database cleanup complete - all tables truncated, sequences reset');
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/deals - List deals with pagination
app.get('/api/v1/deals', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const cacheKey = `deals:page:${page}:limit:${limit}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await pgPool.query(
      'SELECT * FROM deals LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await pgPool.query('SELECT COUNT(*) FROM deals');
    const total = parseInt(countResult.rows[0].count);

    const response = {
      data: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };

    await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/deals/:id - Get specific deal
app.get('/api/v1/deals/:id', async (req, res) => {
  try {
    const cacheKey = `deal:${req.params.id}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await pgPool.query('SELECT * FROM deals WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = result.rows[0];
    await redisClient.setEx(cacheKey, 300, JSON.stringify(deal));
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/deals - Create deal
app.post('/api/v1/deals', async (req, res) => {
  try {
    const { title, description, budget, creator_id } = req.body;

    if (!title || !creator_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pgPool.query(
      'INSERT INTO deals (title, description, budget, creator_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [title, description, budget, creator_id]
    );

    await redisClient.del('deals:*');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/creators - List creators
app.get('/api/v1/creators', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM creators LIMIT 100');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HTTP server (explicit, so the realtime layer can claim the /ws upgrade).
// Declared before the 404 handler so /health/realtime is reachable.
const server = http.createServer(app);

const realtime = attachRealtime({
  server,
  pgPool,
  redisClient,
  redisUrl: process.env.REDIS_URL,
});

app.get('/health/realtime', (req, res) => res.json(realtime.stats()));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
  console.log(`✅ WebSocket listening on /ws`);
  realtime.init();
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, draining...`);

  // Flush room state before the pool closes, or the last messages are lost.
  try { await realtime.shutdown(); } catch (err) { console.error('realtime shutdown:', err.message); }

  server.close(async () => {
    try { await pgPool.end(); } catch { /* already closed */ }
    try { await redisClient.quit(); } catch { /* already closed */ }
    process.exit(0);
  });

  // Render SIGKILLs at 30s; don't hang on a stuck socket.
  setTimeout(() => process.exit(0), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
