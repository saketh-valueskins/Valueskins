/**
 * POST /api/v1/campaigns/create
 * Create campaign and write to Supabase (realtime sync across devices)
 *
 * Request flow:
 * 1. Validate & authorize (backend)
 * 2. Insert into Supabase PostgreSQL
 * 3. Supabase realtime automatically notifies all subscribed clients
 * 4. Return response
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyAndGetUser } from '@/lib/auth/verify-token';
import { checkRateLimit, getRateLimitKey } from '@/middleware/rate-limit';
import { ValidationError, AuthenticationError, RateLimitError } from '@/lib/errors/handler';

// Initialize Supabase client (server-side with service key for admin access)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    // Insert into Supabase (realtime will automatically notify all subscribed clients)
    const { data, error } = await supabase
      .from('campaigns')
      .insert([
        {
          brand_id: user_id,
          title: body.title,
          description: body.description,
          target_valueSkins: body.target_valueSkins,
          budget: body.budget,
          deadline: body.deadline,
          location: body.location,
          requirements: body.requirements,
          status: 'open',
        },
      ])
      .select();

    if (error) {
      throw new ValidationError(`Failed to create campaign: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new ValidationError('Campaign creation returned no data');
    }

    return res.status(201).json({
      success: true,
      campaign_id: data[0].id,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Campaign creation error:', error);

    const { statusCode, body } = require('@/lib/errors/handler').errorToResponse(error);
    return res.status(statusCode).json(body);
  }
}
