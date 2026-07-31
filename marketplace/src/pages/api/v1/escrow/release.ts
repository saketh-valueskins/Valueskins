/**
 * POST /api/v1/escrow/release
 * Release escrow funds to creator
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { handleReleaseEscrowCommand } from '@/lib/commands/escrow-commands';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { ValidationError, AuthenticationError, RateLimitError } from '@/lib/errors/handler';
import { validateRequest, ReleaseEscrowSchema } from '@/lib/validation/schemas';

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
    const body = validateRequest(ReleaseEscrowSchema, req.body);

    // Handle command
    await handleReleaseEscrowCommand({
      ...body,
      user_id,
    });

    return res.status(201).json({
      success: true,
      message: 'Escrow released successfully',
    });
  } catch (error) {
    console.error('Release escrow error:', error);
    const { errorToResponse } = require('@/lib/errors/handler');
    const { statusCode, body } = errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
