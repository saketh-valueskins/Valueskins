'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const C = {
  surface: 'rgba(15, 23, 42, 0.86)',
  border: 'rgba(148, 163, 184, 0.18)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  accentBg: 'rgba(56, 189, 248, 0.14)',
  error: '#fca5a5',
  success: '#86efac',
  warning: '#fbbf24',
};

interface ResaleListing {
  id: string;
  ticketCode: string;
  priceCents: number;
  tierName: string;
  sellerName: string;
  createdAt: string;
}

export default function ResaleMarketplace({ eventId }: { eventId: string }) {
  const { account } = useAuth();
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState('');
  const [checkoutReady, setCheckoutReady] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setCheckoutReady(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/event-os/resale/event/${eventId}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      setError('Failed to load resale listings');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadListings(); }, [loadListings]);

  async function handleBuy(listing: ResaleListing) {
    if (!account) {
      window.location.href = '/auth/login?redirect=/events';
      return;
    }
    setBuyingId(listing.id);
    setError('');
    setBuySuccess('');
    try {
      if (!checkoutReady || !window.Razorpay) {
        throw new Error('Payment system not ready');
      }

      const orderRes = await fetch('/api/event-os/resale/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Could not create order');

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: orderData.keyId,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: 'ValueSkins',
          description: `Resale: ${listing.tierName}`,
          order_id: orderData.order.id,
          prefill: { name: account.display_name || '', email: account.email || '' },
          theme: { color: C.accent },
          handler: async (response: Record<string, string>) => {
            try {
              const confirmRes = await fetch('/api/event-os/resale/confirm-purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: listing.id, ...response }),
              });
              const data = await confirmRes.json();
              if (!confirmRes.ok) throw new Error(data.error || 'Confirmation failed');
              setBuySuccess('Ticket purchased! It is now in your account.');
              loadListings();
              resolve();
            } catch (e: any) {
              reject(e);
            }
          },
          modal: { ondismiss: () => reject(new Error('Checkout closed')) },
        });
        rzp.open();
      });
    } catch (e: any) {
      setError(e.message || 'Purchase failed');
    } finally {
      setBuyingId(null);
    }
  }

  if (listings.length === 0 && !loading) return null;

  return (
    <div style={{
      padding: 20, borderRadius: 16,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Resale Marketplace</span>
        <span style={{
          padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: C.warning + '20', color: C.warning,
        }}>
          {listings.length} available
        </span>
      </div>

      {loading && <div style={{ color: C.textMuted, fontSize: 13 }}>Loading listings...</div>}
      {error && <div style={{ color: C.error, fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {buySuccess && <div style={{ color: C.success, fontSize: 13, marginBottom: 8 }}>{buySuccess}</div>}

      <div style={{ display: 'grid', gap: 8 }}>
        {listings.map(listing => (
          <div key={listing.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderRadius: 12,
            background: 'rgba(15,23,42,0.6)', border: `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{listing.tierName}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Sold by {listing.sellerName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.accent }}>
                ${(listing.priceCents / 100).toFixed(2)}
              </span>
              <button
                onClick={() => handleBuy(listing)}
                disabled={buyingId === listing.id}
                style={{
                  border: 'none', borderRadius: 999, fontWeight: 700, cursor: buyingId === listing.id ? 'not-allowed' : 'pointer',
                  padding: '8px 16px', fontSize: 12,
                  background: C.accent, color: '#082f49',
                }}
              >
                {buyingId === listing.id ? 'Buying...' : 'Buy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
