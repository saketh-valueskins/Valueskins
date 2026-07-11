'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { C } from '@/theme/colors';
import ValueSkinsLogo from '@/components/ValueSkinsLogo';

// Note: Using unified ValueSkins theme - same functionality, consistent styling

export default function HomePage() {
  const router = useRouter();
  const { account, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!account) {
      router.replace('/auth/login');
      return;
    }

    if (account.onboarding_stage !== 'complete') {
      router.replace('/auth/onboarding-enhanced');
      return;
    }
  }, [account, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <ValueSkinsLogo theme="light" size={26} />
          <div style={{ fontSize: '13px', color: C.textSecondary, marginTop: '24px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!account) return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    await new Promise(resolve => setTimeout(resolve, 100));
    window.location.href = '/auth/login';
  };
  return (
    <div style={{ minHeight: '100vh', background: C.surface, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: C.text, margin: '0' }}>
            Welcome back, {account.display_name.split(' ')[0]}!
          </h1>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: C.error, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        <p style={{ color: C.textSecondary, fontSize: '16px', marginBottom: '40px' }}>
          Where would you like to go today?
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

          <DashboardCard
            title="Marketplace"
            desc="Discover brands, creators & deals"
            link="/demo/marketplace"
            color="#A08A5E"
          />

          <div style={{ display: 'none' }}>
            <DashboardCard
              title="Events"
              desc="Host, explore, and manage events"
              link="/events"
              color="#C8B89A"
            />
          </div>

          <DashboardCard
            title="Preferences"
            desc="Set your availability, rates & pitch"
            link="/profile/me"
            color="#2D2D2D"
          />

        </div>

        <div style={{
          marginTop: '48px',
          padding: '32px',
          background: C.bg,
          borderRadius: '16px',
          border: `1px solid ${C.border}`,
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
            About the Marketplace
          </h2>
          <p style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.7, margin: '0 0 16px 0' }}>
            The marketplace connects creators with brands. Creators list their skills and
            experience. Brands post campaigns and browse profiles. Every deal is tracked
            from offer to completion, with all terms, payments, and deliverables documented
            in one place.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              'Deal terms are written and signed by both sides',
              'Payment milestones are set upfront',
              'Deliverables and deadlines are tracked per deal',
              'All communication stays on the record',
              'Completed deals build your reputation on the platform',
            ].map((item, i) => (
              <div key={i} style={{
                padding: '10px 16px',
                background: C.surface,
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                fontSize: '13px',
                color: C.text,
                lineHeight: 1.4,
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function DashboardCard({ title, desc, link, color }: { title: string, desc: string, link: string, color: string }) {
  return (
    <Link href={link} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '24px',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'transform 0.15s, boxShadow 0.15s',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>
          {title[0]}
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: C.text }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '14px', color: C.textSecondary, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </Link>
  );
}
