/**
 * POST /api/v1/deals/offer-submit
 * Creator submits offer to brand
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { handleSubmitOfferCommand } from '@/lib/commands/deal-commands';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'MISSING_AUTH' }, { status: 401 });
    }

    // TODO: Verify JWT token and extract user_id
    const user_id = 'user_id_from_token';

    const body = await request.json();
    const { deal_id, deliverables, price, currency, terms } = body;

    if (!deal_id || !deliverables || !price || !currency) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deal_id, deliverables, price, currency',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const offer_id = uuid();

    const result = await handleSubmitOfferCommand({
      deal_id,
      campaign_id: '', // TODO: Get from deal history
      submitted_by: 'creator',
      user_id,
      deliverables,
      price,
      currency,
      terms,
    });

    return NextResponse.json({
      success: true,
      offer_id: result.offer_id,
      message: 'Offer submitted successfully',
    });
  } catch (error: any) {
    console.error('Offer submission error:', error);
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
