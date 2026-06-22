'use client';

import { useEffect, useState } from 'react';

const C = {
  surface: 'rgba(15, 23, 42, 0.86)',
  border: 'rgba(148, 163, 184, 0.18)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  accentBg: 'rgba(56, 189, 248, 0.14)',
  error: '#fca5a5',
};

interface NearbyEvent {
  id: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  venueName: string;
  distanceKm: number;
  priceCents: number;
  currency: string;
  ticketTierName: string;
}

export default function NearbyEvents({ currentEventId }: { currentEventId?: string }) {
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(25);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not available');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Could not get location. Enable location services.'),
    );
  }, []);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      radiusKm: radius.toString(),
      limit: '20',
    });
    if (currentEventId) params.set('excludeEventId', currentEventId);

    fetch(`/api/event-os/discovery/nearby?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setLoading(false); })
      .catch(() => { setError('Failed to load nearby events'); setLoading(false); });
  }, [location, radius, currentEventId]);

  if (error && !location) {
    return (
      <div style={{
        padding: 16, borderRadius: 16,
        background: C.surface, border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 13, color: C.textMuted }}>{error}</div>
      </div>
    );
  }

  if (!location || (events.length === 0 && !loading)) return null;

  return (
    <div style={{
      padding: 20, borderRadius: 16,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Nearby Events</div>
        <select
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          style={{
            borderRadius: 999, border: `1px solid ${C.border}`,
            background: 'rgba(15,23,42,0.6)', color: C.text,
            padding: '6px 12px', fontSize: 12, outline: 'none',
          }}
        >
          <option value={5}>5 km</option>
          <option value={10}>10 km</option>
          <option value={25}>25 km</option>
          <option value={50}>50 km</option>
          <option value={100}>100 km</option>
        </select>
      </div>

      {loading && <div style={{ color: C.textMuted, fontSize: 13 }}>Finding nearby events...</div>}

      {events.length === 0 && !loading && (
        <div style={{ color: C.textMuted, fontSize: 13 }}>No events found nearby.</div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {events.map(ev => (
          <a
            key={ev.id}
            href={`/events/${ev.id}`}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
              background: 'rgba(15,23,42,0.6)', border: `1px solid ${C.border}`,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{ev.eventName}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {ev.venueName} · {ev.eventDate}
                {ev.startTime && <> · {ev.startTime}</>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.accent }}>
                {ev.priceCents > 0 ? `$${(ev.priceCents / 100).toFixed(0)}` : 'Free'}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                {ev.distanceKm < 1
                  ? '< 1 km'
                  : `${Math.round(ev.distanceKm)} km`}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
