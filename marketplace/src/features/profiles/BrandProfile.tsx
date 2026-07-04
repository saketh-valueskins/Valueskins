'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const C = {
  bg: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceAlt: '#2D2D2D',
  text: '#F5F5F0',
  textMuted: '#B8B4AC',
  primary: '#C8B89A',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#2D2D2D',
};

interface BrandProfileData {
  display_name: string;
  username: string;
  bio: string;
  location: string;
  country: string;
  niche: string;
  website: string;
  instagram_handle: string;
  tiktok_handle: string;
  twitter_handle: string;
  linkedin_handle: string;
  open_for_work: boolean;
  min_deal_value: number;
  preferred_deal_types: string[];
  availability: string;
  response_time: string;
  pitch_text: string;
  languages: string[];
  followers_count: number;
  engagement_rate: number;
}

const initialData: BrandProfileData = {
  display_name: '',
  username: '',
  bio: '',
  location: '',
  country: '',
  niche: '',
  website: '',
  instagram_handle: '',
  tiktok_handle: '',
  twitter_handle: '',
  linkedin_handle: '',
  open_for_work: true,
  min_deal_value: 500,
  preferred_deal_types: ['paid'],
  availability: 'available',
  response_time: '24',
  pitch_text: '',
  languages: [],
  followers_count: 0,
  engagement_rate: 0,
};

type EditSection = null | 'identity' | 'social' | 'pitch' | 'marketplace';

