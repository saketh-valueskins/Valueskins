import type { NextApiRequest, NextApiResponse } from 'next';
import { exchangeGoogleCode, getGoogleUserInfo } from '@/lib/oauth';
import { getSupabase } from '@/lib/supabase';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

interface GoogleUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔐 OAuth callback hit');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    console.log('❌ Google error:', error);
    return res.redirect(`/?error=${error}`);
  }

  if (!code || typeof code !== 'string') {
    console.log('❌ Missing code');
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    console.log('🔄 Exchanging code for tokens...');
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.access_token) {
      console.log('❌ No access token');
      return res.status(400).json({ error: 'token_failed' });
    }

    console.log('✅ Got tokens');
    const googleUser = (await getGoogleUserInfo(tokens.access_token)) as GoogleUser;
    console.log('✅ Got user:', googleUser.email);

    if (!googleUser.email) {
      console.log('❌ No email');
      return res.status(400).json({ error: 'no_email' });
    }

    // Use email as instagram_user_id for OAuth users
    const instagramUserId = googleUser.email;

    const supabase = getSupabase();

    let userId: number;
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('instagram_user_id', instagramUserId)
      .maybeSingle();

    if (existing) {
      userId = existing.id;
      console.log('✅ Found user:', userId);
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);
    } else {
      console.log('🆕 Creating new user for:', googleUser.email);
      const { data: created, error: createErr } = await supabase
        .from('users')
        .insert({
          instagram_user_id: instagramUserId,
          username: googleUser.email.split('@')[0],
          display_name: googleUser.name || googleUser.email,
          avatar_url: googleUser.picture || null,
          is_active: true,
          onboarding_stage: 'pending',
        })
        .select('id')
        .single();

      if (createErr || !created) {
        // Fallback without onboarding_stage
        const { data: created2, error: createErr2 } = await supabase
          .from('users')
          .insert({
            instagram_user_id: instagramUserId,
            username: googleUser.email.split('@')[0],
            display_name: googleUser.name || googleUser.email,
            avatar_url: googleUser.picture || null,
            is_active: true,
          })
          .select('id')
          .single();
        if (createErr2 || !created2) throw createErr2 || new Error('Failed to create user');
        userId = created2.id;
      } else {
        userId = created.id;
      }
      console.log('✅ Created user:', userId);
    }

    const sessionId = generateUUID();
    const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);

    console.log('🔐 Creating session:', sessionId);
    await supabase
      .from('auth_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      });

    const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    const cookieStr = `valueskins_session=${sessionId}; HttpOnly${isSecure ? '; Secure' : ''}; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
    res.setHeader('Set-Cookie', cookieStr);
    console.log('✅ Session cookie set');

    console.log('🚀 Redirecting to /');
    return res.redirect('/');
  } catch (error) {
    console.error('❌ OAuth error:', error);
    return res.status(500).json({
      error: 'auth_failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
