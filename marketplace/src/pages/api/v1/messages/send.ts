/**
 * POST /api/v1/messages/send
 * Send message in deal conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { handleSendMessageCommand } from '@/lib/commands/messaging-commands';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'MISSING_AUTH' }, { status: 401 });
    }

    // TODO: Verify JWT token and extract user_id
    const user_id = 'user_id_from_token';

    const body = await request.json();
    const { conversation_id, deal_id, recipient_id, content, message_type, file_urls } = body;

    if (!conversation_id || !deal_id || !recipient_id || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: conversation_id, deal_id, recipient_id, content',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const message_id = uuid();

    const result = await handleSendMessageCommand({
      message_id,
      conversation_id,
      deal_id,
      sender_id: user_id,
      recipient_id,
      content,
      message_type: message_type || 'text',
      file_urls: file_urls || [],
      user_id,
    });

    return NextResponse.json({
      success: true,
      message_id: result.message_id,
      sent_at: result.sent_at,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Message send error:', error);
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
