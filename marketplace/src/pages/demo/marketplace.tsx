'use client';
import type { GetServerSidePropsContext } from 'next';
import { getSessionUserId } from '@/lib/session';
import { query } from '@/lib/db';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import MarketplaceDemoPage from '@/features/marketplace/demo/MarketplaceDemoPage';

const C = {
  bg: '#0f172a',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const cookie = ctx.req.headers.cookie || '';
  const userId = await getSessionUserId(cookie);
  if (!userId) return { props: { initialCampaigns: [], initialDealStates: null, initialApplications: [] } };

  try {
    const campResult = await query(
      `SELECT c.*, COUNT(ci.id) as invite_count,
        COUNT(ci.id) FILTER (WHERE ci.status = 'accepted') as accepted_count
       FROM campaigns c
       LEFT JOIN campaign_invites ci ON c.id = ci.campaign_id
       WHERE c.brand_id = $1
       GROUP BY c.id ORDER BY c.created_at DESC LIMIT 50`,
      [userId]
    );

    return {
      props: {
        initialCampaigns: campResult.rows || [],
        initialDealStates: null,
        initialApplications: [],
      },
    };
  } catch {
    return { props: { initialCampaigns: [], initialDealStates: null, initialApplications: [] } };
  }
}

interface DemoWrapperProps {
  initialCampaigns?: any[];
  initialDealStates?: any;
  initialApplications?: any[];
}

export default function DemoWrapper({ initialCampaigns = [], initialDealStates = null, initialApplications = [] }: DemoWrapperProps) {
  const router = useRouter();
  const { account, loading } = useAuth();
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocalhost(host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168'));
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        Loading...
      </div>
    );
  }

  // On localhost: show skip button if not logged in, else go straight to marketplace
  if (isLocalhost && !account) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>ValueSkins</div>
        <button
          onClick={() => router.push('/auth/login')}
          style={{ padding: '12px 24px', background: C.accent, border: 'none', borderRadius: '8px', color: '#000', fontWeight: '600', cursor: 'pointer', fontSize: '16px' }}
        >
          Login
        </button>
      </div>
    );
  }

  if (!account) {
    router.replace('/auth/login');
    return null;
  }

  return <MarketplaceDemoPage initialCampaigns={initialCampaigns} initialDealStates={initialDealStates} initialApplications={initialApplications} />;
}
