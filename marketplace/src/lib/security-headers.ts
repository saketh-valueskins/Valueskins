import { NextApiRequest, NextApiResponse } from 'next';

export function applySecurityHeaders(res: NextApiResponse) {
  // HSTS: Force HTTPS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // CSP: Restrict content loading (prevent XSS)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  );

  // X-Frame-Options: Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection: Legacy XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: Don't leak referer to external sites
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: Restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // Remove server fingerprint
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
}

export function withSecurityHeaders(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    applySecurityHeaders(res);
    return handler(req, res);
  };
}
