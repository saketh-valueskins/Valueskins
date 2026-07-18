'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getGoogleAuthUrl } from '@/lib/oauth';
import { C } from '@/theme/colors';
import ValueSkinsLogo from '@/components/ValueSkinsLogo';

// Login Page — per ui-specs/login page.md.
// Light theme (off-white surface). Single brand moment: the centered hero
// wordmark IS the logo (no pill, no nav logo). Sub-headline removed.
// Sand appears ONLY on the tagline dots + hairlines (BRANDING §4).
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

export default function Login() {
  const [error, setError] = useState('');
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleGoogleAuth = async () => {
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setError('Failed to start login');
    }
  };

  return (
    // No-scroll construction (spec §3): min-height:100vh column, auth block
    // flex-grows and centers, footer-esque legal sits at the natural flow.
    // The global <Footer/> (rendered in _app.tsx) continues on this same
    // off-white surface below — no colour break, no black divider band (§4).
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
      }}
    >
      {/* Auth zone — grows to fill and optically centers the wordmark + button */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
          {/* Hero wordmark — ~40px, calm and centered (spec §2). Tagline shown. */}
          <div style={{ marginBottom: '32px' }}>
            <ValueSkinsLogo
              theme="light"
              size={40}
              style={{ fontSize: 'clamp(30px, 5vw, 40px)' } as React.CSSProperties}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                background: 'rgba(176,65,62,0.08)',
                color: C.error,
                borderRadius: '6px',
                fontSize: '0.8125rem',
                marginBottom: '16px',
                border: `1px solid rgba(176,65,62,0.35)`,
              }}
            >
              {error}
            </div>
          )}

          {/* Google button — quiet outlined, deep-sand hairline, 6px radius (spec §6) */}
          <button
            onClick={handleGoogleAuth}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => {
              setHover(false);
              setPressed(false);
            }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '16px',
              background: C.bg,
              color: C.text,
              border: `1px solid ${hover ? 'rgba(160,138,94,0.5)' : 'rgba(160,138,94,0.28)'}`,
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: FONT,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transform: pressed ? 'translateY(1px)' : 'translateY(0)',
              transition: 'border-color 0.15s ease, transform 0.1s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Sign-up line — 'Sign up' near-black weight 600, rest charcoal (spec §7) */}
          <p style={{ fontSize: '0.875rem', color: C.textSecondary, textAlign: 'center', marginTop: '22px' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" style={{ color: C.text, textDecoration: 'none', fontWeight: 600 }}>
              Sign up
            </Link>
          </p>

          <p
            style={{
              fontSize: '0.75rem',
              color: C.textSecondary,
              textAlign: 'center',
              marginTop: '16px',
              lineHeight: 1.5,
            }}
          >
            By continuing, you agree to our{' '}
            <Link href="/legal/terms" style={{ color: C.textSecondary, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" style={{ color: C.textSecondary, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Quiet sand hairline — the separation is the whitespace, the line just
          confirms the boundary (spec §4). The global Footer follows below on
          the same off-white surface. */}
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          width: '100%',
          padding: '0 48px',
        }}
      >
        <div style={{ borderTop: '1px solid rgba(160,138,94,0.22)' }} />
      </div>
    </div>
  );
}
