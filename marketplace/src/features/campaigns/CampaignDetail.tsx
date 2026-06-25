'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const C = {
  bg: '#0f172a', surface: '#1e293b', surfaceAlt: '#334155',
  text: '#f8fafc', textMuted: '#94a3b8', primary: '#38bdf8',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444', border: '#334155',
};

interface Bid {
  id: number;
  campaign_id: number;
  creator_id: number;
  bid_amount: number;
  proposal: string;
  status: string;
  created_at: string;
  creator_name?: string;
  creator_username?: string;
}

interface CampaignUser {
  id: number;
  display_name: string;
  username: string;
  avatar_url?: string;
}

export default function CampaignDetail({ campaignId }: { campaignId: number }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [userRole, setUserRole] = useState<'brand' | 'creator' | ''>('');
  const [currentUser, setCurrentUser] = useState<CampaignUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidProposal, setBidProposal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => { fetchCampaign(); fetchUser(); }, [campaignId]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/profile/me', { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (d.user) setCurrentUser(d.user);
        if (d.role) setUserRole(d.role);
      }
    } catch {}
  };

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/campaign/${campaignId}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setCampaign(d.campaign);
        setInvites(d.invites || []);
      }
      const bidRes = await fetch(`/api/bids?campaign_id=${campaignId}`, { credentials: 'include' });
      if (bidRes.ok) {
        const bd = await bidRes.json();
        setBids(bd.bids || []);
        setUserRole(bd.role || '');
      }
    } catch {} finally { setLoading(false); }
  };

  const placeBid = async () => {
    if (!bidAmount || Number(bidAmount) <= 0) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaign_id: campaignId, bid_amount: Number(bidAmount), proposal: bidProposal }),
      });
      const d = await res.json();
      if (res.ok) {
        setMessage('Bid placed successfully!');
        setBidAmount('');
        setBidProposal('');
        fetchCampaign();
      } else {
        setMessage(d.error || 'Failed to place bid');
      }
    } catch { setMessage('Network error'); } finally { setSubmitting(false); }
  };

  const handleBidAction = async (bidId: number, action: string) => {
    try {
      const res = await fetch('/api/bids', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bid_id: bidId, action }),
      });
      const d = await res.json();
      setMessage(d.message || d.error || 'Action completed');
      if (res.ok) fetchCampaign();
    } catch { setMessage('Network error'); }
  };

  const fetchMatches = async (force = false) => {
    setShowMatches(!showMatches);
    if (!force && matchResults.length > 0) { setShowMatches(true); return; }
    try {
      const res = await fetch(`/api/campaigns/match?campaignId=${campaignId}${force ? '&refresh=true' : ''}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setMatchResults(d.matches || []);
      }
    } catch {}
  };

  const inviteCreator = async (creatorAccountId: number) => {
    try {
      const res = await fetch('/api/campaigns/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId, creatorIds: [creatorAccountId] }),
      });
      if (res.ok) {
        setMessage('Creator invited!');
        fetchCampaign();
      }
    } catch {}
  };

  if (loading) return <div style={{ padding: '20px', color: C.textMuted }}>Loading...</div>;
  if (!campaign) return <div style={{ padding: '20px', color: C.danger }}>Campaign not found</div>;

  const isBrandOwner = campaign.brand_id === currentUser?.id || false;
  const deadlineDate = campaign.deadline ? new Date(campaign.deadline) : null;
  const isDeadlinePassed = deadlineDate && deadlineDate < new Date();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: C.text, fontFamily: 'system-ui, sans-serif' }}>
      <button onClick={() => router.push('/campaigns')} style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', marginBottom: '16px', fontSize: '14px' }}>&larr; Back to campaigns</button>

      <div style={{ padding: '20px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>{campaign.title}</h1>
        <p style={{ color: C.textMuted, fontSize: '14px', marginBottom: '16px' }}>{campaign.description || 'No description'}</p>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: C.textMuted, flexWrap: 'wrap' }}>
          <span>Budget/creator: <strong style={{ color: C.text }}>${campaign.budget_per_creator}</strong></span>
          <span>Total budget: <strong style={{ color: C.text }}>${campaign.total_budget}</strong></span>
          <span>Status: <strong style={{ color: campaign.status === 'active' ? C.success : C.warning, textTransform: 'capitalize' }}>{campaign.status}</strong></span>
          <span>Delivery: <strong style={{ color: C.primary }}>
            {campaign.delivery_type === 'digital_access' ? 'Digital Access' : campaign.delivery_type === 'physical_product' ? 'Physical Product' : 'No Delivery'}
          </strong></span>
          {deadlineDate && (
            <span>Apply by: <strong style={{ color: isDeadlinePassed ? C.danger : C.warning }}>
              {deadlineDate.toLocaleDateString()} {isDeadlinePassed ? '(Closed)' : ''}
            </strong></span>
          )}
        </div>
      </div>

      {message && (
        <div style={{ padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', fontWeight: 600,
          background: message.includes('error') || message.includes('Failed') ? `${C.danger}20` : `${C.success}20`,
          color: message.includes('error') || message.includes('Failed') ? C.danger : C.success }}>
          {message}
        </div>
      )}

      {isBrandOwner && (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => fetchMatches(true)}
            style={{ padding: '8px 16px', background: C.primary, color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', marginRight: '8px' }}>
            {showMatches ? 'Hide Matches' : 'Find Matching Creators'}
          </button>

          {showMatches && (
            <div style={{ marginTop: '12px', padding: '16px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Auto-Matched Creators ({matchResults.length})</h3>
              {matchResults.length === 0 ? (
                <div style={{ color: C.textMuted, fontSize: '13px' }}>No matching creators found. Try adjusting your campaign budget or niche.</div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {matchResults.map((match: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: C.surfaceAlt, borderRadius: '6px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{match.creatorName}</div>
                        <div style={{ fontSize: '11px', color: C.textMuted }}>Score: {match.matchScore}% | {match.reasons?.join(', ')}</div>
                      </div>
                      <button onClick={() => inviteCreator(match.creator_id)}
                        style={{ padding: '6px 12px', background: C.primary, color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '11px' }}>
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {userRole === 'creator' && !isBrandOwner && (
        <div style={{ marginBottom: '20px', padding: '16px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>
            {bids.length > 0 && ['pending', 'accepted'].includes(bids[0].status) ? 'Your Bid' : 'Place a Bid'}
          </h3>

          {isDeadlinePassed && bids.length === 0 ? (
            <div style={{ padding: '12px', background: `${C.danger}15`, borderRadius: '6px', color: C.danger, fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
              This campaign's deadline has passed. Bidding is closed.
            </div>
          ) : bids.length > 0 ? (
            <div>
              {bids.map((bid) => (
                <div key={bid.id} style={{ padding: '10px', background: C.surfaceAlt, borderRadius: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>${Number(bid.bid_amount).toFixed(2)}</span>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', fontWeight: 600,
                      background: bid.status === 'accepted' ? `${C.success}20` : bid.status === 'rejected' ? `${C.danger}20` : `${C.warning}20`,
                      color: bid.status === 'accepted' ? C.success : bid.status === 'rejected' ? C.danger : C.warning }}>
                      {bid.status}
                    </span>
                  </div>
                  {bid.proposal && <div style={{ fontSize: '12px', color: C.textMuted }}>{bid.proposal}</div>}
                  {bid.status === 'pending' && (
                    <button onClick={() => handleBidAction(bid.id, 'withdraw')}
                      style={{ marginTop: '8px', padding: '4px 10px', background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                      Withdraw
                    </button>
                  )}
                  {bid.status === 'accepted' && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: C.success }}>Brand will contact you shortly. Check your deals.</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <input type="number" placeholder="Your bid amount ($)" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                  style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px' }} />
                <textarea placeholder="Why should the brand pick you? (optional)" value={bidProposal} onChange={e => setBidProposal(e.target.value)}
                  style={{ padding: '10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px', minHeight: '60px' }} />
                <button onClick={placeBid} disabled={submitting || !bidAmount}
                  style={{ padding: '10px', background: C.primary, color: '#000', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', opacity: submitting || !bidAmount ? 0.6 : 1 }}>
                  {submitting ? 'Submitting...' : 'Place Bid'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isBrandOwner && bids.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Bids ({bids.length})</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {bids.map((bid: Bid) => (
              <div key={bid.id} style={{ padding: '12px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{bid.creator_name || `Creator #${bid.creator_id}`}</span>
                    <span style={{ fontSize: '12px', color: C.textMuted, marginLeft: '8px' }}>@{bid.creator_username || ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: C.primary }}>${Number(bid.bid_amount).toFixed(2)}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'capitalize', fontWeight: 600,
                      background: bid.status === 'accepted' ? `${C.success}20` : bid.status === 'rejected' ? `${C.danger}20` : `${C.warning}20`,
                      color: bid.status === 'accepted' ? C.success : bid.status === 'rejected' ? C.danger : C.warning }}>
                      {bid.status}
                    </span>
                  </div>
                </div>
                {bid.proposal && <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px' }}>{bid.proposal}</div>}
                {bid.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => handleBidAction(bid.id, 'accept')}
                      style={{ padding: '6px 14px', background: C.success, color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '11px' }}>
                      Accept
                    </button>
                    <button onClick={() => handleBidAction(bid.id, 'reject')}
                      style={{ padding: '6px 14px', background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isBrandOwner && (invites.length > 0 || bids.length > 0) && (
        <div style={{ marginBottom: '20px', padding: '16px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>Campaign Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', background: C.surfaceAlt, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{invites.length}</div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>Total Invites</div>
            </div>
            <div style={{ padding: '12px', background: C.surfaceAlt, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: C.success }}>{invites.filter((i: any) => i.status === 'accepted').length}</div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>Accepted</div>
            </div>
            <div style={{ padding: '12px', background: C.surfaceAlt, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: C.warning }}>{bids.length}</div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>Bids Received</div>
            </div>
            <div style={{ padding: '12px', background: C.surfaceAlt, borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>${Number(campaign.budget_per_creator) * invites.filter((i: any) => i.status === 'accepted').length}</div>
              <div style={{ fontSize: '11px', color: C.textMuted }}>Est. Spend</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Invites ({invites.length})</h2>
        {invites.length === 0 ? (
          <div style={{ color: C.textMuted, textAlign: 'center', padding: '20px' }}>
            {isBrandOwner ? (
              'No creators invited yet. Use auto-match to find creators or browse creator search.'
            ) : (
              'No invites yet for this campaign.'
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {invites.map((inv: any) => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: C.surface, borderRadius: '8px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>{(inv.creator_name || '?')[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{inv.creator_name || `Creator #${inv.creator_id}`}</div>
                    <div style={{ fontSize: '12px', color: C.textMuted }}>@{inv.creator_username || ''}</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', textTransform: 'capitalize', fontWeight: 600,
                  background: inv.status === 'accepted' ? `${C.success}20` : inv.status === 'declined' ? `${C.danger}20` : `${C.warning}20`,
                  color: inv.status === 'accepted' ? C.success : inv.status === 'declined' ? C.danger : C.warning }}>{inv.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
