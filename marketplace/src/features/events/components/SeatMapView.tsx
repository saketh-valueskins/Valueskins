'use client';

import { useEffect, useState } from 'react';

const C = {
  surface: 'rgba(10, 10, 10, 0.86)',
  border: 'rgba(184, 180, 172, 0.18)',
  text: '#F5F5F0',
  textMuted: '#B8B4AC',
  accent: '#C8B89A',
  accentBg: 'rgba(200, 184, 154, 0.14)',
  success: '#86efac',
  error: '#fca5a5',
};

interface Seat {
  id: string;
  section: string;
  row: string;
  seatNumber: number;
  tierId: string | null;
  priceCents: number;
  status: 'available' | 'locked' | 'sold';
  lockedBy?: string;
  lockedUntil?: string;
}

interface SeatSection {
  name: string;
  tierName?: string;
  priceCents: number;
  seats: Seat[];
}

interface SeatMapData {
  sections: SeatSection[];
}

export default function SeatMapView({ eventId, onSelectSeat, selectedSeatId }: {
  eventId: string;
  onSelectSeat: (seat: Seat | null) => void;
  selectedSeatId?: string | null;
}) {
  const [data, setData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(selectedSeatId || '');

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetch(`/api/event-os/seats/event/${eventId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load seat map'); setLoading(false); });
  }, [eventId]);

  function handleSeatClick(seat: Seat) {
    if (seat.status !== 'available') return;
    const newId = seat.id === selectedId ? '' : seat.id;
    setSelectedId(newId);
    onSelectSeat(newId ? seat : null);
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>Loading seat map...</div>;
  }
  if (error) {
    return <div style={{ padding: 20, textAlign: 'center', color: C.error, fontSize: 13 }}>{error}</div>;
  }
  if (!data || data.sections.length === 0) {
    return null;
  }

  return (
    <div style={{
      padding: 20, borderRadius: 16,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Seat Map</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: '#1A1A1A', border: `1px solid ${C.border}`, display: 'inline-block' }} /> Available
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: C.accentBg, border: `1px solid ${C.accent}`, display: 'inline-block' }} /> Selected
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.3)', display: 'inline-block' }} /> Locked
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(252,165,165,0.2)', border: '1px solid rgba(252,165,165,0.4)', display: 'inline-block' }} /> Sold
        </span>
      </div>

      {data.sections.map(section => (
        <div key={section.name} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.accent }}>
            {section.name}
            {section.tierName && <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 8 }}>{section.tierName}</span>}
            {section.priceCents > 0 && <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 8 }}>${(section.priceCents / 100).toFixed(2)}</span>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {section.seats.map(seat => {
              const isSelected = seat.id === selectedId;
              let bg = '#1A1A1A';
              let border = C.border;
              let cursor = 'pointer';
              let opacity = 1;

              if (seat.status === 'sold') {
                bg = 'rgba(252,165,165,0.2)';
                border = 'rgba(252,165,165,0.4)';
                cursor = 'not-allowed';
                opacity = 0.6;
              } else if (seat.status === 'locked') {
                bg = 'rgba(148,163,184,0.15)';
                border = 'rgba(148,163,184,0.3)';
                cursor = 'not-allowed';
                opacity = 0.6;
              } else if (isSelected) {
                bg = C.accentBg;
                border = C.accent;
              }

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  title={`${section.name} ${seat.row}${seat.seatNumber}`}
                  style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: bg, border: `1px solid ${border}`,
                    cursor, opacity, padding: 0,
                    fontSize: 9, color: seat.status === 'available' ? C.textMuted : C.textMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.1s',
                  }}
                >
                  {seat.seatNumber}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
