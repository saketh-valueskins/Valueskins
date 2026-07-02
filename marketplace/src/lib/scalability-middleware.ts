import { NextApiRequest, NextApiResponse } from 'next';

// Request queue management for 10k concurrent users
const MAX_CONCURRENT_REQUESTS = 5000;
const REQUEST_QUEUE_TIMEOUT_MS = 30000;
const REQUEST_QUEUE = new Map<string, number>();

let activeRequests = 0;

export function withScalabilityMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = `${req.method}:${req.url}:${Date.now()}`;
    const startTime = Date.now();

    // Track concurrent requests
    activeRequests++;

    // Return 503 if queue is too deep (fail gracefully at scale)
    if (activeRequests > MAX_CONCURRENT_REQUESTS) {
      activeRequests--;
      return res.status(503).json({
        error: 'Service overloaded',
        message: 'Please try again in a few seconds',
        retryAfter: 5,
      });
    }

    // Cleanup old queue entries
    const now = Date.now();
    for (const [id, timestamp] of REQUEST_QUEUE) {
      if (now - timestamp > REQUEST_QUEUE_TIMEOUT_MS) {
        REQUEST_QUEUE.delete(id);
      }
    }

    REQUEST_QUEUE.set(requestId, startTime);

    // Add headers for client-side retry logic
    res.setHeader('X-RateLimit-Limit', MAX_CONCURRENT_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_CONCURRENT_REQUESTS - activeRequests).toString());

    try {
      await handler(req, res);
    } finally {
      activeRequests--;
      REQUEST_QUEUE.delete(requestId);

      // Log slow requests
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
      }
    }
  };
}

export function getScalabilityMetrics() {
  return {
    activeRequests,
    maxConcurrent: MAX_CONCURRENT_REQUESTS,
    utilizationPercent: Math.round((activeRequests / MAX_CONCURRENT_REQUESTS) * 100),
    queueSize: REQUEST_QUEUE.size,
  };
}
