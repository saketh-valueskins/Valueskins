import { useState } from 'react';
import { useRouter } from 'next/router';

export default function CreateCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    budget: 1000,
    requirements: '',
    script: '',
    deliverable_timeline: 3,
    media_format: 'instagram_reel',
  });
  const [commission, setCommission] = useState(885);

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const budget = parseFloat(e.target.value) || 0;
    setFormData({ ...formData, budget });
    // Commission is fixed at ₹885, not proportional
    setCommission(885);
  };

  const creatorPayout = formData.budget - commission;
  const advance = creatorPayout * 0.3;
  const final = creatorPayout * 0.7;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create deal
      const dealRes = await fetch('/api/deals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          commission_amount: commission,
          creator_payout_amount: creatorPayout,
          creator_advance: advance,
          creator_final: final,
        }),
      });

      if (!dealRes.ok) throw new Error('Failed to create deal');
      const deal = await dealRes.json();

      // Initiate commission payment
      const paymentRes = await fetch('/api/payment/initiate-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          brand_id: 'current_user_id', // Get from auth context
          amount: commission,
          description: formData.title,
        }),
      });

      if (!paymentRes.ok) throw new Error('Failed to initiate payment');
      const order = await paymentRes.json();

      // Redirect to Razorpay checkout
      // Use Razorpay checkout modal or redirect
      window.location.href = `https://checkout.razorpay.com/?key_id=${order.key_id}&order_id=${order.order_id}`;
    } catch (error) {
      console.error('Campaign creation error:', error);
      alert('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <h1>Create a Campaign</h1>
      <p style={{ color: '#999', marginBottom: '30px' }}>
        Fill out one form. No negotiations. First creator to accept gets the deal.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>
              Campaign Title <span style={{ color: 'red' }}>*</span>
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Instagram Reel for Q4 Launch"
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>
              Budget (₹) <span style={{ color: 'red' }}>*</span>
            </div>
            <input
              type="number"
              value={formData.budget}
              onChange={handleBudgetChange}
              min="1000"
              max="1000000"
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>
              Media Format <span style={{ color: 'red' }}>*</span>
            </div>
            <select
              value={formData.media_format}
              onChange={(e) =>
                setFormData({ ...formData, media_format: e.target.value })
              }
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            >
              <option value="instagram_reel">Instagram Reel</option>
              <option value="tiktok">TikTok Video</option>
              <option value="youtube_short">YouTube Short</option>
              <option value="story">Instagram Story</option>
              <option value="post">Instagram Post</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>
              Requirements/Brief <span style={{ color: 'red' }}>*</span>
            </div>
            <textarea
              value={formData.requirements}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              placeholder="Describe what you need. Who is the target audience? Key message?"
              required
              rows={4}
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>Script / Directions (Optional)</div>
            <textarea
              value={formData.script}
              onChange={(e) => setFormData({ ...formData, script: e.target.value })}
              placeholder="Any specific directions, talking points, or product demos?"
              rows={3}
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>Deliverable Timeline (days)</div>
            <input
              type="number"
              value={formData.deliverable_timeline}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  deliverable_timeline: parseInt(e.target.value),
                })
              }
              min="1"
              max="30"
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            />
          </label>
        </div>

        {/* Payment Breakdown */}
        <div
          style={{
            background: '#f5f5f5',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
          }}
        >
          <h3>Payment Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ color: '#999', fontSize: '12px' }}>Total Budget</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>
                ₹{formData.budget.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: '12px' }}>ValueSkins Commission</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>₹{commission}</div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: '12px' }}>Creator Gets</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>
                ₹{creatorPayout.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: '12px' }}>Creator Timeline</div>
              <div style={{ fontSize: '14px' }}>
                30% now (₹{advance.toLocaleString()})
                <br />
                70% on approval (₹{final.toLocaleString()})
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#007AFF',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Creating Campaign...' : 'Proceed to Payment (₹' + commission + ')'}
        </button>
      </form>
    </div>
  );
}
