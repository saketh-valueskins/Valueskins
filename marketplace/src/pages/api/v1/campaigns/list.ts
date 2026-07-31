/**
 * GET /api/v1/campaigns/list
 * List campaigns for authenticated creator
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCampaignsForCreator } from '@/lib/queries/campaign-queries';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { AuthenticationError, RateLimitError } from '@/lib/errors/handler';

interface SuccessResponse {
  success: true;
  campaigns: any[];
  count: number;
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

    // Get campaigns
    const campaigns = await getCampaignsForCreator(user_id);

    return res.status(200).json({
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    console.error('List campaigns error:', error);
    const { errorToResponse } = require('@/lib/errors/handler');
    const { statusCode, body } = errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
