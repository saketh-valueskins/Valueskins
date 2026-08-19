/**
 * POST /api/v1/deals/accept-offer
 * Accept an offer and generate contract
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import { handleAcceptOfferCommand } from '@/lib/commands/deal-commands';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { ValidationError, AuthenticationError, RateLimitError } from '@/lib/errors/handler';
import { validateRequest } from '@/lib/validation/schemas';
import { z } from 'zod';

const AcceptOfferRequestSchema = z.object({
  deal_id: z.string().uuid('Invalid deal ID'),
  offer_id: z.string().uuid('Invalid offer ID'),
});

type RequestBody = z.infer<typeof AcceptOfferRequestSchema>;

interface SuccessResponse {
  success: true;
  contract_id: string;
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
    const body = validateRequest(AcceptOfferRequestSchema, req.body);

    // Handle command
    const result = await handleAcceptOfferCommand({
      deal_id: body.deal_id,
      offer_id: body.offer_id,
      accepted_by: 'brand', // TODO: Determine from user role
      user_id,
    });

    return res.status(201).json({
      success: true,
      contract_id: result.contract_id,
      message: 'Offer accepted successfully',
    });
  } catch (error) {
    console.error('Accept offer error:', error);
    const { errorToResponse } = require('@/lib/errors/handler');
    const { statusCode, body } = errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
