'use client';

import { useEffect, useState } from 'react';
import { ValueSkinSprite } from '@/features/profiles/ProfileView';

// The faint, slowly drifting ValueSkin identities from the login screen
// (login page.md §0b.2), lifted into a component so other full-bleed brand
// moments can carry the same texture.
//
// This deliberately duplicates the ~20 lines that live inline in
// pages/auth/login.tsx rather than refactoring that page to import it. The
// login screen is signed off as-is and is not worth the regression risk for
// a few lines of shared markup — if a third caller appears, collapse them then.
//
// Motion is transform-only and honours prefers-reduced-motion (BRANDING §10.5).

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const DRIFTERS = [
  { left: '8%',  top: '18%', size: 96,  dur: 17, delay: 0 },
  { left: '82%', top: '24%', size: 74,  dur: 21, delay: 2.5 },
  { left: '16%', top: '68%', size: 68,  dur: 19, delay: 1.2 },
  { left: '74%', top: '72%', size: 104, dur: 23, delay: 3.4 },
  { left: '86%', top: '52%', size: 58,  dur: 25, delay: 4.1 },
];

export default function DriftingSkins({ opacity = 0.09 }: { opacity?: number }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity, overflow: 'hidden' }}
    >
      {DRIFTERS.map((d, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: d.left,
            top: d.top,
            animation: reduced ? 'none' : `vsSkinDrift ${d.dur}s ${EASE} ${d.delay}s infinite`,
          }}
        >
          <ValueSkinSprite size={d.size} mono="var(--c-skin-drift)" />
        </span>
      ))}
      <style>{`
        @keyframes vsSkinDrift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50%      { transform: translate3d(0, -22px, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes vsSkinDrift { 0%, 100% { transform: none; } }
        }
      `}</style>
    </div>
  );
}
