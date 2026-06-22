'use client';

import { useState } from 'react';

const C = {
  surface: 'rgba(15, 23, 42, 0.86)',
  border: 'rgba(148, 163, 184, 0.18)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  error: '#fca5a5',
  success: '#86efac',
};

interface PromoCodeResult {
  valid: boolean;
  discountCents?: number;
  discountLabel?: string;
  error?: string;
  promoCodeId?: string;
}

export default function PromoCodeInput({
  eventId,
  tierId,
  onValidated,
}: {
  eventId: string;
  tierId?: string;
  onValidated: (result: PromoCodeResult | null) => void;
}) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<PromoCodeResult | null>(null);

  async function handleValidate() {
    if (!code.trim()) return;
    setValidating(true);
    setResult(null);
    try {
      const res = await fetch('/api/event-os/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), eventId, tierId: tierId || '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        const r = { valid: false, error: data.error || 'Invalid promo code' };
        setResult(r);
        onValidated(r);
        return;
      }
      const r: PromoCodeResult = {
        valid: true,
        discountCents: data.discountCents,
        discountLabel: data.discountLabel,
        promoCodeId: data.promoCodeId,
      };
      setResult(r);
      onValidated(r);
    } catch {
      const r = { valid: false, error: 'Failed to validate code' };
      setResult(r);
      onValidated(r);
    } finally {
      setValidating(false);
    }
  }

  function handleClear() {
    setCode('');
    setResult(null);
    onValidated(null);
  }

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 16,
      background: 'rgba(15,23,42,0.6)', border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Promo Code
      </div>
      {result?.valid ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: C.success, fontWeight: 700, fontSize: 14 }}></span>
            <span style={{ color: C.success, fontSize: 13 }}>Code applied — {result.discountLabel}</span>
          </div>
          <button onClick={handleClear} style={{
            background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, padding: '4px 8px',
          }}>Remove</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={e => { setCode(e.target.value); setResult(null); onValidated(null); }}
            placeholder="Enter promo code"
            style={{
              flex: 1, borderRadius: 10, border: `1px solid ${C.border}`,
              background: 'rgba(15,23,42,0.5)', color: C.text,
              padding: '10px 14px', fontSize: 13, outline: 'none',
            }}
          />
          <button onClick={handleValidate} disabled={validating || !code.trim()} style={{
            border: 'none', borderRadius: 999, fontWeight: 700, cursor: validating || !code.trim() ? 'not-allowed' : 'pointer',
            padding: '10px 18px', fontSize: 12,
            background: validating ? C.border : C.accent,
            color: validating ? C.textMuted : '#082f49',
          }}>
            {validating ? '...' : 'Apply'}
          </button>
        </div>
      )}
      {result && !result.valid && result.error && (
        <div style={{ color: C.error, fontSize: 12, marginTop: 6 }}>{result.error}</div>
      )}
    </div>
  );
}
