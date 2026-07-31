/**
 * POST /api/v1/reputation/submit-review
 * Submit review for completed deal
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { handleSubmitReviewCommand } from '@/lib/commands/reputation-commands';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'MISSING_AUTH' }, { status: 401 });
    }

    // TODO: Verify JWT token and extract user_id and user role
    const user_id = 'user_id_from_token';
    const reviewer_type = 'brand'; // or 'creator'

    const body = await request.json();
    const { deal_id, reviewee_id, title, content } = body;

    if (!deal_id || !reviewee_id || !title || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deal_id, reviewee_id, title, content',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const review_id = uuid();

    const result = await handleSubmitReviewCommand({
      review_id,
      deal_id,
      reviewer_id: user_id,
      reviewee_id,
      reviewer_type: reviewer_type as 'brand' | 'creator',
      title,
      content,
      verified_deal: true, // TODO: Verify deal is completed
      user_id,
    });

    return NextResponse.json({
      success: true,
      review_id: result.review_id,
      message: 'Review submitted successfully',
    });
  } catch (error: any) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
