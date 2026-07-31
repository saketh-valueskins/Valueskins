/**
 * POST /api/v1/campaigns/create
 * Production API endpoint following event-driven architecture
 *
 * Request flow:
 * 1. Validate & authorize (backend)
 * 2. Emit event (source of truth)
 * 3. Publish to realtime (subscribers notified)
 * 4. Return response
 *
 * No database writes - only events
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { handleCreateCampaignCommand, CreateCampaignCommand } from '@/lib/commands/campaign-commands';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { ValidationError, AuthenticationError, RateLimitError } from '@/lib/errors/handler';

interface RequestBody {
  title: string;
  description: string;
  target_valueSkins: ('Type1' | 'Type2' | 'Type3')[];
  budget: number;
  deadline: string;
  location?: string;
  requirements?: string;
}

interface SuccessResponse {
  success: true;
  campaign_id: string;
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
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  try {
    // Get user from token first to use user_id for rate limiting
    let user_id: string;
    try {
      const authHeader = req.headers.authorization;
      const payload = await verifyAndGetUser(authHeader);
      user_id = payload.user_id;
    } catch (error) {
      throw new AuthenticationError('Invalid or missing authentication token');
    }

    // Check rate limit by user
    const rateLimitKey = getRateLimitKey(user_id);
    const rateLimitCheck = checkRateLimit(rateLimitKey, 'api:user');
    if (!rateLimitCheck.allowed) {
      throw new RateLimitError(rateLimitCheck.retryAfter || 60, 'Too many requests');
    }

    // Parse request body
    const body: RequestBody = req.body;

    // Validate input
    if (!body.title?.trim()) {
      throw new ValidationError('Campaign title is required');
    }

    if (body.title.length > 200) {
      throw new ValidationError('Campaign title must be 200 characters or less');
    }

    if (!body.description?.trim()) {
      throw new ValidationError('Campaign description is required');
    }

    if (body.description.length > 2000) {
      throw new ValidationError('Campaign description must be 2000 characters or less');
    }

    if (typeof body.budget !== 'number' || body.budget <= 0) {
      throw new ValidationError('Budget must be a positive number');
    }

    if (!body.target_valueSkins || !Array.isArray(body.target_valueSkins) || body.target_valueSkins.length === 0) {
      throw new ValidationError('At least one target ValueSkin is required');
    }

    const validSkins = ['Type1', 'Type2', 'Type3'];
    if (!body.target_valueSkins.every((skin) => validSkins.includes(skin))) {
      throw new ValidationError('Invalid ValueSkin type');
    }

    const deadline = new Date(body.deadline);
    if (isNaN(deadline.getTime()) || deadline <= new Date()) {
      throw new ValidationError('Deadline must be a valid future date');
    }

    // Create command
    const command: CreateCampaignCommand = {
      brand_id: user_id,
      user_id,
      title: body.title,
      description: body.description,
      target_valueSkins: body.target_valueSkins,
      budget: body.budget,
      deadline: body.deadline,
      location: body.location,
      requirements: body.requirements,
    };

    // Handle command (emits event)
    const result = await handleCreateCampaignCommand(command);

    // Publish to realtime subscribers
    // (Subscribers have already been notified via event dispatcher)
    // This is just confirmation to client

    return res.status(201).json({
      success: true,
      campaign_id: result.campaign_id,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Campaign creation error:', error);

    const { statusCode, body } = require('@/lib/errors/handler').errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
