/**
 * GET /api/v1/deals/:id
 * Get deal with full negotiation history
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDealWithHistory } from '@/lib/queries/deal-queries';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { AuthenticationError, RateLimitError, NotFoundError } from '@/lib/errors/handler';

interface SuccessResponse {
  success: true;
  deal: any;
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
    // Authenticate
    let user_id: string;
    try {
      const authHeader = req.headers.authorization;
      const payload = await verifyAndGetUser(authHeader);
      user_id = payload.user_id;
    } catch (error) {
      throw new AuthenticationError('Invalid or missing authentication token');
    }

    // Rate limit
    const rateLimitKey = getRateLimitKey(user_id);
    const rateLimitCheck = checkRateLimit(rateLimitKey, 'api:user');
    if (!rateLimitCheck.allowed) {
      throw new RateLimitError(rateLimitCheck.retryAfter || 60, 'Too many requests');
    }

    // Get deal ID from query
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw new Error('Deal ID is required');
    }

    // Get deal
    const deal = await getDealWithHistory(id);

    return res.status(200).json({
      success: true,
      deal,
    });
  } catch (error) {
    console.error('Get deal error:', error);
    const { errorToResponse } = require('@/lib/errors/handler');
    const { statusCode, body } = errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
