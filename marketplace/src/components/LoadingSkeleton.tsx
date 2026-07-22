import { C, withAlpha} from '@/theme/colors';

interface Props {
  count?: number;
  height?: number;
  style?: React.CSSProperties;
}

export default function LoadingSkeleton({ count = 3, height = 80, style }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: `${height}px`,
            background: `linear-gradient(90deg, ${withAlpha(C.border, 0x33)} 25%, ${withAlpha(C.border, 0x66)} 50%, ${withAlpha(C.border, 0x33)} 75%)`,
            backgroundSize: '200% 100%',
            borderRadius: '8px',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
