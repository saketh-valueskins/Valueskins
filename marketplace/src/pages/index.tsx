'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { C } from '@/theme/colors';
import ValueSkinsLogo from '@/components/ValueSkinsLogo';

export default function HomePage() {
  const router = useRouter();
  const { account, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (account && account.onboarding_stage === 'complete') {
      router.replace('/demo/marketplace');
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

  if (account && account.onboarding_stage === 'complete') return null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Hero */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <ValueSkinsLogo theme="light" size={32} />
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.35em', color: C.textSecondary, marginTop: '12px', marginBottom: '40px' }}>
          TRUST <span style={{ color: C.accent }}>·</span> EARNED <span style={{ color: C.accent }}>·</span> SERIOUS
        </div>

        <h1 style={{ fontSize: '48px', fontWeight: 800, color: C.text, margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          The marketplace for<br />creators and brands
        </h1>
        <p style={{ fontSize: '18px', color: C.textSecondary, margin: '0 auto 40px', maxWidth: '600px', lineHeight: 1.6 }}>
          ValueSkins connects content creators with brands for paid campaigns. Every deal is backed by escrow. Creators get guaranteed payment, brands only pay for work they approve.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/signup" style={{
            display: 'inline-block', padding: '14px 32px', background: C.text, color: C.bg,
            borderRadius: '12px', fontSize: '15px', fontWeight: 700, textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}>
            Get Started
          </Link>
          <Link href="/auth/login" style={{
            display: 'inline-block', padding: '14px 32px', background: 'transparent', color: C.text,
            borderRadius: '12px', fontSize: '15px', fontWeight: 700, textDecoration: 'none',
            border: `1px solid ${C.border}`, transition: 'border-color 0.15s',
          }}>
            Sign In
          </Link>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: '48px' }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
          {[
            { step: '01', title: 'Create Your Profile', desc: 'Showcase your skills, portfolio, and rates. Brands find you, or you find them.' },
            { step: '02', title: 'Make a Deal', desc: 'Brands post briefs, creators negotiate terms. Deliverables, deadlines, and payment are agreed upfront.' },
            { step: '03', title: 'Escrow Protects Both Sides', desc: 'Brand funds the deal. Money is held securely by Razorpay or Stripe. Released only on approval.' },
            { step: '04', title: 'Deliver and Get Paid', desc: 'Creator submits work. Brand reviews and approves. Payment releases instantly. Reputation grows.' },
          ].map(item => (
            <div key={item.step} style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px',
              padding: '28px', transition: 'border-color 0.15s',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.accent, marginBottom: '12px', letterSpacing: '0.1em' }}>
                STEP {item.step}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: C.text, margin: '0 0 10px' }}>{item.title}</h3>
              <p style={{ fontSize: '14px', color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* For Creators / For Brands */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.text, margin: '0 0 16px' }}>For Creators</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[
                'Build a public profile with your portfolio',
                'Get discovered by brands looking for creators',
                'Negotiate deal terms before committing',
                'Guaranteed payment through escrow',
                'All communication documented and on-record',
                'Build reputation with completed deals',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: C.textSecondary, padding: '6px 0', lineHeight: 1.5 }}>
                  <span style={{ color: C.accent, marginRight: '8px' }}>→</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.text, margin: '0 0 16px' }}>For Brands</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[
                'Browse verified creator profiles and portfolios',
                'Post campaign briefs and receive pitches',
                'Set clear deliverables, deadlines, and budgets',
                'Funds held in escrow until you approve',
                'Only pay for work you are satisfied with',
                'Track every deal from start to finish',
              ].map((item, i) => (
                <li key={i} style={{ fontSize: '14px', color: C.textSecondary, padding: '6px 0', lineHeight: 1.5 }}>
                  <span style={{ color: C.accent, marginRight: '8px' }}>→</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: C.text, margin: '0 0 12px' }}>Simple Pricing</h2>
          <p style={{ fontSize: '16px', color: C.textSecondary, margin: '0 0 24px' }}>
            No subscription. No upfront fees. We only charge when deals complete.
          </p>
          <div style={{ fontSize: '48px', fontWeight: 800, color: C.text, margin: '0 0 8px' }}>2%</div>
          <p style={{ fontSize: '14px', color: C.textSecondary, margin: 0 }}>platform fee on completed transactions</p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Ready to get started?</h2>
        <p style={{ fontSize: '16px', color: C.textSecondary, margin: '0 0 32px' }}>
          Join ValueSkins and start building real partnerships.
        </p>
        <Link href="/auth/signup" style={{
          display: 'inline-block', padding: '16px 40px', background: C.text, color: C.bg,
          borderRadius: '12px', fontSize: '16px', fontWeight: 700, textDecoration: 'none',
        }}>
          Create Your Account
        </Link>
      </div>
    </div>
  );
}
