'use client';

import React from 'react';

// The quiet loading state.
//
// Replaces the full-viewport "Loading..." text screens, and the ones that put
// the VALUESKINS wordmark on a black field between screens. Both were loud for
// what they are: a wordmark is a brand moment, not a progress indicator, and
// showing it on every transition spends the mark until it means nothing.
//
// What is left is a single sand hairline that breathes. BRANDING §10.5:
// transform and opacity only, cubic-bezier(0.16,1,0.3,1), never bounce,
// accents may "breathe" quietly — "attention is earned through precision, not
// spectacle." Reduced motion collapses it to a static rule.
//
// No visible text, but the state is still announced: role="status" plus a
// visually-hidden label, so a screen reader is told the page is working.

export default function LoadingState({
  fullScreen = true,
  label = 'Loading',
}: {
  /** Full-viewport gate (default) vs an inline block inside an existing frame. */
  fullScreen?: boolean;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        // Consistent placement everywhere. It used to centre inside 100dvh when
        // full-screen and inside 160px when inline, so the same indicator sat
        // mid-viewport on most pages and near the top in Settings. It now sits
        // a fixed distance below the top of its container in both cases, which
        // is the Settings behaviour and the one that does not jump as the page
        // grows.
        minHeight: fullScreen ? '100dvh' : '160px',
        width: '100%',
        background: fullScreen ? 'var(--c-bg)' : 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '96px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'block',
          width: '56px',
          height: '1px',
          background: 'var(--c-accent)',
          transformOrigin: 'center',
          animation: 'vsBreathe 1600ms cubic-bezier(0.16,1,0.3,1) infinite',
        }}
      />
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes vsBreathe {
          0%, 100% { opacity: 0.28; transform: scaleX(0.6); }
          50%      { opacity: 1;    transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes vsBreathe {
            0%, 100% { opacity: 0.6; transform: none; }
          }
        }
      `}</style>
    </div>
  );
}
