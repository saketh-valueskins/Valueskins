/**
 * POST /api/v1/escrow/fund
 * Fund escrow with payment
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { handleFundEscrowCommand } from '@/lib/commands/escrow-commands';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { ValidationError, AuthenticationError, RateLimitError } from '@/lib/errors/handler';
import { validateRequest, FundEscrowSchema } from '@/lib/validation/schemas';

interface SuccessResponse {
  success: true;
  message: string;
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
  if (req.method !== 'POST') {
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

    // Validate request
    const body = validateRequest(FundEscrowSchema, req.body);

    // Handle command
    await handleFundEscrowCommand({
      ...body,
      user_id,
    });

    return res.status(201).json({
      success: true,
      message: 'Escrow funded successfully',
    });
  } catch (error) {
    console.error('Fund escrow error:', error);
    const { errorToResponse } = require('@/lib/errors/handler');
    const { statusCode, body } = errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
