'use client';

import React, { useState } from 'react';
import { PROFESSION_BADGES } from '@/features/valueskins/core/identity/AvatarOptions';
import { STICKER_MANIFEST } from '@/features/valueskins/core/stickers/sticker-manifest';

function getStickerForProfession(profession: string): string | undefined {
  return PROFESSION_BADGES[profession]?.stickerImage || STICKER_MANIFEST[profession];
}

const C = {
  primary: '#2563EB',
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  card: '#f3f4f6',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  success: '#10b981',
};

const MOCK_CREATORS = [
  { name: 'Alex Rivera', handle: '@alexriv', valueSkin: 'Photographer', followers: '12.4K', engagement: '4.2%', matchScore: '96%', rate: '$1,200/post', timezone: 'EST', responseTimeHrs: 4, minDealUsd: 500, audienceAgeRange: '18-34', audienceLocation: 'US, UK', audienceLang: 'English', availableFrom: 'Now', dealCompletionRate: 94, dealTypes: ['Sponsored Post', 'Brand Deal', 'UGC'], ndaOk: true, usageRightsOk: true, usageRightsDays: 90, rateCard: { photo: '$800', video: '$1,200', story: '$500' }, portfolio: ['Nike campaign (2025)', 'Adidas collab (2024)'] },
  { name: 'Maya Chen', handle: '@mayac', valueSkin: 'Fitness Coach', followers: '28.1K', engagement: '5.8%', matchScore: '92%', rate: '$800/post', timezone: 'PST', responseTimeHrs: 2, minDealUsd: 300, audienceAgeRange: '22-40', audienceLocation: 'US, CA', audienceLang: 'English, Mandarin', availableFrom: 'Now', dealCompletionRate: 98, dealTypes: ['Sponsored Post', 'Ambassador'], ndaOk: true, usageRightsOk: true, usageRightsDays: 60, rateCard: { photo: '$600', video: '$800', story: '$350' }, portfolio: ['Under Armour ambassadorship', 'Lululemon campaign'] },
  { name: 'Jordan Smith', handle: '@jordans', valueSkin: 'Graphic Designer', followers: '8.2K', engagement: '6.1%', matchScore: '89%', rate: '$1,500/post', timezone: 'CST', responseTimeHrs: 6, minDealUsd: 800, audienceAgeRange: '20-35', audienceLocation: 'US', audienceLang: 'English', availableFrom: '2 weeks', dealCompletionRate: 91, dealTypes: ['Sponsored Post', 'Design Collab', 'UGC'], ndaOk: false, usageRightsOk: true, usageRightsDays: 120, rateCard: { photo: '$1,000', video: '$1,500', story: '$700' }, portfolio: ['Spotify design system', 'Figma plugin launch'] },
  { name: 'Priya Patel', handle: '@priyap', valueSkin: 'Makeup Artist', followers: '45.3K', engagement: '3.9%', matchScore: '95%', rate: '$2,000/post', timezone: 'GMT', responseTimeHrs: 3, minDealUsd: 1_000, audienceAgeRange: '16-30', audienceLocation: 'UK, EU', audienceLang: 'English, Hindi', availableFrom: 'Now', dealCompletionRate: 97, dealTypes: ['Sponsored Post', 'Brand Deal', 'Tutorial'], ndaOk: true, usageRightsOk: true, usageRightsDays: 90, rateCard: { photo: '$1,500', video: '$2,000', story: '$800' }, portfolio: ['Sephora campaign', 'Fenty Beauty launch'] },
  { name: 'Marcus Williams', handle: '@marcusw', valueSkin: 'Musician', followers: '18.7K', engagement: '7.2%', matchScore: '87%', rate: '$1,000/post', timezone: 'EST', responseTimeHrs: 8, minDealUsd: 400, audienceAgeRange: '18-28', audienceLocation: 'US', audienceLang: 'English', availableFrom: '1 month', dealCompletionRate: 88, dealTypes: ['Sponsored Post', 'Song Feature', 'Event'], ndaOk: false, usageRightsOk: false, usageRightsDays: 30, rateCard: { audio: '$1,000', video: '$1,500', story: '$400' }, portfolio: ['SoundCloud top 50', 'Live Nation showcase'] },
];

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: '14px', padding: '24px', maxWidth: '420px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: C.textMuted, lineHeight: 1 }}>×</button>
        {children}
      </div>
    </div>
  );
}

