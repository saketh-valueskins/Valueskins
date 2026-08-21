'use client';

import { useRouter } from 'next/router';
import Link from 'next/link';
import { C } from '@/theme/colors';

const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const reasons = [
  {
    number: '01',
    title: 'Escrow System',
    description: 'Money is held so both parties don\'t get scammed. Your funds are secured until the deal is completed and approved.'
  },
  {
    number: '02',
    title: 'Clear Pricing',
    description: '12% of the deal amountthat\'s it. No hidden charges and no calls to discuss the charges. Transparent from day one.'
  },
  {
    number: '03',
    title: 'Founders Who Actually Respond',
    description: 'We\'re founders with virtually no social life. Try to contact us at +91 8805695324 or valueskinsfounder@gmail.com and we\'re most likely to reply and address your problems ASAP.'
  },
  {
    number: '04',
    title: 'Structured Workflow (Not Manual)',
    description: 'Many Instagram pages act as bridges between brands and creators, but the process is manual and messy. We built a structured deal funnel so you don\'t have to. Honestly? Brother, ew to manual processes.'
  },
  {
    number: '05',
    title: 'Built-in Chatbox',
    description: 'You don\'t need to go to DMs or WhatsApp to negotiate. We have a chatroom where you can negotiate the advance, deal amount, or anything elseso you don\'t get confused between multiple brands on your WhatsApp (we know you\'ll be very famous and busy).'
  },
  {
    number: '06',
    title: 'Auto-Generated Deal PDF',
    description: 'An "After the Deal" PDF downloads automatically after the deal is done. It acts as a summary and proof of everythingincluding chats, exact terms negotiated, etc. Get into your Harvey Specter mood and kill them with proof(s).'
  }
];

export default function WhyUsPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: `1px solid ${C.border}` }}>
        <Link href="/" style={{ textDecoration: 'none', color: C.text, fontSize: '18px', fontWeight: 700 }}>
          ← Back
        </Link>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', fontWeight: 800, color: C.text, margin: '0 0 20px', lineHeight: 1.1 }}>
          Why Should You Choose Us
        </h1>
        <p style={{ fontSize: '1.125rem', color: C.textSecondary, margin: '0 0 60px', maxWidth: '600px', lineHeight: 1.6 }}>
          Six reasons why ValueSkins is the platform creators and brands deserve.
        </p>
      </div>

      {/* Reasons Grid */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          {reasons.map((reason, i) => (
            <div
              key={i}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '32px',
                height: '100%',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = C.accent;
                el.style.background = C.surfaceAlt;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = C.border;
                el.style.background = C.surface;
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.accent, marginBottom: '12px', letterSpacing: '0.1em' }}>
                REASON {reason.number}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.text, margin: '0 0 12px', lineHeight: 1.3 }}>
                {reason.title}
              </h3>
              <p style={{ fontSize: '0.9375rem', color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 24px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text, margin: '0 0 20px' }}>
          Ready to get started?
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/auth/login" style={{
            display: 'inline-block', padding: '14px 32px', background: C.text, color: C.bg,
            borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 700, textDecoration: 'none',
            transition: 'transform 0.15s',
          }}>
            Get Started Now
          </Link>
          <Link href="/" style={{
            display: 'inline-block', padding: '14px 32px', background: 'transparent', color: C.accent,
            border: `1px solid ${C.accent}`, borderRadius: '8px', fontSize: '0.9375rem', fontWeight: 700, textDecoration: 'none',
            transition: 'all 0.15s',
          }}>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '40px 24px', textAlign: 'center', color: C.textSecondary, fontSize: '0.9375rem' }}>
        <p style={{ margin: '0 0 8px' }}>Questions? We're always here.</p>
        <p style={{ margin: 0 }}>
          <a href="tel:+918805695324" style={{ color: C.accent, textDecoration: 'none' }}>+91 8805695324</a> or{' '}
          <a href="mailto:valueskinsfounder@gmail.com" style={{ color: C.accent, textDecoration: 'none' }}>valueskinsfounder@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
