'use client';
import { withAlpha } from '@/theme/colors';

import React, { useState } from 'react';
import { PROFESSION_BADGES, BRAND_CATEGORY_BADGES } from '@/features/valueskins/core/identity/AvatarOptions';
import { STICKER_MANIFEST } from '@/features/valueskins/core/stickers/sticker-manifest';
import { getLevel, getProgressToNext } from '@/lib/levels';

// ValueSkins Unified Brand Colors - Trust · Earned · Serious
const C = {
  onPrimary: 'var(--c-on-primary)', // correct foreground on C.primary in BOTH themes
  primary: '#0A0A0A',           // Dark charcoal
  primaryGradient: 'linear-gradient(135deg, #0A0A0A, #2D2D2D)',
  bg: '#F5F5F0',                // Cream
  surface: '#F5F5F0',
  surfaceAlt: '#F0F0EA',        // Light neutral
  card: '#FFFFFF',              // White
  text: '#0A0A0A',              // Dark charcoal
  textSecondary: '#2D2D2D',     // Taupe gray
  textMuted: '#8B8B85',         // Muted gray
  border: '#E0E0DA',            // Border
  borderLight: '#F0F0EA',       // Light border
  success: '#22C55E',           // Green
  successBg: 'rgba(34, 197, 94, 0.08)',
  successBorder: 'rgba(34, 197, 94, 0.25)',
  warning: '#F97316',           // Orange
  warningBg: 'rgba(249, 115, 22, 0.08)',
  warningBorder: 'rgba(249, 115, 22, 0.25)',
  danger: '#EF4444',            // Red
  dangerBg: 'rgba(239, 68, 68, 0.08)',
  dangerBorder: 'rgba(239, 68, 68, 0.25)',
  accent: '#A08A5E',            // Gold - ValueSkins brand accent
  accentBg: 'rgba(160, 138, 94, 0.08)',
  accentBorder: 'rgba(160, 138, 94, 0.25)',
};

const BRAND_CATEGORIES: Record<string, { name: string; subCategories: string[] }> = {
  'Company Size':  { name: 'Company Size',  subCategories: ['Startup', 'SMB', 'Mid-Market', 'Enterprise', 'Agency', 'Solo Brand', 'Non-Profit', 'Government'] },
};

function getStickerForProfession(profession: string): string | undefined {
  return PROFESSION_BADGES[profession]?.stickerImage || BRAND_CATEGORY_BADGES[profession]?.stickerImage || STICKER_MANIFEST[profession];
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: C.card, borderRadius: '20px', padding: '24px', maxWidth: '500px', width: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: C.textMuted, fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>x</button>
        {children}
      </div>
    </div>
  );
}

interface Props {
  role?: 'brand' | 'creator' | 'viewer';
  brandValueSkins?: string[];
  // Shared state — written here, read by hover card + profile sidebar.
  // Optional — falls back to local state when not passed (standalone page usage).
  activeSelectedCountry?: string;
  setSelectedCountry?: (v: string) => void;
  rateCard?: { reel: string; story: string; post: string; podcast: string; live: string };
  setRateCard?: (v: { reel: string; story: string; post: string; podcast: string; live: string } | ((prev: { reel: string; story: string; post: string; podcast: string; live: string }) => { reel: string; story: string; post: string; podcast: string; live: string })) => void;
  creatorAvailableFrom?: string;
  setCreatorAvailableFrom?: (v: string) => void;
  selectedLanguages?: string[];
  setSelectedLanguages?: (v: string[] | ((prev: string[]) => string[])) => void;
  profileDealTypes?: string[];
  setProfileDealTypes?: (v: string[] | ((prev: string[]) => string[])) => void;
  willingToBarter?: boolean;
  setWillingToBarter?: (v: boolean) => void;
  brandProfileSelections?: Record<string, string>;
  setBrandProfileSelections?: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  skinPitchTexts?: Record<string, string>;
  setSkinPitchTexts?: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  skinPitchVideos?: Record<string, { url: string; name: string }>;
  setSkinPitchVideos?: (v: Record<string, { url: string; name: string }> | ((prev: Record<string, { url: string; name: string }>) => Record<string, { url: string; name: string }>)) => void;
  creatorEnergy?: string;
  setCreatorEnergy?: (v: string) => void;
  portfolioImage?: string | null;
  setPortfolioImage?: (v: string | null) => void;
  profileName?: string;
  profileBio?: string;
}

