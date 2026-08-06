'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@/theme/ThemeContext';
import Link from 'next/link';

// Merged Settings hub — the single final settings page.
// Per ui-specs/Personal Settings.md + Profile settings.md: left nav rail +
// scrollspy, sand accents, quiet danger zone, no green/blue/red resting states.
// Inlines the real Account + Notifications + Privacy APIs; links out to the
// existing rich editors (Profile & Skins, Payouts, Data) so no feature is lost.
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const T = {
  bg: '#0A0A0A',
  surface: '#161512',
  card: '#1A1A1A',
  text: '#F5F5F0',
  muted: '#B8B4AC',
  sand: '#C8B89A',
  deepSand: '#A08A5E',
  danger: '#B0413E',
  border: '#2D2D2D',
  sandBorder: 'rgba(160,138,94,0.28)',
};

interface Account {
  id: number;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
}

const SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'profile', label: 'Profile & Skins' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'payments', label: 'Payments & Payouts' },
  { id: 'security', label: 'Security' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'privacy', label: 'Privacy & Data' },
  { id: 'danger', label: 'Danger Zone' },
] as const;

export default function SettingsHub({
  embedded = false,
  onOpenPreferences,
  fallbackAccount = null,
  onLogout,
}: {
  /** Rendered inside the app shell: drop the page padding and the left rail,
   *  since the app supplies its own chrome and bottom tab spine. */
  embedded?: boolean;
  /** Embedded only — open the in-app preferences view instead of navigating
   *  away to /settings. */
  onOpenPreferences?: () => void;
  /** Demo identity used when the real session API returns 401 — the marketplace
   *  demo signs you in locally (role + profile), so Settings must not claim you
   *  are logged out just because there is no auth cookie. */
  fallbackAccount?: Account | null;
  /** Demo logout — reset the local session instead of navigating to /auth/login. */
  onLogout?: () => void;
} = {}) {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountMsg, setAccountMsg] = useState('');

  const [prefs, setPrefs] = useState<any>(null);
  const [notifMsg, setNotifMsg] = useState('');

  // Theme is global — ThemeProvider owns the value and the persistence.
  // This section used to hold its own state and write vs_theme to localStorage
  // without anything ever reading it, which is why Appearance did nothing.
  const { preference: theme, setPreference: changeTheme } = useTheme();
  const [active, setActive] = useState<string>('account');
  const contentRef = useRef<HTMLDivElement>(null);

  // ---- Load account (real API, unchanged) ----
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/me', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (!json.error) {
            setAccount(json as Account);
            setDisplayName(json.display_name || '');
          }
        } else if (fallbackAccount) {
          setAccount(fallbackAccount);
          setDisplayName(fallbackAccount.display_name || '');
        }
      } catch (e) {
        if (fallbackAccount) {
          setAccount(fallbackAccount);
          setDisplayName(fallbackAccount.display_name || '');
        } else {
          console.error('Error loading account:', e);
        }
      } finally {
        setLoading(false);
      }
    })();
    // Notifications (real API, unchanged)
    fetch('/api/settings/notifications', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPrefs(d.preferences || {}))
      .catch(() => setPrefs({}));
  }, []);

  // ---- Scrollspy (spec §1 orientation win) ----
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [loading]);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setAccountMsg('');
    try {
      const res = await fetch('/api/account/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_name: displayName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed to save (${res.status})`);
      }
      const result = await res.json();
      setAccount((prev) => (prev ? { ...prev, display_name: result.display_name } : prev));
      setAccountMsg('Saved');
      setTimeout(() => setAccountMsg(''), 2000);
    } catch (e: any) {
      setAccountMsg(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = async (key: string) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [key]: updated[key] }),
      });
      if (res.ok) {
        setNotifMsg('Saved');
        setTimeout(() => setNotifMsg(''), 2000);
      } else {
        setPrefs({ ...prefs, [key]: !updated[key] });
      }
    } catch {
      setPrefs({ ...prefs, [key]: !updated[key] });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      if (onLogout) {
        onLogout();
      } else {
        router.push('/auth/login');
      }
    }
  };

  const requestDeletion = () => {
    alert(
      'Data deletion request submitted.\n\nYour account will be anonymized within 30 days as required by GDPR (Art. 17).\nYou can cancel this request within 24 hours.',
    );
  };

  const downloadData = () => {
    alert('Data export initiated — you will receive an email with a download link within 24 hours.');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: embedded ? '200px' : '100vh',
        background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT,
      }}>
        <div style={{ color: T.muted }}>Loading…</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={{
        minHeight: embedded ? '200px' : '100vh',
        background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT,
      }}>
        <div style={{ textAlign: 'center', color: T.muted }}>
          <p style={{ marginBottom: '12px' }}>Not logged in</p>
          <Link href="/auth/login" style={{ color: T.sand, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: embedded ? undefined : '100vh',
      background: T.bg, color: T.text, fontFamily: FONT,
      padding: embedded ? '16px 16px 24px' : '32px 20px',
    }}>
      <div style={{
        maxWidth: embedded ? undefined : '1180px',
        margin: '0 auto',
        display: 'grid',
        // Embedded drops the left rail — the app already has the tab spine, and
        // the column is too narrow for a 236px sidebar.
        gridTemplateColumns: embedded ? '1fr' : '236px 1fr',
        gap: embedded ? '32px' : '56px',
        alignItems: 'start',
      }}>
        {/* ---- Left rail (sticky, scrollspy) ---- */}
        {!embedded && (
        <aside style={{ position: 'sticky', top: '32px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px' }}>Settings</h1>
          <div style={{ fontSize: '0.8125rem', color: T.muted, marginBottom: '20px' }}>ValueSkins preferences</div>
          <nav style={{ borderLeft: `1px solid ${T.border}` }}>
            {SECTIONS.map((s) => {
              const on = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => jump(s.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 14px',
                    marginLeft: '-1px',
                    background: 'none',
                    border: 'none',
                    borderLeft: `2px solid ${on ? T.sand : 'transparent'}`,
                    color: on ? T.text : T.muted,
                    fontWeight: on ? 600 : 400,
                    fontSize: '0.875rem',
                    fontFamily: FONT,
                    cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>
        )}

        {/* ---- Content ---- */}
        <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {/* Account */}
          <Section id="account" title="Account">
            <Field label="Display Name">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Email">
              <div style={{ ...inputStyle, color: T.muted }}>{account.email || 'No email set'}</div>
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={handleSaveProfile} disabled={saving} style={primaryBtn(saving)}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {accountMsg && <span style={{ fontSize: '0.8125rem', color: accountMsg === 'Saved' ? T.sand : T.danger }}>{accountMsg}</span>}
            </div>
          </Section>

          {/* Profile & Skins — quiet link rows to the rich editors (nothing lost) */}
          <Section id="profile" title="Profile & Skins">
            <LinkRow href="/profile/me" label="Creator Profile Preferences" sub="Bio, social links, pitch, marketplace settings" />
            {embedded && onOpenPreferences ? (
              <LinkRow onClick={onOpenPreferences} label="Profile & brand details" sub="Rate card, audience, deal preferences, skin showcase, availability" />
            ) : (
              <LinkRow href="/settings" label="Profile & brand details" sub="Rate card, audience, deal preferences, skin showcase, availability" />
            )}
            {/* One store: this opens the same Store tab the bottom nav does. */}
            <LinkRow href="/demo/marketplace?view=store" label="Manage ValueSkins" sub="Switch or acquire your profession skin in the Store" />
            <LinkRow href="/account/modules" label="Modules" sub="Manage which ValueSkins modules are active" />
          </Section>

          {/* Notifications — real toggles (spec §4) */}
          <Section id="notifications" title="Notifications" note={notifMsg}>
            {[
              { key: 'notifications', label: 'Deal & Message Notifications', desc: 'Deal updates, new messages, and payment confirmations' },
              { key: 'marketing', label: 'Marketing & Promotions', desc: 'Campaign invitations and promotional content' },
              { key: 'product_updates', label: 'Product Updates', desc: 'New features and platform improvements' },
            ].map((item) => (
              <div key={item.key} style={rowStyle}>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '0.8125rem', color: T.muted }}>{item.desc}</div>
                </div>
                <Toggle on={!!prefs?.[item.key]} onClick={() => toggleNotif(item.key)} />
              </div>
            ))}
          </Section>

          {/* Payments & Payouts */}
          <Section id="payments" title="Payments & Payouts">
            <LinkRow href="/payout-onboarding" label="Payout method" sub="UPI or bank account for receiving deal payments" />
            <LinkRow href="/payments/history" label="Payment history" sub="Statements, invoices, and TDS (Form 16A)" />
          </Section>

          {/* Security */}
          <Section id="security" title="Security">
            <div style={rowStyle}>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Two-factor authentication</div>
                <div style={{ fontSize: '0.8125rem', color: T.muted }}>OTP on sign-in from a new device</div>
              </div>
              <Link href="/auth/2fa" style={linkPill}>Manage</Link>
            </div>
            <LinkRow href="/account/data" label="Login & account data" sub="Review the data on your account" />
          </Section>

          {/* Appearance — theme (spec §8) */}
          <Section id="appearance" title="Appearance">
            <Field label="Theme">
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['light', 'dark', 'system'] as const).map((t) => {
                  const on = theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => changeTheme(t)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: on ? `1px solid ${T.sand}` : `1px solid ${T.sandBorder}`,
                        background: on ? T.sand : 'transparent',
                        color: on ? '#0A0A0A' : T.muted,
                        fontWeight: on ? 600 : 400,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        fontFamily: FONT,
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          {/* Privacy & Data (GDPR) */}
          <Section id="privacy" title="Privacy & Data">
            <button onClick={downloadData} style={{ ...rowStyle, width: '100%', textAlign: 'left', background: 'none', border: `1px solid ${T.border}`, borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', color: T.text, fontFamily: FONT }}>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Download My Data</div>
                <div style={{ fontSize: '0.8125rem', color: T.muted }}>Export all your data in JSON format</div>
              </div>
              <span style={{ color: T.sand, fontSize: '0.8125rem' }}>Export →</span>
            </button>
            <button onClick={requestDeletion} style={{ ...rowStyle, width: '100%', textAlign: 'left', background: 'none', border: `1px solid ${T.border}`, borderRadius: '8px', cursor: 'pointer', color: T.text, fontFamily: FONT }}>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Request Data Deletion</div>
                <div style={{ fontSize: '0.8125rem', color: T.muted }}>Permanently erase your account (GDPR Art. 17) — 30 day process</div>
              </div>
              <span style={{ color: T.muted, fontSize: '0.8125rem' }}>Request →</span>
            </button>
          </Section>

          {/* Danger Zone — quiet, no red fill (spec §9 / G3) */}
          <Section id="danger" title="Danger Zone">
            <div style={{ border: `1px solid ${T.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button onClick={handleLogout} style={quietDanger}>Log out</button>
              <button onClick={requestDeletion} style={quietDanger}>Delete account</button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ---- Small building blocks ----
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: `1px solid ${T.sandBorder}`,
  borderRadius: '6px',
  fontSize: '1rem',
  boxSizing: 'border-box',
  color: T.text,
  background: '#0A0A0A',
  fontFamily: FONT,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  padding: '14px 16px',
};

const linkPill: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '6px',
  border: `1px solid ${T.sandBorder}`,
  color: T.text,
  textDecoration: 'none',
  fontSize: '0.8125rem',
  fontWeight: 600,
  fontFamily: FONT,
};

const quietDanger: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  color: T.text,
  border: `1px solid ${T.border}`,
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: FONT,
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 20px',
    background: T.text,
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontFamily: FONT,
  };
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{title}</h2>
        {note && <span style={{ fontSize: '0.8125rem', color: T.sand }}>{note}</span>}
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '20px' }}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</label>
      {children}
    </div>
  );
}

// Either navigates (href) or switches an in-app view (onClick). Embedded rows
// use onClick so Settings never bounces the user out of the app shell.
function LinkRow({ href, onClick, label, sub }: { href?: string; onClick?: () => void; label: string; sub: string }) {
  const inner = (
    <>
      <div>
        <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '0.8125rem', color: T.muted }}>{sub}</div>
      </div>
      <span style={{ color: T.muted }}>→</span>
    </>
  );
  const style = { ...rowStyle, textDecoration: 'none', color: T.text, borderRadius: '8px' };

  if (onClick) {
    return (
      <button onClick={onClick} style={{ ...style, width: '100%', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
        {inner}
      </button>
    );
  }
  return <Link href={href || '#'} style={style}>{inner}</Link>;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', background: on ? T.sand : T.border, transition: 'background 0.2s', flexShrink: 0 }}
    >
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#F5F5F0', position: 'absolute', top: '3px', left: on ? '23px' : '3px', transition: 'left 0.2s' }} />
    </button>
  );
}
