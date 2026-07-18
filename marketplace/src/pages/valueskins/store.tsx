'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { C } from '@/theme/colors';

// ValueSkins Closet (Store) — per ui-specs/store.md. Airy hairline category
// tiles, one active skin (0/1), ₹950 one-time. UI restyle — the purchase flow
// (route to /payment/checkout) is UNCHANGED.
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const SKIN_PRICE = '₹950';

// System 3: Creator professions — same list as PROFESSION_BADGES used in onboarding and campaign targeting
const PROFESSIONS: Record<string, string[]> = {
  'Technology': ['Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'UX/UI Designer', 'AI/ML Specialist', 'Security Researcher'],
  'Entertainment': ['Actor', 'Comedian', 'Musician', 'Producer', 'Director', 'Screenwriter', 'Animator', 'Voice Actor', 'Dancer'],
  'Healthcare': ['Doctor', 'Surgeon', 'Nurse', 'Pharmacist', 'Therapist', 'Nutritionist', 'Veterinarian'],
  'Legal': ['Lawyer', 'Attorney', 'Judge', 'Corporate Lawyer', 'Paralegal'],
  'Business & Finance': ['CEO', 'Entrepreneur', 'Operations Manager', 'Consultant', 'Financial Advisor', 'Trader', 'Investment Banker', 'Crypto Analyst'],
  'Education': ['Teacher', 'Professor', 'Tutor', 'EdTech Creator'],
  'Food & Beverage': ['Chef', 'Pastry Chef', 'Food Critic', 'Food Photographer', 'Sommelier'],
  'Sports & Fitness': ['Professional Athlete', 'Fitness Coach', 'Yoga Instructor', 'Sports Manager'],
  'Creative': ['Graphic Designer', 'Digital Artist', 'Illustrator', 'Photographer', 'Motion Designer', '3D Artist'],
  'Gaming': ['Game Developer', 'Esports Pro', 'Game Streamer', 'Game Tester'],
  'Content': ['Content Creator', 'Educational Creator', 'Podcast Host', 'Video Creator', 'Streamer'],
  'Media & Journalism': ['Journalist', 'Reporter', 'Editor', 'Photojournalist'],
};

export default function ValueSkinsStore() {
  const router = useRouter();
  const { account } = useAuth();
  const [ownedSkins, setOwnedSkins] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [loadingProfession, setLoadingProfession] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.id) return;
    const fetchOwnedSkins = async () => {
      try {
        const res = await fetch(`/api/skins/manage?userId=${account.id}`);
        if (res.ok) {
          const data = await res.json();
          setOwnedSkins(data.skins?.map((s: any) => s.value_skin) || []);
        }
      } catch (err) {
        console.error('Failed to fetch skins:', err);
      }
    };
    fetchOwnedSkins();
  }, [account?.id]);

  // FLOW UNCHANGED — same guards + route to checkout.
  const handlePurchase = async (profession: string) => {
    if (!account?.id) {
      alert('Please log in first');
      return;
    }
    if (ownedSkins.length >= 1) {
      alert('You can only own 1 ValueSkin. Remove your current skin to purchase another.');
      return;
    }
    setLoadingProfession(profession);
    router.push(`/payment/checkout?profession=${profession}`);
  };

  const filteredSkins = Object.entries(PROFESSIONS).filter(([name]) =>
    name.toLowerCase().includes(filter.toLowerCase()),
  );
  const canPurchase = ownedSkins.length < 1;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '40px 20px', fontFamily: FONT }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: C.text, marginBottom: '8px' }}>ValueSkins Closet</h1>
          <p style={{ fontSize: '1rem', color: C.textSecondary, marginBottom: '4px' }}>
            One profession identity, worn everywhere. One active skin at a time.
          </p>
          <p style={{ fontSize: '0.875rem', color: C.accent, marginBottom: '24px' }}>
            {ownedSkins.length > 0 ? 'You own a ValueSkin · 1/1' : `One-time ${SKIN_PRICE} · 0/1`}
          </p>

          <input
            type="text"
            placeholder="Search professions…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              maxWidth: '400px',
              padding: '12px 16px',
              border: `1px solid rgba(160,138,94,0.28)`,
              borderRadius: '6px',
              background: C.surface,
              color: C.text,
              fontSize: '1rem',
              width: '100%',
              fontFamily: FONT,
            }}
          />
        </div>

        {/* Airy category tiles — hairline, not filled boxes (spec §1) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {filteredSkins.map(([name, subProfessions]) => {
            const isOwned = ownedSkins.includes(name.toLowerCase());
            const isLoading = loadingProfession === name;
            const isHovered = hovered === name;
            const disabled = isOwned || !canPurchase || isLoading;

            return (
              <div
                key={name}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHovered ? 'rgba(200,184,154,0.05)' : 'transparent',
                  border: `1px solid ${isHovered ? 'rgba(200,184,154,0.5)' : 'rgba(160,138,94,0.22)'}`,
                  borderRadius: '10px',
                  padding: '24px',
                  transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
                  transform: isHovered ? 'translateY(-2px)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.text, margin: 0 }}>{name}</h3>
                  <span style={{ fontSize: '0.75rem', color: C.textSecondary }}>{subProfessions.length} skins</span>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {subProfessions.slice(0, 6).map((sub) => (
                      <span
                        key={sub}
                        style={{
                          fontSize: '0.75rem',
                          color: C.textSecondary,
                          border: `1px solid rgba(160,138,94,0.2)`,
                          padding: '3px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {sub}
                      </span>
                    ))}
                    {subProfessions.length > 6 && (
                      <span style={{ fontSize: '0.75rem', color: C.textSecondary, padding: '3px 4px' }}>
                        +{subProfessions.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(name)}
                  disabled={disabled}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    // Near-black on sand for the active buy; quiet when unavailable (spec §6)
                    background: isOwned ? 'transparent' : canPurchase ? C.accent : 'transparent',
                    color: isOwned ? C.textSecondary : canPurchase ? '#0A0A0A' : C.textSecondary,
                    border: isOwned || !canPurchase ? `1px solid rgba(160,138,94,0.28)` : 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: !canPurchase && !isOwned ? 0.6 : 1,
                    fontFamily: FONT,
                  }}
                >
                  {isLoading ? 'Redirecting…' : isOwned ? 'Owned' : !canPurchase ? 'Max skins (1/1)' : `Buy · ${SKIN_PRICE}`}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push('/demo/marketplace')}
          style={{
            padding: '12px 24px',
            border: `1px solid rgba(160,138,94,0.28)`,
            background: 'transparent',
            color: C.text,
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontFamily: FONT,
          }}
        >
          Back to Marketplace
        </button>
      </div>
    </div>
  );
}
