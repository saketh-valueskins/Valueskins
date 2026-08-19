'use client';
import { withAlpha } from '@/theme/colors';
import React, { useState, useEffect } from 'react';
import { PROFESSION_BADGES, BRAND_CATEGORY_BADGES } from '@/features/valueskins/core/identity/AvatarOptions';
import { STICKER_MANIFEST } from '@/features/valueskins/core/stickers/sticker-manifest';
import { apiFetch } from '@/lib/backend';

function getStickerForProfession(profession: string): string | undefined {
  return PROFESSION_BADGES[profession]?.stickerImage || BRAND_CATEGORY_BADGES[profession]?.stickerImage || STICKER_MANIFEST[profession];
}

const C = {
  primary: 'var(--c-primary, #0A0A0A)',
  bg: 'var(--c-bg, #ffffff)',
  surface: 'var(--c-surface, #ffffff)',
  surfaceAlt: 'var(--c-surface-alt, #f9fafb)',
  card: 'var(--c-card, #f3f4f6)',
  text: 'var(--c-text, #1f2937)',
  textSecondary: 'var(--c-text-secondary, #6b7280)',
  textMuted: 'var(--c-outline, #9ca3af)',
  border: 'var(--c-border, #e5e7eb)',
  success: 'var(--c-success, #10b981)',
};

interface BackendCreator {
  id: number;
  platform: string;
  username: string;
  display_name: string;
  followers_count: number;
  engagement_rate: number;
  bio: string | null;
  profile_image_url: string | null;
  verified: boolean;
  value_skin: string | null;
  profession: string | null;
  estimated_rate_usd: number | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: '14px', padding: '24px', maxWidth: '420px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: C.textMuted, lineHeight: 1 }}>x</button>
        {children}
      </div>
    </div>
  );
}

