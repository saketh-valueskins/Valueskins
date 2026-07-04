'use client';

import React from 'react';

// ValueSkins wordmark — spec per LOGO_HANDOFF.md.
// The word IS the logo: no icon, no symbol. Do not add one.
// Dark theme (default): off-white on near-black. Light: near-black on off-white.

const FONT_STACK = "'Inter', 'Helvetica Neue', Arial, sans-serif";

interface LogoProps {
  theme?: 'dark' | 'light';
  /** Wordmark font size in px. Tagline scales at 25%. */
  size?: number;
  /** Hide the tagline lockup — use for small placements (nav, footer). */
  hideTagline?: boolean;
  style?: React.CSSProperties;
}

export function ValueSkinsLogo({ theme = 'dark', size = 44, hideTagline = false, style }: LogoProps) {
  const isDark = theme === 'dark';
  const word = isDark ? '#F5F5F0' : '#0A0A0A';
  const tagWord = isDark ? '#B8B4AC' : '#2D2D2D';
  const dot = isDark ? '#C8B89A' : '#A08A5E';

  return (
    <div
      role="img"
      aria-label="ValueSkins"
      style={{ fontFamily: FONT_STACK, textAlign: 'center', lineHeight: 1, ...style }}
    >
      <div style={{ color: word, fontWeight: 700, fontSize: size, letterSpacing: '0.18em' }}>
        VALUESKINS
      </div>
      {!hideTagline && (
        <div style={{ marginTop: size * 0.32, color: tagWord, fontWeight: 500, fontSize: size * 0.25, letterSpacing: '0.34em' }}>
          TRUST <span style={{ color: dot }}>·</span> EARNED <span style={{ color: dot }}>·</span> SERIOUS
        </div>
      )}
    </div>
  );
}

export default ValueSkinsLogo;
