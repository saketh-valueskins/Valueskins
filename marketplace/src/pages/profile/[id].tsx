'use client';
import { withAlpha } from '@/theme/colors';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MarketplaceLayout from '@/components/MarketplaceLayout';
import { api } from '@/lib/api';
import ReputationAndHistoryLight from '@/features/creator-profile/components/ReputationAndHistoryLight';
import type { GetServerSidePropsContext } from 'next';

export async function getServerSideProps(_ctx: GetServerSidePropsContext) {
  return { props: {} };
}

const C = {
  primary: '#0A0A0A',
  primaryGradient: 'linear-gradient(135deg, #0A0A0A, #2D2D2D)',
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  card: '#f3f4f6',
  text: 'var(--c-text)',
  textSecondary: 'var(--c-text-variant)',
  textMuted: 'var(--c-text-variant)',
  border: '#e5e7eb',
  success: 'var(--c-accent)',
  warning: 'var(--c-warning)',
  danger: 'var(--c-error)',
  accent: '#A08A5E',
};

export default function PublicProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const [isFollowing, setIsFollowing] = useState(false);
  const [remoteProfile, setRemoteProfile] = useState<null | {
    name: string;
    handle: string;
    bio: string;
    followers: number;
    following: number;
    engagement: number;
    dealsCompleted: number;
    avgDealValue: number;
    skins: string[];
    level: number;
    verified: boolean;
    avatarColor: string;
    avatarAbbr: string;
    avatarUrl: string | null;
    igHandle: string;
    igUsername: string;
    igAccountType: string;
    igBio: string;
    mediaCount: number;
    recentDeals: { brand: string; amount: string; date: string }[];
    reviews?: { author: string; rating: number; quote: string }[];
  }>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const raw = typeof id === 'string' ? id.replace('@', '') : '';
      if (!raw) return;

      const numericId = Number(raw);
      if (Number.isNaN(numericId)) {
        return;
      }

      const profileResult = await api.persona.getPersona(numericId);
      const skinsResult = await api.persona.getPersonaSkins(numericId);
      if (cancelled) return;

      let ig: null | {
        connected: boolean;
        username?: string;
        displayName?: string;
        accountType?: string;
        bio?: string;
        followers?: number;
        mediaCount?: number;
        profilePictureUrl?: string | null;
        lastSyncedAt?: string | null;
      } = null;
      try {
        const igRes = await fetch(`/api/social/instagram?userId=${numericId}`);
        ig = igRes.ok ? await igRes.json() : null;
      } catch {
        // Non-fatal — resume still renders from persona data alone.
      }
      if (cancelled) return;

      setRemoteProfile({
        name: profileResult.data.display_name,
        handle: `@${profileResult.data.username}`,
        bio: ig?.connected && ig?.bio ? ig.bio : '',
        followers: ig?.connected && typeof ig?.followers === 'number' ? ig.followers : 0,
        following: 0,
        engagement: 0,
        dealsCompleted: 0,
        avgDealValue: 0,
        skins: skinsResult.data?.map((skin) => skin.profession_name) ?? [],
        level: Math.max(...(skinsResult.data?.map((skin) => skin.level) ?? [1])),
        verified: true,
        avatarColor: '#0A0A0A',
        avatarAbbr: profileResult.data.display_name.slice(0, 2).toUpperCase(),
        avatarUrl: ig?.connected && ig?.profilePictureUrl ? ig.profilePictureUrl : null,
        igHandle: ig?.connected && ig?.username ? ig.username : '',
        igUsername: ig?.connected && ig?.username ? ig.username : '',
        igAccountType: ig?.connected && ig?.accountType ? ig.accountType : '',
        igBio: ig?.connected && ig?.bio ? ig.bio : '',
        mediaCount: ig?.connected && typeof ig?.mediaCount === 'number' ? ig.mediaCount : 0,
        recentDeals: [],
        reviews: [],
      });
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handle = typeof id === 'string' ? id.replace('@', '') : '';
  const profile = remoteProfile;
  const isLoadingRemote = !!handle && !Number.isNaN(Number(handle)) && !profile;
  const igUsername = profile?.igUsername || '';

  if (!handle || (!profile && !isLoadingRemote)) {
    return (
      <MarketplaceLayout title="Profile" hideHeader>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
            User not found
          </div>
          <div style={{ fontSize: '13px', color: C.textMuted }}>
            {handle ? `No user found for @${handle}` : 'Loading...'}
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (isLoadingRemote) {
    return (
      <MarketplaceLayout title="Profile" hideHeader>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
            Loading profile...
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout title={profile.name} hideHeader>
      <div style={{ padding: '20px 16px' }}>
        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: `${profile.avatarColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: profile.avatarColor,
            border: `3px solid ${profile.avatarColor}40`,
            overflow: 'hidden',
          }}>
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              profile.avatarAbbr
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>
                {profile.name}
              </span>
              {profile.verified && (
                <span style={{ fontSize: '14px' }}>✓</span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '2px' }}>
              {profile.handle}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {profile.igHandle ? (
                <>
                  <div style={{ fontSize: '12px', color: C.textSecondary }}>
                    <strong style={{ color: C.text }}>{profile.followers.toLocaleString()}</strong> followers
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSecondary }}>
                    <strong style={{ color: C.text }}>{profile.mediaCount.toLocaleString()}</strong> posts
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '12px', color: C.textMuted }}>
                  No Instagram connected
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: isFollowing ? C.surfaceAlt : C.primary,
              color: isFollowing ? C.text : '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: isFollowing ? `1px solid ${C.border}` : 'none',
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Bio */}
        {profile.bio ? (
          <div style={{
            fontSize: '13px',
            color: C.textSecondary,
            lineHeight: 1.6,
            marginBottom: '20px',
            padding: '14px',
            background: C.surfaceAlt,
            borderRadius: '10px',
          }}>
            {profile.bio}
          </div>
        ) : null}

        {/* Instagram analytics */}
        {profile.igHandle ? (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '10px' }}>
              Instagram
            </div>
            <div style={{
              background: C.surfaceAlt,
              borderRadius: '10px',
              padding: '14px',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>
                  {profile.igAccountType ? `@${igUsername}` : `@${igUsername}`}
                </div>
                {profile.igAccountType && (
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: C.primary + '12',
                    color: C.primary,
                    fontWeight: 600,
                  }}>
                    {profile.igAccountType}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ background: C.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
                    {profile.followers.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: C.textMuted, marginTop: 2 }}>
                    Followers
                  </div>
                </div>
                <div style={{ background: C.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
                    {profile.mediaCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: C.textMuted, marginTop: 2 }}>
                    Posts
                  </div>
                </div>
              </div>
              {profile.igBio && (
                <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '10px', lineHeight: 1.5 }}>
                  {profile.igBio}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ValueSkins */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '10px' }}>
            ValueSkins
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {profile.skins.map(skin => (
              <span key={skin} style={{
                padding: '6px 14px',
                borderRadius: '20px',
                background: C.primary + '12',
                color: C.primary,
                fontSize: '13px',
                fontWeight: 600,
                border: `1px solid ${withAlpha(C.primary, 0x30)}`,
              }}>
                {skin}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '24px',
        }}>
          <div style={{
            background: C.surfaceAlt,
            borderRadius: '10px',
            padding: '14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>
              Lv.{profile.level}
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: 2 }}>
              Level
            </div>
          </div>
          <div style={{
            background: C.surfaceAlt,
            borderRadius: '10px',
            padding: '14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>
              {profile.engagement}%
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: 2 }}>
              Engagement
            </div>
          </div>
          <div style={{
            background: C.surfaceAlt,
            borderRadius: '10px',
            padding: '14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>
              {profile.dealsCompleted}
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: 2 }}>
              Deals Done
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '24px',
        }}>
          <div style={{ background: C.surfaceAlt, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>
              ${(profile.avgDealValue || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: 2 }}>
              Avg Deal Value
            </div>
          </div>
          <div style={{ background: C.surfaceAlt, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>
              {profile.verified ? 'Verified' : 'Pending'}
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: 2 }}>
              Trust Status
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '10px' }}>
            Why brands book this profile
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {[
              'Verified ValueSkin identity',
              'Repeat brand collaborations',
              'Audience trust and conversion-ready positioning',
            ].map((item) => (
              <div key={item} style={{ padding: '12px 14px', background: C.surfaceAlt, borderRadius: '10px', fontSize: '13px', color: C.textSecondary }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Recent deals */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '10px' }}>
            Recent Deals
          </div>
          {profile.recentDeals.map((deal, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              borderBottom: i < profile.recentDeals.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                {deal.brand}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: C.success, fontWeight: 600 }}>
                  {deal.amount}
                </span>
                <span style={{ fontSize: '11px', color: C.textMuted }}>
                  {deal.date}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Reputation & History from Events */}
        <ReputationAndHistoryLight userId={parseInt(id as string)} />

        {!!profile.reviews?.length && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '10px' }}>
              Reviews
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {profile.reviews.map((review, i) => (
                <div key={`${review.author}-${i}`} style={{ background: C.surfaceAlt, borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{review.author}</div>
                    <div style={{ fontSize: '12px', color: C.warning }}>{'★'.repeat(review.rating)}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.5 }}>
                    {review.quote}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '10px' }}>
          <button style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            background: C.primary,
            color: '#fff',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Message {profile.name.split(' ')[0]}
          </button>
          <button style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            background: C.surfaceAlt,
            color: C.text,
            border: `1px solid ${C.border}`,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Request collaboration
          </button>
        </div>
      </div>
    </MarketplaceLayout>
  );
}
