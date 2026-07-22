'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { C } from '@/theme/colors';
import { ValueSkinSprite } from '@/features/profiles/ProfileView';

// ValueSkins Closet (Store) — two-pane master/detail, per
// ui-specs/phase-2/store-page-mock.svg and ui-specs/store.md.
// Left: searchable, numbered profession list with per-category skin counts.
// Right: detail pane with a grid of skin cards, one Acquire per card.
//
// Price: V1 is a single flat ₹950 one-time skin. Project.md §7 describes a
// Type-priced activation fee (Hobby/Passion/Professional) — that Type layer is
// DROPPED for V1, so do not reintroduce tiered pricing here.
//
// PURCHASE FLOW UNCHANGED — same guards, same route to /payment/checkout.

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

const HAIR = 'rgba(160,138,94,0.22)';
const SAND = '#C8B89A';
const DEEP_SAND = '#A08A5E';

export default function StorePage() {
  const router = useRouter();
  const { account } = useAuth();
  const [ownedSkins, setOwnedSkins] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [loadingSkin, setLoadingSkin] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(Object.keys(PROFESSIONS)[0]);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const on = () => setIsNarrow(window.innerWidth <= 880);
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    if (!account?.id) return;
    const fetchOwnedSkins = async () => {
      try {
        const res = await fetch(`/api/skins/manage?userId=${account.id}`);
        if (res.ok) {
          const data = await res.json();
          setOwnedSkins(data.skins?.map((s: any) => s.value_skin) || []);
        }
      } catch {
        // owned list stays empty; the store still renders
      }
    };
    fetchOwnedSkins();
  }, [account?.id]);

  // FLOW UNCHANGED — same guards + route to checkout.
  const handlePurchase = async (skin: string) => {
    if (!account?.id) {
      alert('Please log in first');
      return;
    }
    if (ownedSkins.length >= 1) {
      alert('You can only own 1 ValueSkin. Remove your current skin to purchase another.');
      return;
    }
    setLoadingSkin(skin);
    router.push(`/payment/checkout?profession=${encodeURIComponent(skin)}`);
  };

  const categories = Object.entries(PROFESSIONS).filter(([name, subs]) => {
    const q = filter.toLowerCase();
    return !q || name.toLowerCase().includes(q) || subs.some(s => s.toLowerCase().includes(q));
  });

  const canPurchase = ownedSkins.length < 1;
  const activeSkins = PROFESSIONS[selected] || [];
  const isEquipped = (skin: string) => ownedSkins.includes(skin.toLowerCase());

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, fontFamily: FONT, overflowX: 'hidden' }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: isNarrow ? '28px 20px 80px' : '40px 32px 80px',
        display: 'grid',
        gridTemplateColumns: isNarrow ? '1fr' : '380px 1fr',
        gap: isNarrow ? 24 : 32,
        alignItems: 'start',
      }}>

        {/* ───────── LEFT: category list ───────── */}
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
            ValueSkins Closet
          </h1>
          <p style={{ fontSize: '0.8125rem', color: C.textSecondary, marginTop: 6, marginBottom: 16 }}>
            Pick a profession to see its skins.
          </p>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search professions…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Search professions"
              style={{
                width: '100%', height: 44, padding: '0 14px 0 40px',
                border: `1px solid rgba(160,138,94,0.28)`, borderRadius: 10,
                background: C.surface, color: C.text,
                fontSize: '0.875rem', fontFamily: FONT,
              }}
            />
            <svg
              width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"
              style={{ position: 'absolute', left: 14, top: 15, pointerEvents: 'none' }}
            >
              <circle cx="6" cy="6" r="5" fill="none" stroke={DEEP_SAND} strokeWidth="1.6" />
              <line x1="10" y1="10" x2="14" y2="14" stroke={DEEP_SAND} strokeWidth="1.6" />
            </svg>
          </div>

          <div style={{
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: C.textSecondary, margin: '22px 0 4px',
          }}>
            Browse professions
          </div>

          <div role="tablist" aria-label="Professions">
            {categories.map(([name, subs], i) => {
              const active = name === selected;
              return (
                <button
                  key={name}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(name)}
                  style={{
                    position: 'relative', width: '100%', minHeight: 46,
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '0 12px', border: 'none',
                    borderBottom: `1px solid ${C.border}`,
                    background: active ? 'rgba(200,184,154,0.14)' : 'transparent',
                    borderRadius: active ? 6 : 0,
                    cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
                    transition: 'background 0.15s ease',
                  }}
                >
                  {active && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: SAND,
                    }} />
                  )}
                  <span style={{ fontSize: '0.6875rem', color: C.textMuted, minWidth: 18 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 600, color: C.text }}>
                    {name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: C.textSecondary }}>
                    {subs.length} skins
                  </span>
                  <span aria-hidden="true" style={{ color: active ? DEEP_SAND : C.textMuted, fontSize: '0.9375rem' }}>›</span>
                </button>
              );
            })}
            {categories.length === 0 && (
              <p style={{ fontSize: '0.8125rem', color: C.textSecondary, padding: '18px 2px' }}>
                No professions match “{filter}”.
              </p>
            )}
          </div>
        </div>

        {/* ───────── RIGHT: detail pane ───────── */}
        <div style={{
          background: C.surface, border: `1px solid rgba(160,138,94,0.28)`,
          borderRadius: 18, padding: isNarrow ? '22px 20px' : '30px 32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.text, margin: 0 }}>{selected}</h2>
            <span style={{
              fontSize: '0.6875rem', color: C.textSecondary,
              border: `1px solid ${C.border}`, borderRadius: 13, padding: '5px 14px',
            }}>
              {activeSkins.length} skins · {ownedSkins.length}/1 owned
            </span>
          </div>

          <div style={{ height: 1, background: C.border, margin: '18px 0 16px' }} />

          <p style={{ fontSize: '0.8125rem', color: C.textSecondary, margin: '0 0 22px' }}>
            Tap a badge to purchase and instantly apply it as your ValueSkin. One active skin at a time.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)',
            gap: 16,
          }}>
            {activeSkins.map((skin) => {
              const equipped = isEquipped(skin);
              const loading = loadingSkin === skin;
              const disabled = equipped || !canPurchase || loading;

              return (
                <div
                  key={skin}
                  style={{
                    background: C.bg,
                    border: `1px solid ${equipped ? 'rgba(200,184,154,0.5)' : C.border}`,
                    borderRadius: 12, padding: '22px 18px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  }}
                >
                  <ValueSkinSprite size={56} />

                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: C.text, textAlign: 'center' }}>
                    {skin}
                  </div>

                  {equipped ? (
                    <span style={{
                      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                      color: DEEP_SAND, textTransform: 'uppercase',
                    }}>
                      Equipped
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePurchase(skin)}
                      disabled={disabled}
                      style={{
                        minWidth: 130, minHeight: 34, padding: '0 16px', borderRadius: 7,
                        background: canPurchase ? '#0A0A0A' : 'transparent',
                        color: canPurchase ? '#F5F5F0' : C.textSecondary,
                        border: canPurchase ? 'none' : `1px solid ${HAIR}`,
                        fontSize: '0.75rem', fontWeight: 600, fontFamily: FONT,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: !canPurchase ? 0.6 : 1,
                      }}
                    >
                      {loading ? 'Redirecting…' : !canPurchase ? 'Max skins (1/1)' : `Acquire · ${SKIN_PRICE}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => router.push('/demo/marketplace')}
            style={{
              marginTop: 28, minHeight: 44, padding: '0 22px',
              border: `1px solid ${HAIR}`, background: 'transparent',
              color: C.text, borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: '0.875rem', fontFamily: FONT,
            }}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}
