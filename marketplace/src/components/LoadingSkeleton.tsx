import { C, withAlpha } from '@/theme/colors';

interface Props {
  count?: number;
  height?: number;
  style?: React.CSSProperties;
}

// The sweep used to animate `background-position`, which BRANDING §10.5 rules
// out — "animate only transform and opacity (hardware-accelerated)". Moving a
// background origin is neither, and repaints the whole block every frame.
//
// It is now an absolutely-positioned sheen that translateX-es across a clipped
// block: same look, composited, no repaint. The global prefers-reduced-motion
// net in globals.css collapses it to its resting state.
export default function LoadingSkeleton({ count = 3, height = 80, style }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: 'relative',
            overflow: 'hidden',
            height: `${height}px`,
            background: withAlpha(C.border, 0x33),
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, transparent 0%, ${withAlpha(C.border, 0x66)} 50%, transparent 100%)`,
              animation: 'vsSheen 1.5s cubic-bezier(0.16,1,0.3,1) infinite',
              willChange: 'transform',
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes vsSheen {
          0%   { transform: translate3d(-100%, 0, 0); }
          100% { transform: translate3d(100%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes vsSheen { 0%, 100% { transform: none; opacity: 0.5; } }
        }
      `}</style>
    </div>
  );
}