export default function ExploreView() {
  const [exploreTab, setExploreTab] = useState<'trending' | 'skins' | 'creators'>('trending');
  const [previewCreator, setPreviewCreator] = useState<typeof MOCK_CREATORS[0] | null>(null);

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
            {[
              { title: 'AI-Powered Content Creation', desc: 'Creators using AI tools are seeing 3x engagement growth', tag: 'Technology', views: '24K' },
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
                <span style={{ fontSize: '10px', fontWeight: 700, color: C.primary, background: `${C.primary}10`, padding: '2px 8px', borderRadius: '4px' }}>{item.tag}</span>
              </div>
            ))}
          </div>
        )}

        {exploreTab === 'skins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Popular ValueSkins this week</div>
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
            <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>Top creators by engagement</div>
            {MOCK_CREATORS.map((c, i) => (
              <div key={i} onClick={() => setPreviewCreator(c)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name.replace(/\s/g, '')}`} alt={c.name} style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.surfaceAlt }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: C.textSecondary }}>{c.handle} · {c.valueSkin}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{c.followers}</div>
                  <div style={{ fontSize: '10px', color: C.success }}>{c.engagement} eng</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewCreator && (
        <Modal onClose={() => setPreviewCreator(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${previewCreator.name.replace(/\s/g, '')}`} alt={previewCreator.name}
                style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.surfaceAlt }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{previewCreator.name}</div>
                <div style={{ fontSize: '13px', color: C.textSecondary }}>{previewCreator.handle}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  {(() => {
                    const badge = PROFESSION_BADGES[previewCreator.valueSkin];
                    const sticker = getStickerForProfession(previewCreator.valueSkin);
                    return sticker ? (
                      <img src={sticker} alt={previewCreator.valueSkin} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: (badge?.color ?? C.primary), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 700, color: '#fff' }}>{badge?.abbreviation ?? '?'}</div>
                    );
                  })()}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: C.primary }}>{previewCreator.valueSkin}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Followers', value: previewCreator.followers },
                { label: 'Engagement', value: previewCreator.engagement },
                { label: 'Match', value: previewCreator.matchScore },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '10px', background: C.surfaceAlt, borderRadius: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                <div style={{ color: C.textMuted }}>Rate</div><div style={{ color: C.text, fontWeight: 600 }}>{previewCreator.rate}</div>
                <div style={{ color: C.textMuted }}>Timezone</div><div style={{ color: C.text }}>{previewCreator.timezone}</div>
                <div style={{ color: C.textMuted }}>Response</div><div style={{ color: C.text }}>Within {previewCreator.responseTimeHrs}h</div>
                <div style={{ color: C.textMuted }}>Min Deal</div><div style={{ color: C.text }}>${previewCreator.minDealUsd.toLocaleString()}</div>
                <div style={{ color: C.textMuted }}>Audience</div><div style={{ color: C.text }}>{previewCreator.audienceAgeRange}, {previewCreator.audienceLocation}</div>
                <div style={{ color: C.textMuted }}>Language</div><div style={{ color: C.text }}>{previewCreator.audienceLang}</div>
                <div style={{ color: C.textMuted }}>Available</div><div style={{ color: previewCreator.availableFrom === 'Now' ? C.success : C.text, fontWeight: 600 }}>{previewCreator.availableFrom}</div>
                <div style={{ color: C.textMuted }}>Completion</div><div style={{ color: C.text }}>{previewCreator.dealCompletionRate}%</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Accepts</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {previewCreator.dealTypes.map(dt => (
                  <span key={dt} style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: C.surfaceAlt, color: C.textSecondary, border: `1px solid ${C.border}` }}>{dt}</span>
                ))}
                {previewCreator.ndaOk && <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>NDA</span>}
                {previewCreator.usageRightsOk && <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>Usage Rights ({previewCreator.usageRightsDays}d)</span>}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Rate Card</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(previewCreator.rateCard).map(([fmt, price]) => (
                  <div key={fmt} style={{ flex: 1, textAlign: 'center', padding: '8px', background: C.surfaceAlt, borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{price as string}</div>
                    <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'capitalize' }}>{fmt}</div>
                  </div>
                ))}
              </div>
            </div>

            {previewCreator.portfolio.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Portfolio</div>
                {previewCreator.portfolio.map((p, i) => (
                  <div key={i} style={{ fontSize: '12px', color: C.textSecondary, padding: '6px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>{p}</div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
