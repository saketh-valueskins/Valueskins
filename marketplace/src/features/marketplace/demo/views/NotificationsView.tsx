'use client';
import { useState } from 'react';

const C = {
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  card: '#f3f4f6',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  primary: '#2563EB',
  success: '#00D46A',
  warning: '#FFAB00',
  danger: '#ED4956',
};

const MOCK_NOTIFICATIONS: Array<{ id: number; type: string; text: string; time: string; read: boolean }> = [
  { id: 1, type: 'deal', text: 'New deal opportunity from Nike', time: '2m ago', read: false },
  { id: 2, type: 'community', text: 'New message in Design Community', time: '15m ago', read: false },
  { id: 3, type: 'skin', text: 'Your ValueSkin was viewed 24 times', time: '1h ago', read: false },
  { id: 4, type: 'system', text: 'Profile completion at 85%', time: '3h ago', read: true },
  { id: 5, type: 'deal', text: 'Deal with Adidas is ready for review', time: '5h ago', read: true },
];

interface Props {
  hasAnySkin?: boolean;
}

export default function NotificationsView({ hasAnySkin = true }: Props) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const avatarColors: Record<string, string> = { deal: '#0095F6', community: '#7C3AED', skin: '#00D46A', system: '#666' };

  return (
    <>
      <div style={{ height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', paddingRight: '16px', position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
        <span style={{ fontSize: '22px', fontWeight: 700, color: C.text }}>Notifications</span>
        {notifications.length > 0 && (
          <button onClick={() => { setNotifications([]); }} style={{ background: 'none', border: 'none', fontSize: '12px', color: C.primary, cursor: 'pointer', fontWeight: 600 }}>Clear all</button>
        )}
      </div>
      {!hasAnySkin ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>No notifications yet</div>
          <div style={{ fontSize: '12px' }}>Select or purchase a ValueSkin to start receiving activity notifications.</div>
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>No notifications yet</div>
            <div style={{ fontSize: '12px' }}>Activity from deals, communities, and skins will appear here</div>
          </div>
        ) : (
          <>
            {notifications.filter(n => !n.read).length > 0 && (
              <>
                <div style={{ padding: '14px 16px 8px', fontSize: '15px', fontWeight: 700, color: C.text }}>New</div>
                {notifications.filter(n => !n.read).map(n => {
                  const avatarColor = avatarColors[n.type] || '#666';
                  const brandInitial = n.text.match(/^(\w)/)?.[1] || 'N';
                  return (
                    <div key={n.id} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{brandInitial}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{n.time}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setNotifications(prev => prev.filter(x => x.id !== n.id)); }} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: '14px', padding: '4px' }}>x</button>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.primary, flexShrink: 0 }} />
                    </div>
                  );
                })}
              </>
            )}
            {notifications.filter(n => n.read).length > 0 && (
              <>
                <div style={{ padding: '14px 16px 8px', fontSize: '15px', fontWeight: 700, color: C.text }}>Earlier</div>
                {notifications.filter(n => n.read).map(n => {
                  const avatarColors: Record<string, string> = { deal: '#0095F6', community: '#7C3AED', skin: '#00D46A', system: '#666' };
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
