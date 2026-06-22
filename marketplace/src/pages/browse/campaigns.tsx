'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MarketplaceLayout from '@/components/MarketplaceLayout';

const C = {
  bg: '#0f172a', surface: '#1e293b', surfaceAlt: '#334155',
  text: '#f8fafc', textMuted: '#94a3b8', primary: '#38bdf8',
  success: '#10b981', warning: '#f59e0b', border: '#334155',
};

export default function BrowseCampaigns() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchCampaigns = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), pageSize: '20' });
      if (search) params.set('search', search);
      if (maxBudget) params.set('maxBudget', maxBudget);
      const res = await fetch(`/api/browse/campaigns?${params}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setCampaigns(append ? [...campaigns, ...(d.campaigns || [])] : (d.campaigns || []));
        setHasMore(d.pagination?.hasMore || false);
        setPage(pageNum);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  return (
    <MarketplaceLayout title="Browse Campaigns" hideHeader>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: C.text, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Browse Campaigns</h1>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px' }} />
          <input type="number" placeholder="Max budget" value={maxBudget} onChange={e => setMaxBudget(e.target.value)}
            style={{ width: '120px', padding: '10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px' }} />
          <button onClick={() => fetchCampaigns()}
            style={{ padding: '10px 16px', background: C.primary, color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
            Search
          </button>
        </div>

        {loading && page === 1 && <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted }}>Loading campaigns...</div>}

        {!loading && campaigns.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted }}>
            No open campaigns match your criteria right now.
          </div>
        )}

        <div style={{ display: 'grid', gap: '10px' }}>
          {campaigns.map((c: any) => (
            <div key={c.id}
              onClick={() => router.push(`/campaigns/${c.id}`)}
              style={{ padding: '14px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>{c.title}</span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: `${C.success}20`, color: C.success }}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{c.description?.slice(0, 120) || 'No description'}</div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: C.textMuted }}>
                    <span>by <strong style={{ color: C.text }}>{c.brand_name || 'Brand'}</strong></span>
                    <span>Budget: <strong style={{ color: C.primary }}>${c.budget_per_creator}</strong></span>
                    {c.brand_rating > 0 && <span>Rating: <strong style={{ color: C.warning }}>{c.brand_rating}/5</strong></span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                  <div style={{ fontSize: '11px', padding: '4px 8px', background: C.primary, color: '#000', borderRadius: '4px', fontWeight: 600 }}>
                    Place Bid
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading && page > 1 && <div style={{ textAlign: 'center', padding: '20px', color: C.textMuted }}>Loading more...</div>}

        {hasMore && !loading && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={() => fetchCampaigns(page + 1, true)}
              style={{ padding: '10px 24px', background: 'transparent', color: C.primary, border: `1px solid ${C.primary}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Load More
            </button>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
