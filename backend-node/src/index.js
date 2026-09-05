const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

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

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  await pgPool.end();
  await redisClient.quit();
  process.exit(0);
});