export default function SettingsView({
  role = 'creator',
  brandValueSkins: propBrandValueSkins,
  selectedCountry: propSelectedCountry,
  setSelectedCountry: propSetSelectedCountry,
  rateCard: propRateCard,
  setRateCard: propSetRateCard,
  creatorAvailableFrom: propCreatorAvailableFrom,
  setCreatorAvailableFrom: propSetCreatorAvailableFrom,
  selectedLanguages: propSelectedLanguages,
  setSelectedLanguages: propSetSelectedLanguages,
  profileDealTypes: propProfileDealTypes,
  setProfileDealTypes: propSetProfileDealTypes,
  willingToBarter: propWillingToBarter,
  setWillingToBarter: propSetWillingToBarter,
  brandProfileSelections: propBrandProfileSelections,
  setBrandProfileSelections: propSetBrandProfileSelections,
  skinPitchTexts: propSkinPitchTexts,
  setSkinPitchTexts: propSetSkinPitchTexts,
  skinPitchVideos: propSkinPitchVideos,
  setSkinPitchVideos: propSetSkinPitchVideos,
  creatorEnergy: propCreatorEnergy,
  setCreatorEnergy: propSetCreatorEnergy,
  portfolioImage: propPortfolioImage,
  setPortfolioImage: propSetPortfolioImage,
  profileName: propProfileName,
  profileBio: propProfileBio,
}: Props) {
  // ── Fallback local state for shared props ────────────────────────
  const [localCountry, setLocalCountry] = useState('');
  const [localRateCard, setLocalRateCard] = useState({ reel: '', story: '', post: '', podcast: '', live: '' });
  const [localAvailableFrom, setLocalAvailableFrom] = useState('2026-03-01');
  const [localLanguages, setLocalLanguages] = useState<string[]>(['English']);
  const [localDealTypes, setLocalDealTypes] = useState<string[]>(['Paid']);
  const [localBarter, setLocalBarter] = useState(false);
  const [localBrandSelections, setLocalBrandSelections] = useState<Record<string, string>>({});
  const [localPitchTexts, setLocalPitchTexts] = useState<Record<string, string>>({});
  const [localPitchVideos, setLocalPitchVideos] = useState<Record<string, { url: string; name: string }>>({});
  const [localPortfolioImage, setLocalPortfolioImage] = useState<string | null>(null);
  const [localCreatorEnergy] = useState<'available' | 'limited' | 'burnout' | 'pause'>('available');

  // Use prop if provided, else fall back to local
  const activeSelectedCountry = propSelectedCountry ?? localCountry;
  const setActiveSelectedCountry = propSetSelectedCountry ?? setLocalCountry;
  const activeRateCard = propRateCard ?? localRateCard;
  const setActiveRateCard = propSetRateCard ?? setLocalRateCard;
  const activeCreatorAvailableFrom = propCreatorAvailableFrom ?? localAvailableFrom;
  const setActiveCreatorAvailableFrom = propSetCreatorAvailableFrom ?? setLocalAvailableFrom;
  const activeSelectedLanguages = propSelectedLanguages ?? localLanguages;
  const setActiveSelectedLanguages = propSetSelectedLanguages ?? setLocalLanguages;
  const activeProfileDealTypes = propProfileDealTypes ?? localDealTypes;
  const setActiveProfileDealTypes = propSetProfileDealTypes ?? setLocalDealTypes;
  const activeWillingToBarter = propWillingToBarter ?? localBarter;
  const setActiveWillingToBarter = propSetWillingToBarter ?? setLocalBarter;
  const activeBrandProfileSelections = propBrandProfileSelections ?? localBrandSelections;
  const setActiveBrandProfileSelections = propSetBrandProfileSelections ?? setLocalBrandSelections;
  const activeSkinPitchTexts = propSkinPitchTexts ?? localPitchTexts;
  const setActiveSkinPitchTexts = propSetSkinPitchTexts ?? setLocalPitchTexts;
  const activeSkinPitchVideos = propSkinPitchVideos ?? localPitchVideos;
  const setActiveSkinPitchVideos = propSetSkinPitchVideos ?? setLocalPitchVideos;
  const activePortfolioImage = propPortfolioImage ?? localPortfolioImage;
  const setActivePortfolioImage = propSetPortfolioImage ?? setLocalPortfolioImage;
  const activeCreatorEnergy = propCreatorEnergy ?? localCreatorEnergy;

  // ── General (all roles) ──────────────────────────────────────────
  const [creatorSettingsOpen, setCreatorSettingsOpen] = useState<string | null>(null);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);

  // ── My Profile (Demographics) ────────────────────────────────────
  const [myProfileData, setMyProfileData] = useState(() => {
    if (typeof window === 'undefined') return { fullName: '', ageRange: '', gender: '', country: '', city: '' };
    const saved = localStorage.getItem('vs_demo_my_profile');
    return saved ? JSON.parse(saved) : { fullName: '', ageRange: '', gender: '', country: '', city: '' };
  });

  const saveMyProfile = (updates: Partial<typeof myProfileData>) => {
    const newData = { ...myProfileData, ...updates };
    setMyProfileData(newData);
    localStorage.setItem('vs_demo_my_profile', JSON.stringify(newData));
    setPurchaseToast('Profile updated');
    setTimeout(() => setPurchaseToast(null), 2000);
  };

  const isProfileComplete = myProfileData.fullName && myProfileData.ageRange && myProfileData.gender && myProfileData.country && myProfileData.city;

  // ── Brand-only state ─────────────────────────────────────────────
  const brandValueSkins = propBrandValueSkins ?? JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('vs_demo_brand_value_skins') || '[]' : '[]');

  // ── Creator-only state ───────────────────────────────────────────
  const [notAvailableFrom, setNotAvailableFrom] = useState('');
  const [notAvailableTo, setNotAvailableTo] = useState('');
  const [profileExclusivity, setProfileExclusivity] = useState(false);
  const [profileNda, setProfileNda] = useState(false);
  const [profileUsageRights, setProfileUsageRights] = useState(false);
  const [profileOnCamera, setProfileOnCamera] = useState(true);

  // Skin showcase
  // valueSkins — mock empty map (real data comes from backend)
  const [valueSkins] = useState<Record<string, any>>({});
  const [creatorSkinMode, setCreatorSkinMode] = useState<'static' | 'showcase'>('showcase');
  const [showSkinShowcaseModal, setShowSkinShowcaseModal] = useState<string | null>(null);
  const creatorPitchText = showSkinShowcaseModal ? (activeSkinPitchTexts[showSkinShowcaseModal] ?? '') : '';
  const setCreatorPitchText = (text: string) => { if (showSkinShowcaseModal) setActiveSkinPitchTexts(prev => ({ ...prev, [showSkinShowcaseModal]: text })); };
  const creatorPitchVideoUrl = showSkinShowcaseModal ? (activeSkinPitchVideos[showSkinShowcaseModal]?.url ?? '') : '';
  const creatorPitchVideoName = showSkinShowcaseModal ? (activeSkinPitchVideos[showSkinShowcaseModal]?.name ?? '') : '';
  const setCreatorPitchVideoUrl = (url: string) => { if (showSkinShowcaseModal) setActiveSkinPitchVideos(prev => ({ ...prev, [showSkinShowcaseModal]: { url, name: prev[showSkinShowcaseModal]?.name ?? '' } })); };
  const setCreatorPitchVideoName = (name: string) => { if (showSkinShowcaseModal) setActiveSkinPitchVideos(prev => ({ ...prev, [showSkinShowcaseModal]: { url: prev[showSkinShowcaseModal]?.url ?? '', name } })); };

  // Inbox & safety
  const [creatorAllowedNiches, setCreatorAllowedNiches] = useState<string[]>([]);
  const [creatorBlockedBrands, setCreatorBlockedBrands] = useState<string[]>([]);
  const [creatorShowSafetySettings, setCreatorShowSafetySettings] = useState(false);

  // Rate card
  const [contractMode, setContractMode] = useState<'one-off' | 'long-term' | 'both'>('both');
  const [creatorMaxActiveDeals, setCreatorMaxActiveDeals] = useState(3);
  const [adminShowRateCard] = useState(true);

  // Availability calendar
  const [isFirstDealOpen, setIsFirstDealOpen] = useState(false);
  const [adminShowAvailabilityCalendar] = useState(true);

  // Deal structure defaults
  const [revisionLimit, setRevisionLimit] = useState(2);
  const [usageRightsDays, setUsageRightsDays] = useState(90);
  const [exclusivityUntil, setExclusivityUntil] = useState('');

  // Metrics (for showcase modal)
  const [metrics] = useState({ followers: 18400, engagement: 4.2, dealsCompleted: 17, avgDealValue: 2500, onTimeRate: 96, brandRating: 4.6 });

  const ownedSkins = Object.values(valueSkins).filter(Boolean);
  const ownedSkinsList = Object.entries(valueSkins).filter(([, v]) => v?.profession).map(([, v]) => v!.profession);

  return (
    <>
      {/* Toast */}
      {purchaseToast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: C.text, color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, zIndex: 99999, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
          {purchaseToast}
        </div>
      )}

      {/* Header */}
      <div style={{ height: '60px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '20px', paddingRight: '20px', fontWeight: 'bold', fontSize: '16px', background: C.surface }}>
        <div>
          Settings
          <span style={{ fontSize: '11px', fontWeight: 600, color: C.textSecondary, marginLeft: '10px' }}>ValueSkins preferences</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: C.success }}>Auto-saved</span>
      </div>
      <div style={{ padding: '20px' }}>

        {/* ── MY PROFILE (Demographics) ── */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>My Profile</div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
            {/* Status indicator */}
            <div style={{ marginBottom: '14px', padding: '10px', background: isProfileComplete ? 'rgba(0,212,106,0.1)' : 'rgba(255,171,0,0.1)', borderRadius: '8px', border: `1px solid ${isProfileComplete ? 'rgba(0,212,106,0.3)' : 'rgba(255,171,0,0.3)'}` }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: isProfileComplete ? '#00D46A' : '#FFAB00' }}>
                {isProfileComplete ? '✓ Profile Complete' : '⚠ Profile Incomplete — Required to access marketplace'}
              </div>
            </div>

            {/* Full Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Full Name *</label>
              <input type="text" placeholder="Your full name" value={myProfileData.fullName} onChange={e => saveMyProfile({ fullName: e.target.value })}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>

            {/* Age Range */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Age Range *</label>
              <select value={myProfileData.ageRange} onChange={e => saveMyProfile({ ageRange: e.target.value })}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, cursor: 'pointer' }}>
                <option value="">Select age range</option>
                <option value="18-25">18-25</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45-54">45-54</option>
                <option value="55+">55+</option>
              </select>
            </div>

            {/* Gender */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Gender *</label>
              <select value={myProfileData.gender} onChange={e => saveMyProfile({ gender: e.target.value })}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, cursor: 'pointer' }}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Country */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Country *</label>
              <input type="text" placeholder="Your country" value={myProfileData.country} onChange={e => saveMyProfile({ country: e.target.value })}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>

            {/* City */}
            <div style={{ marginBottom: '0' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: '6px' }}>City *</label>
              <input type="text" placeholder="Your city" value={myProfileData.city} onChange={e => saveMyProfile({ city: e.target.value })}
                style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
          </div>
        </div>

        {/* ── Brand Settings ── */}
        {role === 'brand' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>Brand Settings</div>
            <div style={{ background: C.card, border: `1px solid rgba(230,81,0,0.25)`, borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Brand Identity</div>
              {brandValueSkins.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {brandValueSkins.map(skin => (
                      <div key={skin} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(230,81,0,0.06)', borderRadius: '8px', padding: '6px 10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{skin}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: C.textSecondary }}>Active</div>
                </div>
              ) : (
                <div style={{ width: '100%', background: C.warning, border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'default', textAlign: 'center' }}>
                  No Brand ValueSkins — visit the Store
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Brand Profile ── */}
        {role === 'brand' && (
          <div style={{ marginBottom: '24px' }}>
            {(() => {
              const open = creatorSettingsOpen === 'brandProfile';
              return (
                <>
                  <button onClick={() => setCreatorSettingsOpen(open ? null : 'brandProfile')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Brand Profile</span>
                    <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                  </button>
                  {open && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '12px', lineHeight: 1.5 }}>
                        Define your brand profile so creators understand who you are. Select one option from each category.
                      </div>
                      {Object.values(BRAND_CATEGORIES).map((cat) => {
                        const currentSelection = activeBrandProfileSelections[cat.name];
                        return (
                          <div key={cat.name} style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '8px' }}>{cat.name}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {cat.subCategories.map((sub) => {
                                const selected = currentSelection === sub;
                                return (
                                  <button
                                    key={sub}
                                    onClick={() => {
                                      setActiveBrandProfileSelections(prev => ({ ...prev, [cat.name]: selected ? '' : sub }));
                                      if (!selected) { setPurchaseToast(`${cat.name}: ${sub}`); setTimeout(() => setPurchaseToast(null), 2000); }
                                    }}
                                    style={{
                                      padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: selected ? 600 : 400,
                                      background: selected ? `${withAlpha(C.primary, 0x15)}` : C.bg,
                                      border: `1px solid ${selected ? C.primary : C.border}`,
                                      color: selected ? C.primary : C.textSecondary,
                                      cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                  >
                                    {sub}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}



        {/* ── CREATOR-ONLY SETTINGS ── */}
        {role !== 'brand' && (<>

          {/* Availability */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Availability
            </div>
            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '12px', lineHeight: 1.4 }}>
              You are assumed available for deals at all times. Set dates below only if you are taking a break.
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', marginBottom: '10px' }}>Not available from</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '4px' }}>From</div>
                  <input type="date" value={notAvailableFrom} onChange={e => setNotAvailableFrom(e.target.value)}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '4px' }}>To</div>
                  <input type="date" value={notAvailableTo} onChange={e => setNotAvailableTo(e.target.value)}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              </div>
              {(notAvailableFrom || notAvailableTo) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#f59e0b' }}>
                    You will appear as unavailable during this period.
                  </div>
                  <button onClick={() => { setNotAvailableFrom(''); setNotAvailableTo(''); }}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '10px', color: C.textSecondary, cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Location & Availability */}
          {(() => {
            const locOpen = creatorSettingsOpen === 'location';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(locOpen ? null : 'location')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Location & Availability</span>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{locOpen ? '\u25B2' : '\u25BC'}</span>
                </button>
                {locOpen && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>City</div><input placeholder="e.g. New York" style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} /></div>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Country</div>
                        <select value={activeSelectedCountry} onChange={e => setActiveSelectedCountry(e.target.value)}
                          style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }}>
                          {['Select...','United States','United Kingdom','Canada','Australia','India','Germany','France','Brazil','Japan','South Korea','Mexico','Spain','Italy','Netherlands','Sweden','Norway','Denmark','Finland','Switzerland','Austria','Belgium','Portugal','Ireland','New Zealand','Singapore','Philippines','Indonesia','Thailand','Vietnam','Malaysia','South Africa','Nigeria','Kenya','Egypt','UAE','Saudi Arabia','Turkey','Poland','Czech Republic','Romania','Ukraine','Russia','China','Taiwan','Argentina','Colombia','Chile','Peru','Israel','Pakistan','Bangladesh'].map(c => <option key={c} value={c === 'Select...' ? '' : c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Availability Hours</div><input placeholder="e.g. 9am 6pm EST" style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} /></div>
                    {['Willing to relocate', 'Willing to travel', 'Available for live events'].map(lbl => (
                      <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: '12px', color: C.text }}>{lbl}</span>
                        <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: C.border, position: 'relative', cursor: 'pointer' }}><div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: '2px' }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Identity & Content */}
          {(() => {
            const open = creatorSettingsOpen === 'identity';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(open ? null : 'identity')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Identity & Content</span>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                </button>
                {open && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Age</div><input type="number" placeholder="25" style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} /></div>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Gender</div>
                        <select style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }}>
                          {['Select...', 'Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Content Niche</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {['Fashion','Beauty','Tech','Finance','Fitness','Food','Travel','Gaming','Education','Lifestyle','Business','Health','Sports','Music','Art'].map(n => (
                          <span key={n} style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer' }}>{n}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Content Format</div>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {['Video','Photo','Text','Podcast','Live'].map(f => (
                          <span key={f} style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer' }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Posting Frequency</div><input placeholder="e.g. 3x/week" style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} /></div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Audience */}
          {(() => {
            const open = creatorSettingsOpen === 'audience';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(open ? null : 'audience')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Your Audience</span>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                </button>
                {open && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Age Range</div>
                        <select style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }}>
                          {['Select...','13-17','18-24','25-34','35-44','45-54','55+'].map(a => <option key={a}>{a}</option>)}
                        </select>
                      </div>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Country</div>
                        <select value={activeSelectedCountry} onChange={e => setActiveSelectedCountry(e.target.value)}
                          style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }}>
                          {['Select...','United States','United Kingdom','Canada','Australia','India','Germany','France','Brazil','Japan','South Korea','Mexico','Spain','Italy','Netherlands','Sweden','Norway','Denmark','Finland','Switzerland','Austria','Belgium','Portugal','Ireland','New Zealand','Singapore','Philippines','Indonesia','Thailand','Vietnam','Malaysia','South Africa','Nigeria','Kenya','Egypt','UAE','Saudi Arabia','Turkey','Poland','Czech Republic','Romania','Ukraine','Russia','China','Taiwan','Argentina','Colombia','Chile','Peru','Israel','Pakistan','Bangladesh'].map(c => <option key={c} value={c === 'Select...' ? '' : c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '4px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Audience Languages (select all that apply)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {['English','Spanish','French','Hindi','Portuguese','Arabic','Mandarin','German','Japanese','Korean','Russian','Italian','Dutch','Swedish','Norwegian','Danish','Finnish','Polish','Turkish','Thai','Vietnamese','Indonesian','Malay','Filipino','Bengali','Tamil','Telugu','Urdu','Persian','Hebrew','Swahili','Greek','Czech','Romanian','Hungarian'].map(l => {
                          const active = activeSelectedLanguages.includes(l);
                          return (
                            <span key={l} onClick={() => setActiveSelectedLanguages(prev => active ? prev.filter(x => x !== l) : [...prev, l])}
                              style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                                background: active ? `${withAlpha(C.primary, 0x20)}` : C.bg,
                                border: `1px solid ${active ? C.primary : C.border}`,
                                color: active ? C.primary : C.textSecondary,
                                cursor: 'pointer', fontWeight: active ? 600 : 400,
                                transition: 'all 0.15s' }}>{l}</span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Deal Preferences */}
          {(() => {
            const open = creatorSettingsOpen === 'deals';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(open ? null : 'deals')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Deal Preferences</span>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                </button>
                {open && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Deal Type (select all that apply)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {['Paid','Gifted Product','Equity','Barter','Revenue Share','Ambassador','Licensing'].map(d => {
                          const active = activeProfileDealTypes.includes(d);
                          return (
                            <span key={d} onClick={() => setActiveProfileDealTypes(prev => active ? prev.filter(x => x !== d) : [...prev, d])}
                              style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '11px',
                                background: active ? `${withAlpha(C.primary, 0x20)}` : C.bg,
                                border: `1px solid ${active ? C.primary : C.border}`,
                                color: active ? C.primary : C.textSecondary,
                                cursor: 'pointer', fontWeight: active ? 600 : 400,
                                transition: 'all 0.15s',
                              }}>{d}</span>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Min Deal (USD)</div><input type="number" placeholder="500" style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} /></div>
                      <div><div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Response Time (hrs)</div><input type="number" placeholder="24" style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} /></div>
                    </div>
                    {([
                      ['Open to exclusivity', profileExclusivity, (v: boolean) => setProfileExclusivity(v)] as const,
                      ['Willing to sign NDA', profileNda, (v: boolean) => setProfileNda(v)] as const,
                      ['Grant usage rights', profileUsageRights, (v: boolean) => setProfileUsageRights(v)] as const,
                      ['On-camera willing', profileOnCamera, (v: boolean) => setProfileOnCamera(v)] as const,
                    ]).map(([lbl, val, setter]) => (
                      <div key={lbl} onClick={() => setter(!val)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: `1px solid ${C.border}`, cursor: 'pointer' }}>
                        <span style={{ fontSize: '12px', color: C.text }}>{lbl}</span>
                        <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: val ? C.primary : C.border, position: 'relative', transition: 'background 0.2s' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: val ? '18px' : '2px', transition: 'left 0.2s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── SKIN SHOWCASE ── */}
          {(() => {
            const open = creatorSettingsOpen === 'showcase';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(open ? null : 'showcase')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Skin Showcase</span>
                    {creatorSkinMode === 'showcase' && <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: C.primary, padding: '1px 6px', borderRadius: '8px' }}>LIVE</span>}
                  </div>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                </button>
                {open && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '10px', lineHeight: 1.5 }}>
                      When showcase mode is on, brands see your video pitch and bio when they click your ValueSkin on your profile.
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      <button onClick={() => setCreatorSkinMode('static')} style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: creatorSkinMode === 'static' ? C.primary : C.bg, color: creatorSkinMode === 'static' ? '#fff' : C.textSecondary, border: `1px solid ${creatorSkinMode === 'static' ? C.primary : C.border}` }}>Static</button>
                      <button onClick={() => setCreatorSkinMode('showcase')} style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: creatorSkinMode === 'showcase' ? C.primary : C.bg, color: creatorSkinMode === 'showcase' ? '#fff' : C.textSecondary, border: `1px solid ${creatorSkinMode === 'showcase' ? C.primary : C.border}` }}>Showcase</button>
                    </div>
                    {creatorSkinMode === 'showcase' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {ownedSkinsList.length === 0 ? (
                          <div style={{ fontSize: '12px', color: C.textMuted, textAlign: 'center', padding: '16px' }}>Get a ValueSkin to add your pitch</div>
                        ) : ownedSkinsList.map(skinName => {
                          const hasPitch = activeSkinPitchTexts[skinName] || activeSkinPitchVideos[skinName]?.url;
                          const badge = role === 'brand' ? (BRAND_CATEGORY_BADGES[skinName] ?? PROFESSION_BADGES[skinName]) : PROFESSION_BADGES[skinName];
                          return (
                            <div key={skinName} onClick={() => setShowSkinShowcaseModal(skinName)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                              {getStickerForProfession(skinName) ? (
                                <img src={getStickerForProfession(skinName)!} alt={skinName} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                              ) : (
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `${badge?.color ?? C.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: badge?.color ?? C.primary }}>{badge?.abbreviation ?? '?'}</div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{skinName}</div>
                                <div style={{ fontSize: '10px', color: hasPitch ? C.success : C.textMuted }}>{hasPitch ? 'Pitch added' : 'No pitch yet'}</div>
                              </div>
                              <span style={{ fontSize: '11px', color: C.primary, fontWeight: 600 }}>{hasPitch ? 'Edit' : 'Add'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── INBOX & SAFETY ── */}
          <div style={{ marginBottom: '16px' }}>
            <button onClick={() => setCreatorShowSafetySettings(p => !p)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: creatorShowSafetySettings ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Inbox & Safety</span>
              </div>
              <span style={{ fontSize: '14px', color: C.textMuted }}>{creatorShowSafetySettings ? '\u25B2' : '\u25BC'}</span>
            </button>
            {creatorShowSafetySettings && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Only accept proposals from these brand niches</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {['Tech', 'Fashion', 'Finance', 'Health', 'Food', 'Gaming', 'Travel', 'Beauty', 'Fitness', 'Education'].map(n => {
                      const active = creatorAllowedNiches.includes(n);
                      return (
                        <button key={n} onClick={() => setCreatorAllowedNiches(prev => active ? prev.filter(x => x !== n) : [...prev, n])}
                          style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
                            background: active ? `${withAlpha(C.primary, 0x20)}` : C.bg,
                            color: active ? C.primary : C.textSecondary,
                            border: `1px solid ${active ? C.primary : C.border}`,
                          }}>{n}</button>
                      );
                    })}
                  </div>
                  {creatorAllowedNiches.length === 0 && (
                    <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '4px' }}>None selected = all niches allowed</div>
                  )}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Blocked Brands</div>
                  {creatorBlockedBrands.length === 0 ? (
                    <div style={{ fontSize: '11px', color: C.textMuted, padding: '8px', background: C.bg, borderRadius: '7px', textAlign: 'center' }}>No brands blocked</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {creatorBlockedBrands.map(b => (
                        <span key={b} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', background: 'rgba(239,68,68,0.1)', color: C.textMuted, border: '1px solid rgba(239,68,68,0.2)' }}>
                          {b}
                          <button onClick={() => setCreatorBlockedBrands(prev => prev.filter(x => x !== b))} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: 1 }}>x</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { const name = prompt('Block brand name:'); if (name?.trim()) setCreatorBlockedBrands(prev => [...prev, name.trim()]); }}
                    style={{ marginTop: '6px', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer' }}>
                    + Block a brand
                  </button>
                </div>
                <div style={{ marginTop: '12px', padding: '9px 11px', background: 'rgba(0,102,204,0.05)', borderRadius: '7px', fontSize: '10px', color: C.textSecondary, lineHeight: 1.6 }}>
                  Platform-level limits set by Meta also apply and cannot be turned off by you. These are your <em>personal</em> controls on top.
                </div>
              </div>
            )}
          </div>

          {/* ── RATE CARD ── */}
          {adminShowRateCard && (() => {
            const open = creatorSettingsOpen === 'ratecard';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(open ? null : 'ratecard')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Rate Card</span>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                </button>
                {open && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ fontSize: '10px', color: C.textSecondary, marginBottom: '10px' }}>Set your price per content format. These are shown to brands before they send a proposal.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      {(Object.keys(activeRateCard) as Array<keyof typeof activeRateCard>).map(fmt => (
                        <div key={fmt}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'capitalize' }}>{fmt}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ color: C.textSecondary, fontSize: '12px' }}>$</span>
                            <input type="number" value={activeRateCard[fmt]} onChange={e => setActiveRateCard(prev => ({ ...prev, [fmt]: e.target.value }))}
                              style={{ width: '100%', padding: '6px 7px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Contract Mode</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {(['one-off', 'long-term', 'both'] as const).map(m => (
                            <button key={m} onClick={() => setContractMode(m)} style={{ flex: 1, padding: '5px 3px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                              background: contractMode === m ? `${withAlpha(C.primary, 0x20)}` : C.bg, color: contractMode === m ? C.primary : C.textSecondary, border: `1px solid ${contractMode === m ? C.primary : C.border}` }}>{m}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Max Active Deals</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => setCreatorMaxActiveDeals(Math.max(1, creatorMaxActiveDeals - 1))} style={{ width: '24px', height: '24px', borderRadius: '4px', border: `1px solid ${C.border}`, background: C.bg, color: C.text, cursor: 'pointer', fontWeight: 700 }}>-</button>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: C.primary, minWidth: '20px', textAlign: 'center' }}>{creatorMaxActiveDeals}</span>
                          <button onClick={() => setCreatorMaxActiveDeals(Math.min(20, creatorMaxActiveDeals + 1))} style={{ width: '24px', height: '24px', borderRadius: '4px', border: `1px solid ${C.border}`, background: C.bg, color: C.text, cursor: 'pointer', fontWeight: 700 }}>+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── AVAILABILITY CALENDAR ── */}
          {adminShowAvailabilityCalendar && (() => {
            const open = creatorSettingsOpen === 'availability';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(open ? null : 'availability')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Availability Calendar</span>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                </button>
                {open && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Available for new deals from</div>
                      <input type="date" value={activeCreatorAvailableFrom} onChange={e => setActiveCreatorAvailableFrom(e.target.value)}
                        style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>Open to first-deal (discounted collab)</div>
                        <div style={{ fontSize: '10px', color: C.textSecondary }}>Badge shown to brands  signals you'll do a discounted first collab to build your record</div>
                      </div>
                      <button onClick={() => setIsFirstDealOpen(p => !p)} style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', backgroundColor: isFirstDealOpen ? C.primary : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background-color 0.2s' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '2px', left: isFirstDealOpen ? '20px' : '2px', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── DEAL STRUCTURE DEFAULTS ── */}
          {(() => {
            const open = creatorSettingsOpen === 'dealstructure';
            return (
              <div style={{ marginBottom: '16px' }}>
                <button onClick={() => setCreatorSettingsOpen(open ? null : 'dealstructure')} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: open ? '10px 10px 0 0' : '10px', padding: '12px 14px', cursor: 'pointer', color: C.text }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: C.textMuted }}>Deal Structure Defaults</span>
                  <span style={{ fontSize: '14px', color: C.textMuted }}>{open ? '\u25B2' : '\u25BC'}</span>
                </button>
                {open && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Revision Limit</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button onClick={() => setRevisionLimit(Math.max(0, revisionLimit - 1))} style={{ width: '24px', height: '24px', borderRadius: '4px', border: `1px solid ${C.border}`, background: C.bg, color: C.text, cursor: 'pointer', fontWeight: 700 }}>-</button>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: C.primary, minWidth: '20px', textAlign: 'center' }}>{revisionLimit}</span>
                          <button onClick={() => setRevisionLimit(Math.min(10, revisionLimit + 1))} style={{ width: '24px', height: '24px', borderRadius: '4px', border: `1px solid ${C.border}`, background: C.bg, color: C.text, cursor: 'pointer', fontWeight: 700 }}>+</button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Usage Rights (days)</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[30, 60, 90, 180].map(d => (
                            <button key={d} onClick={() => setUsageRightsDays(d)} style={{ flex: 1, padding: '5px 2px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                              background: usageRightsDays === d ? `${withAlpha(C.primary, 0x20)}` : C.bg, color: usageRightsDays === d ? C.primary : C.textMuted, border: `1px solid ${usageRightsDays === d ? C.primary : C.border}` }}>{d}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Exclusivity locked until</div>
                      <input type="date" value={exclusivityUntil} onChange={e => setExclusivityUntil(e.target.value)} placeholder="Leave blank if not exclusive"
                        style={{ width: '100%', padding: '7px 9px', background: C.bg, border: `1px solid ${exclusivityUntil ? C.textMuted : C.border}`, borderRadius: '7px', color: C.text, fontSize: '12px', boxSizing: 'border-box' as const }} />
                      {exclusivityUntil && <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '3px' }}>Brands will see &quot;Exclusivity taken until {exclusivityUntil}&quot;</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Info bar */}
          <div style={{ padding: '14px', background: 'rgba(0,102,204,0.06)', borderRadius: '10px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: C.textSecondary, lineHeight: 1.5 }}>
              Settings are synced to your profile and marketplace presence. Changes take effect immediately.
            </div>
          </div>

          {/* Profile Completeness */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Profile Completeness
            </div>
            {(() => {
              const hasAvatar = true;
              const hasBio = true;
              const hasValueSkin = Object.values(valueSkins).some(Boolean);
              const hasDealPrefs = activeProfileDealTypes.length > 0;
              const hasCredential = false;
              const hasTestimonial = false;
              const hasBarterPref = true;
              const hasEnergy = Boolean(activeCreatorEnergy);
              const score =
                (hasAvatar ? 15 : 0) + (hasBio ? 15 : 0) + (hasValueSkin ? 20 : 0) +
                (hasDealPrefs ? 10 : 0) + (hasCredential ? 15 : 0) + (hasTestimonial ? 15 : 0) +
                (hasBarterPref ? 5 : 0) + (hasEnergy ? 5 : 0);
              const tier = score >= 90 ? 'Elite' : score >= 70 ? 'Established' : score >= 40 ? 'Developing' : 'Incomplete';
              const tierColor = score >= 90 ? '#f59e0b' : score >= 70 ? '#22c55e' : score >= 40 ? C.primary : C.textMuted;
              const items = [
                { label: 'Avatar', done: hasAvatar, pts: 15 },
                { label: 'Bio', done: hasBio, pts: 15 },
                { label: 'ValueSkin', done: hasValueSkin, pts: 20 },
                { label: 'Deal Preferences', done: hasDealPrefs, pts: 10 },
                { label: 'Credential', done: hasCredential, pts: 15 },
                { label: 'Testimonial', done: hasTestimonial, pts: 15 },
                { label: 'Barter Pref', done: hasBarterPref, pts: 5 },
                { label: 'Availability', done: hasEnergy, pts: 5 },
              ];
              return (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: tierColor }}>{score}<span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>/100</span></div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: tierColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tier}</div>
                    </div>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `conic-gradient(${tierColor} ${score * 3.6}deg, ${C.border} 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: tierColor }}>{score}</div>
                    </div>
                  </div>
                  <div style={{ height: '4px', background: C.border, borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: tierColor, borderRadius: '2px', transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {items.map(({ label, done, pts }) => (
                      <div key={label} style={{ padding: '6px 4px', background: done ? 'rgba(34,197,94,0.08)' : C.surfaceAlt, borderRadius: '6px', textAlign: 'center', border: `1px solid ${done ? 'rgba(34,197,94,0.25)' : C.border}` }}>
                        <div style={{ fontSize: '14px', marginBottom: '2px' }}>{done ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,7 5.5,10.5 12,3.5"/></svg> : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={C.textMuted} strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/></svg>}</div>
                        <div style={{ fontSize: '9px', fontWeight: 600, color: done ? '#22c55e' : C.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
                        <div style={{ fontSize: '9px', color: C.textMuted }}>+{pts}pt</div>
                      </div>
                    ))}
                  </div>
                  {!hasCredential && (
                    <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '11px', color: '#f59e0b' }}>
                      Next: Link a credential (LinkedIn/Twitter) to earn +15 pts
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Portfolio Image */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Why Brands Should Hire You
            </div>
            {activePortfolioImage ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '200px', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={activePortfolioImage} alt="Portfolio" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt: any) => setActivePortfolioImage(evt.target.result);
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  >
                    Change Photo
                  </button>
                  <button
                    onClick={() => setActivePortfolioImage(null)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: `${withAlpha(C.danger, 0x15)}`, border: `1px solid ${withAlpha(C.danger, 0x40)}`, color: C.danger }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '12px' }}>
                  Upload a photo showing why brands should hire you. This appears on your creator profile.
                </div>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt: any) => setActivePortfolioImage(evt.target.result);
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: C.primary, border: 'none', color: C.onPrimary }}
                >
                  Upload Photo
                </button>
              </div>
            )}
          </div>

        </>)}
        {/* ── END CREATOR-ONLY SETTINGS ── */}

        {/* Privacy & Data Controls */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
            Privacy & Data Controls
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
            {[
              { label: 'Download My Data', sub: 'Export all your data in JSON format', action: () => alert('Data export initiated — you will receive an email with download link within 24 hours'), color: C.primary, icon: 'DL' },
              { label: 'Request Data Deletion', sub: 'Permanently erase your account (GDPR Art. 17) — 30 day process', action: () => alert('Data deletion request submitted.\n\nYour account will be anonymized within 30 days as required by GDPR.\nYou can cancel this request within 24 hours.'), color: C.textMuted, icon: 'DEL' },
            ].map(({ label, sub, action, color, icon }, i) => (
              <div
                key={label}
                onClick={action}
                style={{
                  padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                  borderBottom: i === 0 ? `1px solid ${C.border}` : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</div>
                  <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '1px' }}>{sub}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Showcase Modal ── */}
      {showSkinShowcaseModal && (
        <Modal onClose={() => setShowSkinShowcaseModal(null)}>
          {(() => {
            const skinBadge = role === 'brand' ? (BRAND_CATEGORY_BADGES[showSkinShowcaseModal] ?? PROFESSION_BADGES[showSkinShowcaseModal]) : PROFESSION_BADGES[showSkinShowcaseModal];
            const skinColor = skinBadge?.color ?? C.primary;
            const skinLevel = getLevel(metrics.dealsCompleted);
            const skinProgress = getProgressToNext(metrics.dealsCompleted);
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  {getStickerForProfession(showSkinShowcaseModal) ? (
                    <img src={getStickerForProfession(showSkinShowcaseModal)!} alt={showSkinShowcaseModal} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${skinColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: skinColor }}>{skinBadge?.abbreviation ?? '?'}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{showSkinShowcaseModal}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: skinColor }}>Level {skinLevel}</span>
                      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: C.border, overflow: 'hidden', maxWidth: '120px' }}>
                        <div style={{ width: `${skinProgress}%`, height: '100%', background: skinColor, borderRadius: '2px', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '10px', color: C.textMuted }}>{metrics.dealsCompleted} deals</span>
                    </div>
                  </div>
                </div>
                {ownedSkins.length === 1 && (
                  <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '12px', padding: '6px 10px', background: C.surfaceAlt, borderRadius: '6px' }}>
                    Followers contribute to XP with a single skin equipped
                  </div>
                )}
              </>
            );
          })()}
          <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '20px' }}>Brands see this when they click your ValueSkin. Tell them why they should collab with you.</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setCreatorSkinMode('static')} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: creatorSkinMode === 'static' ? C.primary : C.bg, color: creatorSkinMode === 'static' ? '#fff' : C.textSecondary, border: `1px solid ${creatorSkinMode === 'static' ? C.primary : C.border}` }}>
              Static Skin
            </button>
            <button onClick={() => setCreatorSkinMode('showcase')} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: creatorSkinMode === 'showcase' ? C.primary : C.bg, color: creatorSkinMode === 'showcase' ? '#fff' : C.textSecondary, border: `1px solid ${creatorSkinMode === 'showcase' ? C.primary : C.border}` }}>
              Showcase Mode
            </button>
          </div>

          {creatorSkinMode === 'static' && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: C.textMuted, fontSize: 13 }}>
              Your ValueSkin displays as a standard badge. Switch to Showcase to add a video pitch and bio.
            </div>
          )}

          {creatorSkinMode === 'showcase' && (
            <>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Pitch Text</div>
                <textarea
                  value={creatorPitchText}
                  onChange={e => setCreatorPitchText(e.target.value)}
                  placeholder="Tell brands why they should work with you..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }}
                />
              </div>
              <button onClick={() => { setShowSkinShowcaseModal(null); setPurchaseToast(creatorSkinMode === 'showcase' ? 'Showcase saved — brands will see your pitch' : 'Skin set to static'); setTimeout(() => setPurchaseToast(null), 3000); }} style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 8, padding: '12px', color: C.onPrimary, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
                Save Skin Showcase
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
