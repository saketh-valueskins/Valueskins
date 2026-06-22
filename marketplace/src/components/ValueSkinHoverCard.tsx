'use client';
import { useState, useEffect, useRef } from 'react';
import CreatorLevelBadge from './CreatorLevelBadge';
import { getLevel, getLevelInfo } from '@/lib/levels';

export interface EventStats {
  eventsHosted: number;
  totalAttendees: number;
  avgRating: number;
  totalEventReviews: number;
  brandAttendees: { displayName: string; avatarUrl: string | null }[];
}

interface HoverCardData {
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  niche?: string;
  location?: string;
  dealsCompleted: number;
  valueSkin?: string;
  rate?: number;
  workedWith?: boolean;
  topReview?: {
    brandName: string;
    text: string;
  };
}

interface Props {
  data: HoverCardData;
  style?: React.CSSProperties;
  onViewFullProfile?: () => void;
}

const statsCache = new Map<string, EventStats>();

const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textSecondary: '#cbd5e1',
  primary: '#38bdf8',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#334155',
};

const skeleton = (w: string) => (
  <div style={{ height: '12px', width: w, background: C.surfaceAlt, borderRadius: '4px', animation: 'none' }} />
);

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push('full');
  if (half) stars.push('half');
  while (stars.length < 5) stars.push('empty');
  return (
    <span style={{ color: '#f59e0b', fontSize: '11px', letterSpacing: '1px' }}>
      {stars.map((s, i) => {
        if (s === 'full') return <span key={i}>*</span>;
        if (s === 'half') return <span key={i}>*</span>;
        return <span key={i} style={{ opacity: 0.3 }}>*</span>;
      })}
    </span>
  );
}

export default function ValueSkinHoverCard({ data, style, onViewFullProfile }: Props) {
  const level = getLevel(data.dealsCompleted);
  const levelInfo = getLevelInfo(level);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const username = data.username?.replace('@', '');
    if (!username || fetchedRef.current === username) return;
    fetchedRef.current = username;

    const cached = statsCache.get(username);
    if (cached) {
      setEventStats(cached);
      return;
    }

    setStatsLoading(true);
    setStatsError(false);
    fetch(`/api/creators/event-stats?username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(stats => {
        if (stats.error) { setStatsError(true); return; }
        statsCache.set(username, stats as EventStats);
        setEventStats(stats as EventStats);
      })
      .catch(() => setStatsError(true))
      .finally(() => setStatsLoading(false));
  }, [data.username]);

  const avatarEl = data.avatarUrl ? (
    <img
      src={data.avatarUrl}
      alt={data.displayName}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  ) : (
    <span style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>
      {data.displayName?.charAt(0)?.toUpperCase() || '?'}
    </span>
  );

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 100,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '14px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.1)',
        width: '340px',
        overflow: 'hidden',
        pointerEvents: 'auto',
        ...style,
      }}
    >
      {/* Top gradient strip */}
      <div style={{
        height: '4px',
        background: `linear-gradient(90deg, ${levelInfo.color}, ${C.primary})`,
      }} />

      <div style={{ padding: '16px' }}>
        {/* Avatar + Name + Level row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: `${levelInfo.color}20`,
            border: `2px solid ${levelInfo.color}50`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {avatarEl}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.displayName}
            </div>
            <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>
              @{data.username}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreatorLevelBadge dealsCompleted={data.dealsCompleted} size="sm" />
              <span style={{ fontSize: '11px', color: C.textMuted }}>
                {data.dealsCompleted} deal{data.dealsCompleted !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Niche + Location pill */}
        {(data.niche || data.location) && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {data.niche && (
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                background: `${C.primary}15`,
                color: C.primary,
                fontSize: '11px',
                fontWeight: 600,
                border: `1px solid ${C.primary}30`,
              }}>
                {data.niche}
              </span>
            )}
            {data.location && (
              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                background: C.bg,
                color: C.textMuted,
                fontSize: '11px',
              }}>
                {data.location}
              </span>
            )}
          </div>
        )}

        {/* Rate card */}
        {data.rate && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px', padding: '8px 12px', background: C.bg, borderRadius: '8px',
          }}>
            <span style={{ fontSize: '12px', color: C.textMuted }}>Starting rate</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: C.primary }}>₹{data.rate.toLocaleString()}</span>
          </div>
        )}

        {/* Worked with badge */}
        {data.workedWith && (
          <div style={{
            marginBottom: '12px', padding: '8px 12px', background: `${C.success}15`,
            borderRadius: '8px', fontSize: '12px', color: C.success, fontWeight: 600,
            border: `1px solid ${C.success}30`,
          }}>
             Worked together before
          </div>
        )}

        {/* Bio */}
        {data.bio && (
          <div style={{
            fontSize: '12px',
            color: C.textSecondary,
            lineHeight: '1.5',
            marginBottom: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {data.bio}
          </div>
        )}

        {/* Event Track Record */}
        {statsLoading && (
          <div style={{ marginBottom: '12px', padding: '10px 12px', background: C.bg, borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
              {skeleton('60px')}
              {skeleton('60px')}
              {skeleton('60px')}
            </div>
          </div>
        )}
        {!statsLoading && eventStats && eventStats.eventsHosted > 0 && (
          <div style={{
            marginBottom: '12px', padding: '10px 12px', background: C.bg, borderRadius: '8px',
          }}>
            <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>
              Event Track Record
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}></span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{eventStats.eventsHosted}</span>
                <span style={{ fontSize: '10px', color: C.textMuted }}>hosted</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px' }}></span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{eventStats.totalAttendees.toLocaleString()}</span>
                <span style={{ fontSize: '10px', color: C.textMuted }}>attendees</span>
              </div>
              {eventStats.avgRating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <StarRating rating={eventStats.avgRating} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: C.warning }}>{eventStats.avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Brand Attendees badges */}
        {!statsLoading && eventStats && eventStats.brandAttendees.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', marginBottom: '6px',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <span>Attended by executives from</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {eventStats.brandAttendees.slice(0, 5).map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', borderRadius: '12px',
                    background: `${C.primary}12`,
                    border: `1px solid ${C.primary}25`,
                  }}
                >
                  {b.avatarUrl ? (
                    <img src={b.avatarUrl} alt="" style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff' }}>
                      {b.displayName.charAt(0)}
                    </div>
                  )}
                  <span style={{ fontSize: '10px', color: C.primary, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {b.displayName}
                  </span>
                </div>
              ))}
              {eventStats.brandAttendees.length > 5 && (
                <span style={{ fontSize: '10px', color: C.textMuted, alignSelf: 'center' }}>
                  +{eventStats.brandAttendees.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Top review */}
        {data.topReview && (
          <div style={{
            background: C.bg,
            borderRadius: '8px',
            padding: '10px 12px',
            border: `1px solid ${C.border}`,
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', marginBottom: '4px' }}>
              Brand Review
            </div>
            <div style={{ fontSize: '12px', color: C.textSecondary, lineHeight: '1.5', fontStyle: 'italic' }}>
              "{(data.topReview.text || '').replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').substring(0, 120)}{(data.topReview.text || '').length > 120 ? '...' : ''}"
            </div>
            <div style={{ fontSize: '11px', color: C.primary, fontWeight: 600, marginTop: '4px' }}>
              — {data.topReview.brandName}
            </div>
          </div>
        )}

        {/* View Profile link */}
        {onViewFullProfile && (
          <button
            onClick={onViewFullProfile}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              color: C.primary,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C.primary}10`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            View Full Profile
          </button>
        )}
      </div>
    </div>
  );
}
