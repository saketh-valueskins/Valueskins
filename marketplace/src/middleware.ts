import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // CSP - Content Security Policy (prevent XSS, clickjacking, etc.)
  response.headers.set(
    'Content-Security-Policy',
    // font-src / style-src carry the Google Fonts origins because the brand
    // typeface is loaded from there (_document links fonts.googleapis.com,
    // which serves woff2 from fonts.gstatic.com). Without them the CSP blocked
    // every Inter file and the whole product silently fell back to Helvetica —
    // _global-conventions.md G2 makes Inter the only typeface in the product,
    // so this was breaking brand typography on every page. Both origins are
    // Google-operated and serve static font assets only.
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://accounts.google.com https://api.razorpay.com wss://valueskins-api.render.com; frame-src https://accounts.google.com https://api.razorpay.com"
  );

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
