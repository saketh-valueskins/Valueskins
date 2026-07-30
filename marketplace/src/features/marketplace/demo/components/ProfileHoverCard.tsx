'use client';

import React from 'react';
import { PROFESSION_BADGES, BRAND_CATEGORY_BADGES, defaultAboutMe } from '@/features/valueskins/core/identity/AvatarOptions';
import { getLevel, getLevelInfo, getProgressToNext } from '@/lib/levels';
import { STICKER_MANIFEST } from '@/features/valueskins/core/stickers/sticker-manifest';

function getStickerForProfession(profession: string): string | undefined {
  return PROFESSION_BADGES[profession]?.stickerImage || BRAND_CATEGORY_BADGES[profession]?.stickerImage || STICKER_MANIFEST[profession];
}

type HoverProfile = {
  role: 'brand' | 'creator';
  name: string;
  skin?: string;
  bio?: string;
  avatarUrl?: string;
  // Brand fields
  brandProfileSelections?: Record<string, string>;
  brandValueSkins?: string[];
  // Creator fields
  aboutMe?: string;
  metrics?: {
    followers: number;
    engagement: number;
    dealsCompleted: number;
    avgDealValue: number;
    onTimeRate: number;
    brandRating: number;
  };
  rateCard?: { reel?: string; story?: string; post?: string; podcast?: string; live?: string };
  completedDeals?: number;
  portfolioImage?: string | null;
  availableFrom?: string;
  selectedCountry?: string;
};

const C = {
  primary: '#0A0A0A',
  bg: '#ffffff',
  surface: '#F5F5F0',
  surfaceAlt: '#f1f5f9',
  card: '#ffffff',
  text: '#0A0A0A',
  textSecondary: '#475569',
  textMuted: '#B8B4AC',
  border: '#E0E0DA',
  success: '#22c55e',
};

