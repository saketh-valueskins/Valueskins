'use client';

import { useEffect, useState } from 'react';

const C = {
  surface: 'rgba(15, 23, 42, 0.86)',
  border: 'rgba(148, 163, 184, 0.18)',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  error: '#fca5a5',
  warning: '#fbbf24',
};

interface SurgeInfo {
  tierId: string;
  multiplier: number;
  originalPriceCents: number;
  surgePriceCents: number;
  thresholdPct: number;
  currentCapacityPct: number;
  active: boolean;
}

export default function SurgePricingBadge({ eventId, tierId }: {
  eventId: string;
  tierId: string;
}) {
  const [surge, setSurge] = useState<SurgeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/event-os/surge-pricing/event/${eventId}`)
      .then(r => r.json())
      .then(d => {
        const match = (d.tiers || []).find((t: any) => t.tierId === tierId);
        if (match?.active) setSurge(match);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId, tierId]);

  if (loading || !surge || !surge.active) return null;

  const pct = Math.round(surge.currentCapacityPct);
  const isHigh = pct >= 90;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: isHigh ? 'rgba(252,165,165,0.15)' : 'rgba(251,191,36,0.15)',
      color: isHigh ? C.error : C.warning,
      fontSize: 11, fontWeight: 700,
    }}>
      <span> SURGE {surge.multiplier}x</span>
      <span style={{ fontWeight: 400, opacity: 0.8 }}>
        ({pct}% capacity)
      </span>
    </div>
  );
}
