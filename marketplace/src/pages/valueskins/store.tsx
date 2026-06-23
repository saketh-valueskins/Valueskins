'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { C } from '@/theme/colors';

const PROFESSIONS = {
  'Technology': ['Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'UX/UI Designer', 'AI/ML Specialist', 'Security Researcher'],
  'Entertainment': ['Actor', 'Comedian', 'Musician', 'Producer', 'Director', 'Screenwriter', 'Animator', 'Voice Actor'],
  'Healthcare': ['Doctor', 'Surgeon', 'Nurse', 'Pharmacist', 'Therapist', 'Nutritionist'],
  'Legal': ['Lawyer', 'Attorney', 'Judge', 'Corporate Lawyer'],
  'Business & Finance': ['CEO', 'Entrepreneur', 'Tech Entrepreneur', 'Operations Manager', 'Consultant', 'Financial Advisor', 'Trader', 'Investment Banker', 'Crypto Analyst', 'Finance Student'],
  'Education': ['Teacher', 'Professor', 'Tutor', 'EdTech Creator'],
  'Food & Beverage': ['Chef', 'Pastry Chef', 'Food Critic', 'Food Photographer', 'Restaurant Owner', 'Sommelier', 'Culinary Student'],
  'Sports & Fitness': ['Professional Athlete', 'Fitness Coach', 'Yoga Instructor', 'Sports Manager'],
  'Aviation': ['Commercial Pilot', 'Air Traffic Controller', 'Aircraft Engineer', 'Aviation Student', 'Cabin Crew Manager'],
  'Real Estate': ['Real Estate Agent', 'Real Estate Developer'],
  'Creative': ['Graphic Designer', 'Digital Artist', 'Illustrator', 'Photographer'],
};

export default function ValueSkinsStore() {
  const router = useRouter();
  const { account } = useAuth();
  const [ownedSkins, setOwnedSkins] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [loadingProfession, setLoadingProfession] = useState<string | null>(null);

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

  const handlePurchase = async (profession: string) => {
    if (!account?.id) {
      alert('Please log in first');
      return;
    }

    if (ownedSkins.length >= 3) {
      alert('You can only own 3 value skins. Delete one to purchase another.');
      return;
    }

    setLoadingProfession(profession);
    router.push(`/payment/checkout?profession=${profession}`);
  };

  const filteredSkins = Object.entries(PROFESSIONS).filter(([name]) =>
    name.toLowerCase().includes(filter.toLowerCase())
  );

  const canPurchase = ownedSkins.length < 3;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '40px 20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '800', color: C.text, marginBottom: '12px' }}>
            ValueSkins Store
          </h1>
          <p style={{ fontSize: '16px', color: C.textSecondary, marginBottom: '24px' }}>
            Choose your profession to unlock your unique value skin. You can own up to 3 skins. Upload custom images in Settings.
          </p>
          <p style={{ fontSize: '14px', color: C.accent, marginBottom: '24px' }}>
            Owned: {ownedSkins.length}/3
          </p>

          <input
            type="text"
            placeholder="Search professions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              maxWidth: '400px',
              padding: '12px 16px',
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              background: C.surface,
              color: C.text,
              fontSize: '14px',
              width: '100%',
            }}
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          {filteredSkins.map(([name, subProfessions]) => {
            const isOwned = ownedSkins.includes(name.toLowerCase());
            const isLoading = loadingProfession === name;

            return (
              <div
                key={name}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '24px',
                }}
              >
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: C.text, marginBottom: '16px' }}>
                  {name}
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '8px', textTransform: 'uppercase' }}>
                    Sub-professions:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {subProfessions.map((sub) => (
                      <span
                        key={sub}
                        style={{
                          fontSize: '12px',
                          background: C.bg,
                          color: C.textSecondary,
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(name)}
                  disabled={isOwned || !canPurchase || isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: isOwned ? C.border : canPurchase ? C.primary : C.textSecondary,
                    color: isOwned ? C.textSecondary : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isOwned || !canPurchase || isLoading ? 'not-allowed' : 'pointer',
                    opacity: !canPurchase && !isOwned ? 0.5 : 1,
                  }}
                >
                  {isLoading ? 'Redirecting...' : isOwned ? 'Owned' : !canPurchase ? 'Max Skins' : 'Purchase'}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push('/demo/marketplace')}
          style={{
            padding: '12px 24px',
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.text,
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Back to Marketplace
        </button>
      </div>
    </div>
  );
}
