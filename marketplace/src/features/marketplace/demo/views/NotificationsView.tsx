'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/backend';

const C = {
  bg: 'var(--c-bg, var(--c-surface-lowest))',
  surface: 'var(--c-surface, var(--c-surface-lowest))',
  surfaceAlt: 'var(--c-surface-alt, var(--c-surface))',
  card: 'var(--c-card, var(--c-surface-container))',
  text: 'var(--c-text, var(--c-text))',
  textSecondary: 'var(--c-text-secondary, var(--c-text-variant))',
  textMuted: 'var(--c-outline, var(--c-text-variant))',
  border: 'var(--c-border, var(--c-border))',
  primary: 'var(--c-primary, #0A0A0A)',
  success: 'var(--c-success, var(--c-accent))',
  warning: 'var(--c-warning, var(--c-warning))',
  danger: 'var(--c-error, var(--c-error))',
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
    deal: 'var(--c-accent)',
    community: 'var(--c-accent)',
    skin: 'var(--c-accent)',
    system: '#666',
    message: 'var(--c-accent)',
    payment: 'var(--c-accent)',
    application: 'var(--c-warning)',
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
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--c-surface-lowest)' }}>{brandInitial}</span>
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
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--c-surface-lowest)' }}>{brandInitial}</span>
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
