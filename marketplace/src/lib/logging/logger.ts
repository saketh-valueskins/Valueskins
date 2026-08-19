/**
 * Structured Logging
 * JSON-formatted logs with no PII
 */

interface LogContext {
  user_id?: string; // Hashed
  request_id?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  [key: string]: any;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private format(level: string, message: string, context?: LogContext) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      environment: process.env.NODE_ENV,
    });
  }

  error(message: string, error?: Error, context?: LogContext) {
    const log = this.format('error', message, {
      ...context,
      error_name: error?.name,
      error_message: error?.message,
      stack_trace: this.isDev ? error?.stack : undefined,
    });
    console.error(log);

    // TODO: Send to Sentry
    // if (!this.isDev) {
    //   Sentry.captureException(error, { extra: context });
    // }
  }

  warn(message: string, context?: LogContext) {
    const log = this.format('warn', message, context);
    console.warn(log);
  }

  info(message: string, context?: LogContext) {
    const log = this.format('info', message, context);
    console.log(log);
  }

  debug(message: string, context?: LogContext) {
    if (this.isDev) {
      const log = this.format('debug', message, context);
      console.log(log);
    }
  }

  logRequest(method: string, path: string, statusCode: number, durationMs: number, userId?: string) {
    this.info('HTTP request', {
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
      user_id: userId ? this.hashUserId(userId) : undefined,
    });
  }

  logDatabaseQuery(query: string, durationMs: number) {
    if (this.isDev) {
      this.debug('Database query', {
        query: query.substring(0, 100), // Truncate long queries
        duration_ms: durationMs,
      });
    }
  }

  private hashUserId(userId: string): string {
    // Simple hash for logging (not cryptographic)
    return userId.substring(0, 4) + '...';
  }
}

export const logger = new Logger();

// Express middleware
export function loggingMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    logger.logRequest(
      req.method,
      req.url,
      res.statusCode,
      duration,
      req.headers['x-user-id'] as string | undefined
    );
    originalSend.call(this, data);
  };

  next();
}
