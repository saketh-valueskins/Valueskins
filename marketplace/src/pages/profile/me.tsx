'use client';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import BrandProfile from '@/features/profiles/BrandProfile';
import ProfileView, { type ProfileData } from '@/features/profiles/ProfileView';

// Auth + data wrapper. The page itself is ProfileView, built to
// ui-specs/phase-2/Profile page.md. Brand accounts keep the BrandProfile editor.
// A no-auth rendering of the same view lives at /demo/profile.

export default function ProfileMePage() {
  const router = useRouter();
  const { account, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const isBrand = account?.modules?.some((m: any) => m.code === 'brand' && m.is_active);

  useEffect(() => {
    if (isBrand) return;
    let cancelled = false;
    fetch('/api/profile/me', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setProfile(d); })
      .catch(() => { /* profile stays null; the view renders its zero state */ });
    return () => { cancelled = true; };
  }, [isBrand]);

  useEffect(() => {
    if (!loading && !account) router.replace('/auth/login');
  }, [loading, account, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0A0A0A', color: '#8A867E',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}>
        Loading…
      </div>
    );
  }
  if (!account) return null;
  if (isBrand) return <BrandProfile />;

  return (
    <>
      <Head><title>{profile?.display_name || 'Profile'} · ValueSkins</title></Head>
      <ProfileView
        profile={profile}
        onSettings={() => router.push('/account/settings')}
        onEditProfile={() => router.push('/account/settings')}
      />
    </>
  );
}
