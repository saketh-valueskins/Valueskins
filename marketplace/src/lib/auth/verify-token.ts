/**
 * JWT Token Verification
 * Verify and extract user info from JWT tokens
 */

import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-key-change-in-production'
);

export interface TokenPayload {
  user_id: string;
  email: string;
  user_type: 'brand' | 'creator';
  iat: number;
  exp: number;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  return parts[1];
}

export async function verifyAndGetUser(authHeader?: string): Promise<TokenPayload> {
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    throw new Error('Missing authorization header');
  }
  return verifyToken(token);
}