export default function ExploreView() {
  const [exploreTab, setExploreTab] = useState<'trending' | 'skins' | 'creators'>('trending');
  const [previewCreator, setPreviewCreator] = useState<BackendCreator | null>(null);

  const [creators, setCreators] = useState<BackendCreator[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch creators when switching to creators tab
  useEffect(() => {
    if (exploreTab !== 'creators') return;
    let cancelled = false;

    async function load() {
      setLoadingCreators(true);
      try {
        const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}&limit=20` : '?limit=20';
        const res = await apiFetch<{ creators: BackendCreator[] }>(`/creators/search${q}`);
        if (!cancelled && res.data?.creators) {
          setCreators(res.data.creators);
        }
      } catch {
        // Creators not available
      } finally {
        if (!cancelled) setLoadingCreators(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [exploreTab, searchQuery]);

  // Debounced search
  useEffect(() => {
    if (exploreTab !== 'creators') return;
    const timer = setTimeout(() => {
      // trigger re-fetch by updating a dependency
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, exploreTab]);

  return (
    <>
      <div style={{ height: '52px', display: 'flex', alignItems: 'center', paddingLeft: '16px', position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
        <span style={{ fontSize: '22px', fontWeight: 700, color: C.text }}>Explore</span>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {(['trending', 'skins', 'creators'] as const).map(tab => (
          <button key={tab} onClick={() => setExploreTab(tab)}
            style={{ flex: 1, padding: '12px 0', fontSize: '13px', fontWeight: exploreTab === tab ? 700 : 500,
              color: exploreTab === tab ? C.text : C.textMuted, background: 'none', border: 'none',
              borderBottom: exploreTab === tab ? `2px solid ${C.primary}` : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {exploreTab === 'trending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: C.textMuted }}>Trending on ValueSkins</div>
            {[
              { title: 'AI-Powered Content Creation', desc: 'Creators using AI tools are seeing 3x engagement growth', tag: 'Tech', views: '24K' },
              { title: 'Fitness Creators Dominating Reels', desc: 'Short-form workout content up 180% this quarter', tag: 'Sports', views: '18K' },
              { title: 'Brand Deals Going Long-Term', desc: 'Ambassador programs replace one-off sponsorships', tag: 'Business', views: '12K' },
              { title: 'Design Portfolios on Instagram', desc: 'UX designers showcase work through carousel posts', tag: 'Art & Design', views: '9K' },
              { title: 'Finance Creators Hit Mainstream', desc: 'Budgeting and investing content reaches Gen Z', tag: 'Finance', views: '15K' },
            ].map((item, i) => (
              <div key={i} style={{ background: C.card, borderRadius: '10px', padding: '14px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{item.title}</span>
                  <span style={{ fontSize: '10px', color: C.textMuted, flexShrink: 0 }}>{item.views} views</span>
                </div>
                <div style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.4, marginBottom: '8px' }}>{item.desc}</div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: C.primary, background: `${withAlpha(C.primary, 0x10)}`, padding: '2px 8px', borderRadius: '4px' }}>{item.tag}</span>
              </div>
            ))}
          </div>
        )}

        {exploreTab === 'skins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Available ValueSkins</div>
            {Object.entries(PROFESSION_BADGES).slice(0, 12).map(([name, badge]) => (
              <div key={name} onClick={() => window.location.href = '/demo/library'}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = badge.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                {getStickerForProfession(name) ? (
                  <img src={getStickerForProfession(name)!} alt={name} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${badge.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: badge.color }}>{badge.abbreviation}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{name}</div>
                  <div style={{ fontSize: '11px', color: C.textMuted }}>Level 1-5 available</div>
                </div>
                <div style={{ fontSize: '11px', color: C.primary, fontWeight: 600 }}>View</div>
              </div>
            ))}
          </div>
        )}

        {exploreTab === 'creators' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search creators by name, skill, or profession..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '13px', boxSizing: 'border-box' as const, outline: 'none' }}
            />

            {loadingCreators ? (
              <div style={{ textAlign: 'center', padding: '20px', color: C.textMuted }}>Loading creators...</div>
            ) : creators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>No creators found</div>
                <div style={{ fontSize: '11px' }}>Try a different search or check back later</div>
              </div>
            ) : (
              creators.map(c => (
                <div key={c.id} onClick={() => setPreviewCreator(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                  {c.profile_image_url ? (
                    <img src={c.profile_image_url} alt={c.display_name || c.username}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.surfaceAlt }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>
                      {(c.display_name || c.username || '??').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>
                      {c.display_name || c.username}
                      {c.verified && <span style={{ marginLeft: '4px', fontSize: '11px', color: '#0095F6' }}>&#10003;</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: C.textSecondary }}>
                      @{c.username} {c.profession ? `· ${c.profession}` : c.value_skin ? `· ${c.value_skin}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>
                      {c.followers_count >= 1000 ? `${(c.followers_count / 1000).toFixed(1)}K` : c.followers_count}
                    </div>
                    {c.engagement_rate > 0 && (
                      <div style={{ fontSize: '10px', color: C.success }}>{c.engagement_rate.toFixed(1)}% eng</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {previewCreator && (
        <Modal onClose={() => setPreviewCreator(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {previewCreator.profile_image_url ? (
                <img src={previewCreator.profile_image_url} alt={previewCreator.display_name || previewCreator.username}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.surfaceAlt }} />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: C.textMuted, border: `1px solid ${C.border}` }}>
                  {(previewCreator.display_name || previewCreator.username || '??').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>
                  {previewCreator.display_name || previewCreator.username}
                  {previewCreator.verified && <span style={{ marginLeft: '4px', fontSize: '12px', color: '#0095F6' }}>&#10003;</span>}
                </div>
                <div style={{ fontSize: '13px', color: C.textSecondary }}>@{previewCreator.username}</div>
                {(previewCreator.profession || previewCreator.value_skin) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    {(() => {
                      const profession = previewCreator.profession || previewCreator.value_skin || '';
                      const badge = PROFESSION_BADGES[profession] ?? BRAND_CATEGORY_BADGES[profession];
                      const sticker = getStickerForProfession(profession);
                      return sticker ? (
                        <img src={sticker} alt={profession} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                      ) : badge ? (
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: badge.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 700, color: '#fff' }}>{badge.abbreviation}</div>
                      ) : null;
                    })()}
                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.primary }}>{previewCreator.profession || previewCreator.value_skin}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Followers', value: previewCreator.followers_count >= 1000 ? `${(previewCreator.followers_count / 1000).toFixed(1)}K` : String(previewCreator.followers_count) },
                { label: 'Engagement', value: previewCreator.engagement_rate > 0 ? `${previewCreator.engagement_rate.toFixed(1)}%` : '--' },
                { label: 'Platform', value: previewCreator.platform || '--' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '10px', background: C.surfaceAlt, borderRadius: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {previewCreator.bio && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Bio</div>
                <div style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.5 }}>{previewCreator.bio}</div>
              </div>
            )}

            {previewCreator.estimated_rate_usd != null && previewCreator.estimated_rate_usd > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Estimated Rate</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>${previewCreator.estimated_rate_usd.toLocaleString()}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
