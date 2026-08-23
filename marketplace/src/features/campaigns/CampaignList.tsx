'use client';
import { withAlpha } from '@/theme/colors';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ErrorBanner from '@/components/ErrorBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EmptyState from '@/components/EmptyState';

const C = {
  bg: '#0A0A0A', surface: '#1A1A1A', surfaceAlt: '#2D2D2D',
  text: '#F5F5F0', textMuted: '#B8B4AC', primary: '#C8B89A',
  success: 'var(--c-accent)', warning: 'var(--c-warning)', danger: 'var(--c-error)', border: '#2D2D2D',
};

interface CampaignListProps {
  initialCampaigns?: any[];
  initialPagination?: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean } | null;
}

export default function CampaignList({ initialCampaigns = [], initialPagination = null }: CampaignListProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(initialPagination?.page || 1);
  const [hasMore, setHasMore] = useState(initialPagination?.hasMore || false);
  const [form, setForm] = useState({ title: '', description: '', budget_per_creator: '', total_budget: '', deadline: '', delivery_type: 'no_delivery' });
  const [saving, setSaving] = useState(false);
  const [pastCreators, setPastCreators] = useState<any[]>([]);
  const [showPastCreators, setShowPastCreators] = useState(false);
  const [selectedPastCreators, setSelectedPastCreators] = useState<number[]>([]);

  const fetchCampaigns = async (pageNum = 1, append = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/list?page=${pageNum}&pageSize=20`, { credentials: 'include' });
      if (!res.ok) { setError('Failed to load campaigns'); setLoading(false); return; }
      const data = await res.json();
      setCampaigns(append ? [...campaigns, ...(data.campaigns || [])] : (data.campaigns || []));
      setHasMore(data.pagination?.hasMore || false);
      setPage(pageNum);
    } catch { setError('Failed to load campaigns'); }
    setLoading(false);
  };

  const fetchPastCreators = async () => {
    try {
      const res = await fetch('/api/past-creators', { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setPastCreators(d.pastCreators || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (!initialCampaigns.length) fetchCampaigns();
  }, []);

  const toggleCreate = () => {
    setShowCreate(!showCreate);
    if (!showCreate) fetchPastCreators();
    setSelectedPastCreators([]);
  };

  const createCampaign = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const res = await fetch('/api/campaigns/list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          title: form.title, description: form.description,
          budget_per_creator: Number(form.budget_per_creator) || 0,
          total_budget: Number(form.total_budget) || 0,
          deadline: form.deadline || null,
          delivery_type: form.delivery_type,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        if (selectedPastCreators.length > 0 && d.campaign) {
          await fetch('/api/campaigns/invite', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ campaignId: d.campaign.id, creatorIds: selectedPastCreators }),
          });
        }
        setShowCreate(false);
        setForm({ title: '', description: '', budget_per_creator: '', total_budget: '', deadline: '', delivery_type: 'no_delivery' });
        setSelectedPastCreators([]);
        fetchCampaigns();
      }
    } catch {} finally { setSaving(false); }
  };

  const togglePastCreator = (creatorId: number) => {
    setSelectedPastCreators(prev =>
      prev.includes(creatorId) ? prev.filter(id => id !== creatorId) : [...prev, creatorId]
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: C.text, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Campaigns</h1>
        <button onClick={toggleCreate}
          style={{ padding: '8px 16px', background: C.primary, color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
          {showCreate ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      {showCreate && (
        <div style={{ padding: '16px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '20px' }}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input placeholder="Campaign title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px', minHeight: '60px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="number" placeholder="Budget per creator (₹)" value={form.budget_per_creator} onChange={e => setForm({ ...form, budget_per_creator: e.target.value })}
                style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />
              <input type="number" placeholder="Total budget (₹)" value={form.total_budget} onChange={e => setForm({ ...form, total_budget: e.target.value })}
                style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />
            </div>
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
              style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '14px' }} />

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: '6px' }}>Delivery Type</label>
              <div style={{ display: 'grid', gap: '6px' }}>
                {['no_delivery', 'digital_access', 'physical_product'].map(dt => (
                  <label key={dt} onClick={() => setForm({ ...form, delivery_type: dt })}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', cursor: 'pointer',
                      background: form.delivery_type === dt ? `${withAlpha(C.primary, 0x15)}` : C.bg,
                      border: `1px solid ${form.delivery_type === dt ? C.primary : C.border}`,
                      borderRadius: '6px', transition: 'all 0.15s',
                    }}>
                    <input type="radio" name="delivery_type" checked={form.delivery_type === dt} onChange={() => setForm({ ...form, delivery_type: dt })}
                      style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                        {dt === 'no_delivery' ? 'No Delivery Required' : dt === 'digital_access' ? 'Digital Access Required' : 'Physical Product Delivery'}
                      </div>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>
                        {dt === 'no_delivery' ? 'Reviews, events, experience-based content' : dt === 'digital_access' ? 'SaaS, courses, software licenses, game keys' : 'Clothing, cosmetics, electronics, merch'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {pastCreators.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowPastCreators(!showPastCreators)}
                  style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '0' }}>
                  {showPastCreators ? 'Hide' : 'Show'} past collaborators ({pastCreators.length})
                </button>
                {showPastCreators && (
                  <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                    {pastCreators.map((pc: any) => (
                      <label key={pc.creator_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: C.bg, borderRadius: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedPastCreators.includes(pc.creator_id)} onChange={() => togglePastCreator(pc.creator_id)} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                          {(pc.creator_name || '?')[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{pc.creator_name || `Creator #${pc.creator_id}`}</div>
                          <div style={{ fontSize: '11px', color: C.textMuted }}>@{pc.creator_username} &middot; {pc.last_deal_title}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={createCampaign} disabled={saving}
              style={{ padding: '10px', background: C.primary, color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creating...' : selectedPastCreators.length > 0 ? `Create & Invite ${selectedPastCreators.length} Past Creator${selectedPastCreators.length !== 1 ? 's' : ''}` : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {loading && page === 1 && <LoadingSkeleton count={3} />}

      {!loading && campaigns.length === 0 && !error && (
        <EmptyState message="No campaigns yet. Create one to invite multiple creators." />
      )}

      {campaigns.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {campaigns.map((c: any) => (
            <div key={c.id}
              onClick={() => router.push(`/campaigns/${c.id}`)}
              style={{ padding: '14px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: '12px', color: C.textMuted }}>{c.description?.slice(0, 100) || 'No description'}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: C.textMuted }}>
                  <div>{c.invite_count || 0} invites</div>
                  <div>{c.accepted_count || 0} accepted</div>
                  <div style={{ textTransform: 'capitalize', color: c.status === 'active' ? C.success : C.warning }}>{c.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
  );
}
