'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const C = {
  surface: 'rgba(15, 23, 42, 0.86)',
  border: 'rgba(148, 163, 184, 0.18)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  accentBg: 'rgba(56, 189, 248, 0.14)',
  success: '#86efac',
  error: '#fca5a5',
  warning: '#fbbf24',
};

interface WaitlistEntryInfo {
  id: string;
  position: number;
  status: string;
}

export default function WaitlistButton({ eventId, tierId }: {
  eventId: string;
  tierId?: string;
}) {
  const { account } = useAuth();
  const [entry, setEntry] = useState<WaitlistEntryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!account) return;
    fetch(`/api/event-os/waitlist/event/${eventId}`)
      .then(r => r.json())
      .then(d => {
        const mine = (d.entries || []).find((e: any) => e.userId === account.id.toString());
        if (mine) setEntry({ id: mine.id, position: mine.position, status: mine.status });
      })
      .catch(() => {});
  }, [eventId, account]);

  async function handleJoin() {
    if (!account) {
      window.location.href = '/auth/login?redirect=/events';
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/event-os/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, tierId: tierId || '', quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not join waitlist');
      setEntry({ id: data.entry?.id || data.id, position: data.position || data.entry?.position || 0, status: 'waiting' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    if (!entry) return;
    setLoading(true);
    try {
      await fetch(`/api/event-os/waitlist/${entry.id}`, { method: 'DELETE' });
      setEntry(null);
    } catch {
      setError('Failed to leave waitlist');
    } finally {
      setLoading(false);
    }
  }

  if (entry) {
    return (
      <div style={{
        padding: '14px 18px', borderRadius: 16,
        background: C.accentBg, border: `1px solid ${C.accent}40`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>On the waitlist</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              Position #{entry.position} · {entry.status}
            </div>
          </div>
          <button onClick={handleLeave} disabled={loading} style={{
            border: `1px solid ${C.border}`, borderRadius: 999, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            padding: '8px 16px', fontSize: 12,
            background: 'transparent', color: C.textMuted,
          }}>
            {loading ? '...' : 'Leave'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '14px 18px', borderRadius: 16,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Sold out?</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
            Join the waitlist — get notified when tickets become available
          </div>
        </div>
        <button onClick={handleJoin} disabled={loading} style={{
          border: 'none', borderRadius: 999, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          padding: '10px 18px', fontSize: 12,
          background: loading ? C.border : C.accent, color: '#082f49',
        }}>
          {loading ? 'Joining...' : 'Join waitlist'}
        </button>
      </div>
      {error && <div style={{ color: C.error, fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
