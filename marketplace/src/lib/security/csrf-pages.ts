import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes, timingSafeEqual } from 'crypto';
import { logger } from './logger';

const CSRF_TOKEN_EXPIRY = 60 * 60;

function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function createAndSetCsrfToken(res: NextApiResponse): string {
  const token = generateCsrfToken();

  res.setHeader('Set-Cookie', `csrf_token=${token}; Secure; SameSite=Strict; Path=/; Max-Age=${CSRF_TOKEN_EXPIRY}`);

  return token;
}

export function validateCsrfToken(req: NextApiRequest): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method || 'GET')) return true;

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'] as string | undefined;

  if (!cookieToken || !headerToken) return false;

  try {
    return timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
  } catch {
    return false;
  }
}

export function withCsrfProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (!safeMethods.includes(req.method || 'GET')) {
      if (!validateCsrfToken(req)) {
        logger.warn('CSRF validation failed', {
          method: req.method,
          path: req.url,
          ip: req.socket?.remoteAddress,
        });
        return res.status(403).json({ error: 'Invalid or missing CSRF token' });
      }
    }
    return handler(req, res);
  };
}
