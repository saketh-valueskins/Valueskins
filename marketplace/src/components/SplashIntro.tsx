'use client';

import React, { useEffect, useState } from 'react';
import ValueSkinsLogo from '@/components/ValueSkinsLogo';

// Once-per-session brand intro: near-black screen, wordmark fades in,
// then the overlay fades out to reveal the site. Click to skip.

const SESSION_KEY = 'vs_splash_shown';
const LOGO_FADE_MS = 600;
const HOLD_MS = 900;
const EXIT_MS = 500;

export default function SplashIntro() {
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'exit'>('hidden');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      return; // storage blocked — skip the splash rather than replay forever
    }
    setPhase('enter');
    const exitTimer = setTimeout(() => setPhase('exit'), LOGO_FADE_MS + HOLD_MS);
    const doneTimer = setTimeout(() => setPhase('hidden'), LOGO_FADE_MS + HOLD_MS + EXIT_MS);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, []);

  if (!mounted || phase === 'hidden') return null;

  return (
    <div
      onClick={() => setPhase('hidden')}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: phase === 'exit' ? 0 : 1,
        transition: `opacity ${EXIT_MS}ms ease`,
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          animation: `vsSplashIn ${LOGO_FADE_MS}ms ease forwards`,
          opacity: 0,
        }}
      >
        <ValueSkinsLogo theme="dark" size={36} />
      </div>
      <style>{`
        @keyframes vsSplashIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes vsSplashIn { from { opacity: 1; transform: none; } to { opacity: 1; transform: none; } }
        }
      `}</style>
    </div>
  );
}