export default function BrandProfile() {
  const router = useRouter();
  const { account } = useAuth();
  const [profile, setProfile] = useState<BrandProfileData>(initialData);
  const [editing, setEditing] = useState<EditSection>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (account) {
      setProfile(prev => ({
        ...prev,
        display_name: account.display_name || prev.display_name,
      }));
      fetchProfile();
    }
  }, [account]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile/creator', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProfile({ ...initialData, ...data });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/creator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || 'Failed to save');
        return;
      }

      setMessage('Profile saved successfully');
      setEditing(null);
      setTimeout(() => setMessage(''), 2000);
    } catch (err: any) {
      setMessage(err.message || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (!account) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <div>Loading...</div>
      </div>
    );
  }

  const completionPercentage = Math.round(
    ((profile.display_name ? 1 : 0) +
      (profile.bio ? 1 : 0) +
      (profile.location ? 1 : 0) +
      (profile.website ? 1 : 0) +
      (profile.niche ? 1 : 0) +
      (profile.pitch_text ? 1 : 0)) /
      6 *
      100
  );

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${C.bg} 0%, #111827 100%)`, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {message && (
          <div style={{ padding: '12px 16px', background: message.includes('success') ? `${C.success}20` : `${C.danger}20`, border: `1px solid ${message.includes('success') ? C.success : C.danger}`, borderRadius: '8px', color: message.includes('success') ? C.success : C.danger, marginBottom: '20px', fontSize: '14px' }}>
            {message}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>Brand Profile</h1>
            <button
              onClick={() => router.push('/')}
              style={{ padding: '10px 20px', background: 'transparent', color: C.primary, border: `1px solid ${C.primary}`, borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Back
            </button>
          </div>

          <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '12px' }}>
            Manage your brand profile — this is what creators see when you reach out.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '10px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '13px' }}>
              Profile Completion: <strong>{completionPercentage}%</strong>
            </div>
          </div>
        </div>

        {/* Identity Section */}
        <Section title="Brand Identity" isOpen={editing === 'identity'} onToggle={() => setEditing(editing === 'identity' ? null : 'identity')}>
          {editing !== 'identity' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Company Name</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.display_name || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Username</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>@{profile.username || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Industry</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.niche || 'Not specified'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Location</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.location ? `${profile.location}, ${profile.country}` : 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Website</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.website || 'Not set'}</div>
              </div>
            </div>
          ) : (
            <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <InputField label="Company Name" value={profile.display_name} onChange={v => setProfile({ ...profile, display_name: v })} placeholder="What's the name of your brand or business?" />
              <InputField label="Username" value={profile.username} onChange={v => setProfile({ ...profile, username: v })} placeholder="Pick a @username creators can use to tag your brand" />
              <InputField label="Industry" value={profile.niche} onChange={v => setProfile({ ...profile, niche: v })} placeholder="What industry does your brand operate in? (e.g., beauty, fashion, tech, DTC, food, fitness)" />
              <InputField label="City" value={profile.location} onChange={v => setProfile({ ...profile, location: v })} placeholder="Where is your brand headquartered or where is your target market?" />
              <InputField label="Country" value={profile.country} onChange={v => setProfile({ ...profile, country: v })} placeholder="Which country does your brand primarily serve?" />
              <InputField label="Website" value={profile.website} onChange={v => setProfile({ ...profile, website: v })} placeholder="What's your brand's website URL?" type="url" />
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>About the Brand</label>
                <textarea
                  value={profile.bio}
                  onChange={e => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell creators about your brand's mission, products, and what makes you a great brand to partner with. Describe your target audience, brand voice, and the kind of creator content that resonates with your customers."
                  style={{ width: '100%', padding: '12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, minHeight: '100px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>

        {/* Social Section */}
        <Section title="Social Presence" isOpen={editing === 'social'} onToggle={() => setEditing(editing === 'social' ? null : 'social')}>
          {editing !== 'social' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <StatBox label="Followers" value={`${(profile.followers_count / 1000).toFixed(1)}K`} />
              {profile.instagram_handle && <SocialHandle platform="Instagram" handle={profile.instagram_handle} />}
              {profile.tiktok_handle && <SocialHandle platform="TikTok" handle={profile.tiktok_handle} />}
              {profile.twitter_handle && <SocialHandle platform="Twitter / X" handle={profile.twitter_handle} />}
              {profile.linkedin_handle && <SocialHandle platform="LinkedIn" handle={profile.linkedin_handle} />}
              {profile.website && (
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Website</div>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontSize: '14px', fontWeight: 600, textDecoration: 'none', wordBreak: 'break-all' }}>
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <InputField type="number" label="Follower Count" value={String(profile.followers_count)} onChange={v => setProfile({ ...profile, followers_count: parseInt(v) || 0 })} placeholder="How many followers does your brand have across all social channels?" />
              <InputField label="Instagram Handle" value={profile.instagram_handle} onChange={v => setProfile({ ...profile, instagram_handle: v })} placeholder="Your brand's Instagram @ — creators research brand presence before applying" />
              <InputField label="TikTok Handle" value={profile.tiktok_handle} onChange={v => setProfile({ ...profile, tiktok_handle: v })} placeholder="Your brand's TikTok @ — a strong presence here signals you understand short-form content" />
              <InputField label="Twitter/X Handle" value={profile.twitter_handle} onChange={v => setProfile({ ...profile, twitter_handle: v })} placeholder="Your brand's X/Twitter @ for campaign announcements and conversations" />
              <InputField label="LinkedIn Profile" value={profile.linkedin_handle} onChange={v => setProfile({ ...profile, linkedin_handle: v })} placeholder="Your brand's LinkedIn URL — creators look for established, professional companies" />
              <InputField label="Website" value={profile.website} onChange={v => setProfile({ ...profile, website: v })} placeholder="What's your brand's website URL?" type="url" />
              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>

        {/* Pitch Section */}
        <Section title="What We're Looking For" isOpen={editing === 'pitch'} onToggle={() => setEditing(editing === 'pitch' ? null : 'pitch')}>
          {editing !== 'pitch' ? (
            <div>
              {profile.pitch_text && (
                <div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Brand Brief</div>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{profile.pitch_text}</div>
                </div>
              )}
              {!profile.pitch_text && <div style={{ color: C.textMuted }}>No brief added yet. Describe what kind of creators and partnerships you're looking for.</div>}
            </div>
          ) : (
            <form>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Brand Brief</label>
                <textarea
                  value={profile.pitch_text}
                  onChange={e => setProfile({ ...profile, pitch_text: e.target.value })}
                  placeholder="Describe your ideal creator collaboration. What are your campaign goals? What audience are you trying to reach? What's your typical budget range per creator? What type of content do you need (posts, stories, videos)? Are you looking for one-off or long-term ambassadorships? The more detail you share, the better creators can pitch themselves to you."
                  style={{ width: '100%', padding: '12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, minHeight: '120px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>

        {/* Marketplace Section */}
        <Section title="Partnership Settings" isOpen={editing === 'marketplace'} onToggle={() => setEditing(editing === 'marketplace' ? null : 'marketplace')}>
          {editing !== 'marketplace' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Status</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: profile.open_for_work ? C.success : C.danger }}>
                  {profile.open_for_work ? 'Looking for Creators' : 'Not Currently Hiring'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Budget Range</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>${profile.min_deal_value}+</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Response Time</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.response_time} hours</div>
              </div>
            </div>
          ) : (
            <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={profile.open_for_work}
                  onChange={e => setProfile({ ...profile, open_for_work: e.target.checked })}
                />
                <span style={{ fontSize: '14px' }}>Looking for creators</span>
              </label>

              <InputField type="number" label="Minimum Budget ($)" value={String(profile.min_deal_value)} onChange={v => setProfile({ ...profile, min_deal_value: parseInt(v) || 500 })} placeholder="What's the minimum budget per creator collaboration you're working with?" />

              <InputField type="number" label="Typical Response Time (hours)" value={String(profile.response_time)} onChange={v => setProfile({ ...profile, response_time: v })} placeholder="How quickly do you respond to creator applications and pitches?" />

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Preferred Deal Types</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['paid', 'barter', 'equity', 'ambassador'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const updated = profile.preferred_deal_types.includes(type)
                          ? profile.preferred_deal_types.filter(t => t !== type)
                          : [...profile.preferred_deal_types, type];
                        setProfile({ ...profile, preferred_deal_types: updated });
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: `2px solid ${profile.preferred_deal_types.includes(type) ? C.primary : C.border}`,
                        background: profile.preferred_deal_types.includes(type) ? `${C.primary}20` : 'transparent',
                        color: profile.preferred_deal_types.includes(type) ? C.primary : C.textMuted,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, isOpen, onToggle, canEdit = true, children }: { title: string; isOpen: boolean; onToggle: () => void; canEdit?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: C.text }}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canEdit && <span style={{ fontSize: '12px', color: C.textMuted }}>Edit</span>}
          <span style={{ fontSize: '20px', color: C.textMuted, transform: `rotate(${isOpen ? 180 : 0}deg)`, transition: 'transform 0.3s' }}>-</span>
        </div>
      </button>
      {isOpen && <div style={{ padding: '20px', paddingTop: 0, borderTop: `1px solid ${C.border}` }}>{children}</div>}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '14px', boxSizing: 'border-box' }}
      />
    </label>
  );
}

function StatBox({ label, value, color = C.primary }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function SocialHandle({ platform, handle }: { platform: string; handle: string }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px' }}>
      <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>{platform}</div>
      <div style={{ fontSize: '14px', fontWeight: 600 }}>@{handle}</div>
    </div>
  );
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '12px 24px',
        background: C.primary,
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        fontSize: '14px',
      }}
    >
      {loading ? 'Saving...' : 'Save Changes'}
    </button>
  );
}