function HoverCard({ profile, x, y }: { profile: HoverProfile; x: number; y: number }) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [adjustedX, setAdjustedX] = React.useState(x);
  const [adjustedY, setAdjustedY] = React.useState(y);

  React.useEffect(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 16;
      const maxY = window.innerHeight - rect.height - 16;
      setAdjustedX(Math.min(x, maxX));
      setAdjustedY(Math.min(y, maxY));
    }
  }, [x, y]);

  const skinBadge = profile.skin ? (profile.role === 'brand' ? (BRAND_CATEGORY_BADGES[profile.skin] ?? PROFESSION_BADGES[profile.skin]) : PROFESSION_BADGES[profile.skin]) : undefined;
  const isDefaultAbout = profile.aboutMe && defaultAboutMe(profile.skin || '') === profile.aboutMe;
  const level = profile.role === 'creator'
    ? getLevel(profile.metrics?.dealsCompleted ?? 0)
    : undefined;
  const levelInfo = level ? getLevelInfo(level) : undefined;
  const progress = profile.role === 'creator'
    ? getProgressToNext(profile.metrics?.dealsCompleted ?? 0)
    : null;

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        zIndex: 99999,
        width: '320px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #E0E0DA',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        pointerEvents: 'auto',
        fontSize: '13px',
        color: '#0A0A0A',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        background: 'linear-gradient(135deg, #0A0A0A, #2D2D2D)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Avatar */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 800, color: '#fff',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>{profile.name}</div>
          <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
            {profile.role === 'brand' ? 'Brand' : 'Creator'}
            {profile.selectedCountry && ` · ${profile.selectedCountry}`}
          </div>
        </div>
        {profile.role === 'creator' && profile.skin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px', padding: '4px 10px',
            fontSize: '11px', fontWeight: 600,
          }}>
            <span>{skinBadge?.abbreviation ?? profile.skin.slice(0, 3).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', maxHeight: '400px', overflowY: 'auto' }}>
        {/* Level (creator) */}
        {level && levelInfo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '10px',
            padding: '8px 10px',
            background: '#F5F5F0',
            borderRadius: '8px',
            border: '1px solid #E0E0DA',
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: levelInfo.color, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '12px', fontWeight: 800, flexShrink: 0,
            }}>
              {level}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0A0A0A' }}>
                Level {level} · {levelInfo.label}
              </div>
              {progress && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{
                    height: '3px', borderRadius: '2px',
                    background: '#E0E0DA', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progress.progress * 100}%`, height: '100%',
                      background: levelInfo.color, borderRadius: '2px',
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#B8B4AC', marginTop: '2px' }}>
                    {progress.current}/{progress.needed} to next level
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skin / Profession badge — only show for creators */}
        {profile.role === 'creator' && profile.skin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '10px',
            padding: '8px 10px',
            background: `${skinBadge?.color ?? '#0A0A0A'}10`,
            borderRadius: '8px',
            border: `1px solid ${skinBadge?.color ?? '#0A0A0A'}30`,
          }}>
            {getStickerForProfession(profile.skin) ? (
              <img src={getStickerForProfession(profile.skin)!} alt={profile.skin}
                style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} />
            ) : (
              <div style={{
                width: '32px', height: '32px', borderRadius: '6px',
                background: `${skinBadge?.color ?? '#0A0A0A'}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: skinBadge?.color ?? '#0A0A0A',
              }}>
                {skinBadge?.abbreviation ?? profile.skin.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0A' }}>
                {profile.skin}
              </div>
            </div>
          </div>
        )}

        {/* Brand Profile Info */}
        {profile.role === 'brand' && profile.brandProfileSelections && (
          <div style={{ marginBottom: '10px' }}>
            {Object.entries(profile.brandProfileSelections).map(([key, val]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '4px 0', fontSize: '12px',
                borderBottom: '1px solid #f1f5f0',
              }}>
                <span style={{ color: '#B8B4AC' }}>{key}</span>
                <span style={{ fontWeight: 600, color: '#0A0A0A' }}>{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Creator About Me — only show if user actually wrote something */}
        {profile.role === 'creator' && profile.aboutMe && !isDefaultAbout && (
          <div style={{
            marginBottom: '10px',
            padding: '8px 10px',
            background: '#F5F5F0',
            borderRadius: '8px',
            border: '1px solid #E0E0DA',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#B8B4AC', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              About
            </div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              {profile.aboutMe}
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div style={{
            marginBottom: '10px',
            padding: '8px 10px',
            background: '#F5F5F0',
            borderRadius: '8px',
            border: '1px solid #E0E0DA',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#B8B4AC', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Bio
            </div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              {profile.bio}
            </div>
          </div>
        )}

        {/* Metrics grid — different for brands vs creators */}
        {profile.metrics && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
            marginBottom: '10px',
          }}>
            {(profile.role === 'brand' ? [
              { label: 'Deals', value: profile.metrics.dealsCompleted, color: '#0A0A0A' },
              { label: 'Avg Deal', value: `₹${profile.metrics.avgDealValue > 0 ? (profile.metrics.avgDealValue / 100).toLocaleString() : '0'}`, color: '#22c55e' },
              { label: 'Rating', value: `${profile.metrics.brandRating}/5`, color: '#a855f7' },
            ] : [
              { label: 'Deals', value: profile.metrics.dealsCompleted, color: '#0A0A0A' },
              { label: 'Avg Deal', value: `₹${(profile.metrics.avgDealValue / 100).toLocaleString()}`, color: '#22c55e' },
              { label: 'On Time', value: `${profile.metrics.onTimeRate}%`, color: '#A08A5E' },
              { label: 'Rating', value: `${profile.metrics.brandRating}/5`, color: '#a855f7' },
            ]).map(stat => (
              <div key={stat.label} style={{
                padding: '6px 8px',
                background: '#F5F5F0',
                borderRadius: '6px',
                border: '1px solid #E0E0DA',
              }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#B8B4AC', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Creator followers & engagement */}
        {profile.role === 'creator' && profile.metrics && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
            marginBottom: '10px',
          }}>
            <div style={{
              padding: '6px 8px',
              background: '#F5F5F0',
              borderRadius: '6px',
              border: '1px solid #E0E0DA',
            }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#B8B4AC', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Followers
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0A' }}>
                {(profile.metrics.followers / 1000).toFixed(1)}K
              </div>
            </div>
            <div style={{
              padding: '6px 8px',
              background: '#F5F5F0',
              borderRadius: '6px',
              border: '1px solid #E0E0DA',
            }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#B8B4AC', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Engagement
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0A0A0A' }}>
                {profile.metrics.engagement}%
              </div>
            </div>
          </div>
        )}

        {/* Creator Rate Card */}
        {profile.role === 'creator' && profile.rateCard && (
          <div style={{
            marginBottom: '10px',
            padding: '8px 10px',
            background: '#F5F5F0',
            borderRadius: '8px',
            border: '1px solid #E0E0DA',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#B8B4AC', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Rate Card
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(profile.rateCard).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{
                  fontSize: '11px', fontWeight: 600,
                  background: '#E0E0DA', borderRadius: '4px',
                  padding: '2px 8px', color: '#475569',
                }}>
                  {k}: ₹{v}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        {profile.role === 'creator' && profile.availableFrom && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', color: '#B8B4AC', marginBottom: '6px',
          }}>
            <span>Available from {profile.availableFrom}</span>
          </div>
        )}

        {/* Completed deals count */}
        {profile.completedDeals !== undefined && profile.completedDeals > 0 && (
          <div style={{
            fontSize: '11px', color: '#B8B4AC', textAlign: 'center',
            padding: '6px', borderTop: '1px solid #f1f5f0', marginTop: '4px',
          }}>
            {profile.completedDeals} deal{profile.completedDeals !== 1 ? 's' : ''} completed
          </div>
        )}
      </div>
    </div>
  );
}

export type { HoverProfile };
export { HoverCard };
