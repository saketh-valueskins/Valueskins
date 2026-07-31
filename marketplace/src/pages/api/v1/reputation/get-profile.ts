/**
 * GET /api/v1/reputation/profile/:user_id
 * Get user reputation profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserReputationProfile } from '@/lib/queries/reputation-queries';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { AuthenticationError, RateLimitError, NotFoundError } from '@/lib/errors/handler';

interface SuccessResponse {
  success: true;
  profile: any;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  retryAfter?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  try {
    // Authenticate (optional - can view public profiles)
    let user_id: string | undefined;
    try {
      const authHeader = req.headers.authorization;
      const payload = await verifyAndGetUser(authHeader);
      user_id = payload.user_id;
    } catch (error) {
      // Continue without auth for public profiles
    }

    // Rate limit if authenticated
    if (user_id) {
      const rateLimitKey = getRateLimitKey(user_id);
      const rateLimitCheck = checkRateLimit(rateLimitKey, 'api:user');
      if (!rateLimitCheck.allowed) {
        throw new RateLimitError(rateLimitCheck.retryAfter || 60, 'Too many requests');
      }
    }

    // Get user ID from query
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new Error('User ID is required');
    }

    // Get profile
    const profile = await getUserReputationProfile(id);

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    const { errorToResponse } = require('@/lib/errors/handler');
    const { statusCode, body } = errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
