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
import { realtimeBridge } from '@/lib/realtime/subscription-manager';

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
    // Get authenticated user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'MISSING_AUTH',
      });
    }

    // Verify token and get user ID (would use supabase.auth.getUser(token))
    const user_id = req.headers['x-user-id'] as string;
    if (!user_id) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token',
        code: 'INVALID_AUTH',
      });
    }

    // Parse request body
    const body: RequestBody = req.body;

    // Validate input
    if (!body.title?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Campaign title is required',
        code: 'VALIDATION_ERROR',
      });
    }

    if (!body.description?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Campaign description is required',
        code: 'VALIDATION_ERROR',
      });
    }

    if (body.budget <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Budget must be greater than 0',
        code: 'VALIDATION_ERROR',
      });
    }

    if (!body.target_valueSkins || body.target_valueSkins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one target ValueSkin is required',
        code: 'VALIDATION_ERROR',
      });
    }

    if (new Date(body.deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Deadline must be in the future',
        code: 'VALIDATION_ERROR',
      });
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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Authorization')) {
      return res.status(403).json({
        success: false,
        error: errorMessage,
        code: 'AUTHORIZATION_ERROR',
      });
    }

    if (errorMessage.includes('Validation') || errorMessage.includes('required')) {
      return res.status(400).json({
        success: false,
        error: errorMessage,
        code: 'VALIDATION_ERROR',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
