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
  languages: string[];
  niche: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  linkedin: string;
  website: string;
  followers_count: number;
  engagement_rate: number;
  pitch_text: string;
  open_for_work: boolean;
  min_deal_value: number;
  preferred_deal_types: string[];
  availability: string;
  response_time: string;
  verified: boolean;
}

const initialData: BrandProfileData = {
  display_name: '',
  username: '',
  bio: '',
  location: '',
  country: '',
  languages: [],
  niche: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  twitter: '',
  linkedin: '',
  website: '',
  followers_count: 0,
  engagement_rate: 0,
  pitch_text: '',
  open_for_work: true,
  min_deal_value: 500,
  preferred_deal_types: ['paid'],
  availability: 'available',
  response_time: '24',
  verified: false,
};

type EditSection = null | 'identity' | 'social' | 'pitch' | 'marketplace';

const InputField = ({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
    />
  </div>
);

const SaveButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
  <button
    onClick={onClick}
    disabled={loading}
    style={{ padding: '12px 24px', background: C.primary, color: C.bg, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, gridColumn: '1 / -1' }}
  >
    {loading ? 'Saving...' : 'Save Changes'}
  </button>
);

const Section = ({ title, isOpen, onToggle, children }: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
    <button
      onClick={onToggle}
      style={{ width: '100%', padding: '16px', background: 'transparent', border: 'none', color: C.text, fontSize: '16px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      {title}
      <span style={{ fontSize: '20px' }}>{isOpen ? '−' : '+'}</span>
    </button>
    {isOpen && <div style={{ padding: '16px', borderTop: `1px solid ${C.border}` }}>{children}</div>}
  </div>
);

const StatBox = ({ label, value, color = C.primary }: { label: string; value: string; color?: string }) => (
  <div style={{ padding: '12px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', textAlign: 'center' }}>
    <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</div>
  </div>
);

const SocialHandle = ({ platform, handle }: { platform: string; handle: string }) => (
  <div style={{ padding: '12px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px' }}>
    <div style={{ color: C.textMuted, fontSize: '11px', marginBottom: '2px' }}>{platform}</div>
    <div style={{ color: C.text, fontWeight: 600 }}>@{handle}</div>
  </div>
);

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
        display_name: account.display_name || prev.display_name
      }));
      fetchProfile();
    }
  }, [account]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile/brand', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const mapped = {
          ...initialData,
          ...data,
          instagram: data.instagram_handle || data.instagram || '',
          tiktok: data.tiktok_handle || data.tiktok || '',
          youtube: data.youtube_handle || data.youtube || '',
          twitter: data.twitter_handle || data.twitter || '',
          linkedin: data.linkedin_handle || data.linkedin || '',
        };
        setProfile(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/brand', {
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

  const missingFields = [
    { label: 'Name', done: !!profile.display_name },
    { label: 'Bio', done: !!profile.bio },
    { label: 'Location', done: !!profile.location },
    { label: 'A social handle', done: !!(profile.instagram || profile.tiktok || profile.youtube || profile.twitter || profile.linkedin) },
    { label: 'Your pitch', done: !!profile.pitch_text },
  ].filter((f) => !f.done).map((f) => f.label);

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${C.bg} 0%, #111827 100%)`, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {message && (
          <div style={{ padding: '12px 16px', background: message.includes('success') ? `${C.success}20` : `${C.danger}20`, border: `1px solid ${message.includes('success') ? C.success : C.danger}`, borderRadius: '8px', color: message.includes('success') ? C.success : C.danger, marginBottom: '20px', fontSize: '14px' }}>
            {message}
          </div>
        )}

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

          {profile.verified && <div style={{ padding: '10px 16px', background: `${C.success}20`, border: `1px solid ${C.success}`, borderRadius: '8px', color: C.success, fontSize: '13px', fontWeight: 600, display: 'inline-block', marginBottom: '16px' }}>Verified</div>}

          {missingFields.length > 0 ? (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: `${C.warning}14`, border: `1px solid ${C.warning}`, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: C.warning, fontWeight: 600 }}>Still missing:</span>
              {missingFields.map((label) => (
                <span key={label} style={{ fontSize: '12px', color: C.warning, background: `${C.warning}22`, border: `1px solid ${C.warning}55`, borderRadius: '20px', padding: '3px 10px', fontWeight: 500 }}>
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: `${C.success}14`, border: `1px solid ${C.success}`, borderRadius: '8px', fontSize: '13px', color: C.success, fontWeight: 600 }}>
              Your profile is complete. Nothing left to add.
            </div>
          )}
        </div>

        <Section title="Identity" isOpen={editing === 'identity'} onToggle={() => setEditing(editing === 'identity' ? null : 'identity')}>
          {editing !== 'identity' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Name</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.display_name || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Username</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>@{profile.username || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Niche</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.niche || 'Not specified'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Location</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.location ? `${profile.location}, ${profile.country}` : 'Not set'}</div>
              </div>
            </div>
          ) : (
            <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <InputField label="Brand Name" value={profile.display_name} onChange={v => setProfile({ ...profile, display_name: v })} />
              <InputField label="Username" value={profile.username} onChange={v => setProfile({ ...profile, username: v })} placeholder="no spaces" />
              <InputField label="Industry (e.g., Tech, Fashion, Fitness)" value={profile.niche} onChange={v => setProfile({ ...profile, niche: v })} />
              <InputField label="City" value={profile.location} onChange={v => setProfile({ ...profile, location: v })} />
              <InputField label="Country" value={profile.country} onChange={v => setProfile({ ...profile, country: v })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>About Your Brand</label>
                <textarea
                  value={profile.bio}
                  onChange={e => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell creators about your brand, what you do, and why they should work with you"
                  style={{ width: '100%', padding: '12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, minHeight: '100px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>

        <Section title="Social & Web" isOpen={editing === 'social'} onToggle={() => setEditing(editing === 'social' ? null : 'social')}>
          {editing !== 'social' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <StatBox label="Followers" value={`${(profile.followers_count / 1000).toFixed(1)}K`} />
              <StatBox label="Engagement" value={`${profile.engagement_rate}%`} />
              {profile.instagram && <SocialHandle platform="Instagram" handle={profile.instagram} />}
              {profile.tiktok && <SocialHandle platform="TikTok" handle={profile.tiktok} />}
              {profile.youtube && <SocialHandle platform="YouTube" handle={profile.youtube} />}
            </div>
          ) : (
            <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <InputField type="number" label="Follower Count" value={String(profile.followers_count)} onChange={v => setProfile({ ...profile, followers_count: parseInt(v) || 0 })} />
              <InputField type="number" label="Engagement Rate (%)" value={String(profile.engagement_rate)} onChange={v => setProfile({ ...profile, engagement_rate: parseInt(v) || 0 })} />
              <InputField label="Instagram Handle" value={profile.instagram} onChange={v => setProfile({ ...profile, instagram: v })} placeholder="username (no @)" />
              <InputField label="TikTok Handle" value={profile.tiktok} onChange={v => setProfile({ ...profile, tiktok: v })} placeholder="username (no @)" />
              <InputField label="YouTube Channel" value={profile.youtube} onChange={v => setProfile({ ...profile, youtube: v })} placeholder="channel name" />
              <InputField label="Twitter/X Handle" value={profile.twitter} onChange={v => setProfile({ ...profile, twitter: v })} placeholder="username (no @)" />
              <InputField label="LinkedIn Profile" value={profile.linkedin} onChange={v => setProfile({ ...profile, linkedin: v })} placeholder="username" />
              <InputField label="Website" value={profile.website} onChange={v => setProfile({ ...profile, website: v })} placeholder="https://..." type="url" />
              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>

        <Section title="Pitch" isOpen={editing === 'pitch'} onToggle={() => setEditing(editing === 'pitch' ? null : 'pitch')}>
          {editing !== 'pitch' ? (
            <div>
              {profile.pitch_text && (
                <div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>Your Pitch</div>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>{profile.pitch_text}</div>
                </div>
              )}
              {!profile.pitch_text && <div style={{ color: C.textMuted }}>No pitch added yet. Add a message explaining why creators should collaborate with your brand.</div>}
            </div>
          ) : (
            <form style={{ display: 'grid', gridTemplateColumns: '1 / -1', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Pitch</label>
                <textarea
                  value={profile.pitch_text}
                  onChange={e => setProfile({ ...profile, pitch_text: e.target.value })}
                  placeholder="Tell creators why they should work with your brand, what kind of collaborations you're looking for..."
                  style={{ width: '100%', padding: '12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, minHeight: '100px', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '14px' }}
                />
              </div>
              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>

        <Section title="Marketplace Settings" isOpen={editing === 'marketplace'} onToggle={() => setEditing(editing === 'marketplace' ? null : 'marketplace')}>
          {editing !== 'marketplace' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <StatBox label="Open for Work" value={profile.open_for_work ? 'Yes' : 'No'} color={profile.open_for_work ? C.success : C.warning} />
              <StatBox label="Min. Deal Value" value={`$${profile.min_deal_value}`} />
              <StatBox label="Availability" value={profile.availability === 'available' ? 'Available' : 'Limited'} />
              <StatBox label="Response Time" value={`${profile.response_time}h`} />
            </div>
          ) : (
            <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Open for Collaborations</label>
                <select value={profile.open_for_work ? 'yes' : 'no'} onChange={e => setProfile({ ...profile, open_for_work: e.target.value === 'yes' })} style={{ padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <InputField type="number" label="Minimum Deal Value ($)" value={String(profile.min_deal_value)} onChange={v => setProfile({ ...profile, min_deal_value: parseInt(v) || 500 })} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '12px', color: C.textMuted, marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Availability</label>
                <select value={profile.availability} onChange={e => setProfile({ ...profile, availability: e.target.value })} style={{ padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}>
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="not-available">Not Available</option>
                </select>
              </div>
              <InputField type="number" label="Response Time (hours)" value={String(profile.response_time)} onChange={v => setProfile({ ...profile, response_time: v })} />
              <SaveButton onClick={handleSave} loading={saving} />
            </form>
          )}
        </Section>
      </div>
    </div>
  );
}
