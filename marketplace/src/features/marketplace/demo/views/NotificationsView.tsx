'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/backend';

const C = {
  bg: 'var(--c-bg, #ffffff)',
  surface: 'var(--c-surface, #ffffff)',
  surfaceAlt: 'var(--c-surface-alt, #f9fafb)',
  card: 'var(--c-card, #f3f4f6)',
  text: 'var(--c-text, #1f2937)',
  textSecondary: 'var(--c-text-secondary, #6b7280)',
  textMuted: 'var(--c-outline, #9ca3af)',
  border: 'var(--c-border, #e5e7eb)',
  primary: 'var(--c-primary, #0A0A0A)',
  success: 'var(--c-success, #00D46A)',
  warning: 'var(--c-warning, #FFAB00)',
  danger: 'var(--c-error, #ED4956)',
};

interface Notification {
  id: number;
  type: string;
  text: string;
  time: string;
  read: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  hasAnySkin?: boolean;
}

export default function NotificationsView({ hasAnySkin = true }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch<{ notifications: any[] }>('/settings/notifications');
        if (cancelled) return;
        if (res.data?.notifications) {
          setNotifications(
            res.data.notifications.map((n: any) => ({
              id: n.id,
              type: n.type || 'system',
              text: n.message || n.text || '',
              time: n.created_at ? timeAgo(n.created_at) : '',
              read: n.read || false,
            }))
          );
        }
      } catch {
        // Notifications endpoint not available yet — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await apiFetch('/settings/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notification_ids: [id] }),
      });
    } catch { /* optimistic update already applied */ }
  };

  const clearAll = async () => {
    setNotifications([]);
    try {
      await apiFetch('/settings/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ mark_all: true }),
      });
    } catch { /* optimistic */ }
  };

  const dismiss = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const avatarColors: Record<string, string> = {
    deal: '#0095F6',
    community: '#7C3AED',
    skin: '#00D46A',
    system: '#666',
    message: '#0095F6',
    payment: '#22c55e',
    application: '#f59e0b',
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <>
      <div style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', paddingRight: '16px', position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
        <span style={{ fontSize: '22px', fontWeight: 700, color: C.text }}>Notifications</span>
        {notifications.length > 0 && (
          <button onClick={clearAll} style={{ background: 'none', border: 'none', fontSize: '12px', color: C.primary, cursor: 'pointer', fontWeight: 600 }}>Clear all</button>
        )}
      </div>
      {!hasAnySkin ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>No notifications yet</div>
          <div style={{ fontSize: '12px' }}>Select or purchase a ValueSkin to start receiving activity notifications.</div>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>No notifications yet</div>
              <div style={{ fontSize: '12px' }}>Activity from deals, communities, and skins will appear here</div>
            </div>
          ) : (
            <>
              {unread.length > 0 && (
                <>
                  <div style={{ padding: '14px 16px 8px', fontSize: '15px', fontWeight: 700, color: C.text }}>New</div>
                  {unread.map(n => {
                    const avatarColor = avatarColors[n.type] || '#666';
                    const brandInitial = n.text.match(/^(\w)/)?.[1] || 'N';
                    return (
                      <div key={n.id} onClick={() => markRead(n.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{brandInitial}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.4 }}>{n.text}</div>
                          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{n.time}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: '14px', padding: '4px' }}>x</button>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.primary, flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </>
              )}
              {read.length > 0 && (
                <>
                  <div style={{ padding: '14px 16px 8px', fontSize: '15px', fontWeight: 700, color: C.text }}>Earlier</div>
                  {read.map(n => {
                    const avatarColor = avatarColors[n.type] || '#666';
                    const brandInitial = n.text.match(/^(\w)/)?.[1] || 'N';
                    return (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.7 }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{brandInitial}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', color: C.textSecondary, lineHeight: 1.4 }}>{n.text}</div>
                          <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{n.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
