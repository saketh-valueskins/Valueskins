import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function CompleteProfile() {
  const router = useRouter();
  const { type } = router.query; // 'creator' or 'brand'
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [formData, setFormData] = useState({
    upi_id: '',
    bank_account: '',
    ifsc: '',
    company_name: '',
    industry: '',
    niche: '',
    rate: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'creator') {
        // Save creator profile + bank details
        const res = await fetch('/api/profile/complete-bank-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator_id: 'current_user_id', // Get from auth context
            payment_method: paymentMethod,
            upi_id: formData.upi_id,
            bank_account: formData.bank_account,
            ifsc: formData.ifsc,
          }),
        });

        if (res.ok) {
          // Mark profile as complete
          await fetch('/api/profile/mark-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_type: 'creator' }),
          });
          router.push('/marketplace');
        }
      } else if (type === 'brand') {
        // Save brand profile
        await fetch('/api/profile/complete-brand-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: formData.company_name,
            industry: formData.industry,
          }),
        });
        router.push('/marketplace');
      }
    } catch (error) {
      console.error('Profile completion error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (type === 'creator') {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '20px' }}>
        <h1>Complete Your Creator Profile</h1>
        <p style={{ color: '#999', marginBottom: '30px' }}>
          Set up your bank account once. Stored securely in Razorpay's encrypted vault.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label>
              <input
                type="radio"
                value="upi"
                checked={paymentMethod === 'upi'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />{' '}
              UPI (Recommended)
            </label>
            <label style={{ marginLeft: '20px' }}>
              <input
                type="radio"
                value="bank"
                checked={paymentMethod === 'bank'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />{' '}
              Bank Account
            </label>
          </div>

          {paymentMethod === 'upi' && (
            <div style={{ marginBottom: '20px' }}>
              <label>
                <div>UPI ID (e.g., yourname@okhdfcbank)</div>
                <input
                  type="text"
                  value={formData.upi_id}
                  onChange={(e) =>
                    setFormData({ ...formData, upi_id: e.target.value })
                  }
                  placeholder="yourname@bankname"
                  required
                  style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                />
              </label>
            </div>
          )}

          {paymentMethod === 'bank' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label>
                  <div>Account Number</div>
                  <input
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_account: e.target.value })
                    }
                    placeholder="Your bank account number"
                    required
                    style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label>
                  <div>IFSC Code</div>
                  <input
                    type="text"
                    value={formData.ifsc}
                    onChange={(e) =>
                      setFormData({ ...formData, ifsc: e.target.value })
                    }
                    placeholder="SBIN0001234"
                    required
                    style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                  />
                </label>
              </div>
            </>
          )}

          <div
            style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              lineHeight: '1.6',
            }}
          >
            ✓ Your {paymentMethod === 'upi' ? 'UPI ID' : 'bank details'} is stored{' '}
            <strong>one time only</strong>
            <br />✓ Stored in <strong>Razorpay's encrypted vault</strong>, not on our
            servers
            <br />✓ Razorpay is <strong>PCI-DSS Level 1 certified</strong>
            <br />✓ You can update anytime in Settings
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
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
            {loading ? 'Saving...' : 'Complete Profile & Continue'}
          </button>
        </form>
      </div>
    );
  }

  // Brand profile
  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '20px' }}>
      <h1>Complete Your Brand Profile</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>Company Name</div>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) =>
                setFormData({ ...formData, company_name: e.target.value })
              }
              placeholder="Your company name"
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            <div>Industry</div>
            <select
              value={formData.industry}
              onChange={(e) =>
                setFormData({ ...formData, industry: e.target.value })
              }
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px' }}
            >
              <option value="">Select industry</option>
              <option value="ecommerce">E-commerce</option>
              <option value="fashion">Fashion</option>
              <option value="tech">Technology</option>
              <option value="food">Food & Beverage</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
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
          {loading ? 'Saving...' : 'Complete Profile & Continue'}
        </button>
      </form>
    </div>
  );
}
