import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface PayoutAccount {
  id: string;
  payment_provider: string;
  verification_status: string;
  last_four_digits: string;
  beneficiary_name: string;
  is_default: boolean;
  created_at: string;
}

export default function PayoutOnboardingPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifsc: '',
    beneficiaryName: '',
  });

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/deals/payout-accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  const validateIfsc = (code: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!form.accountHolderName.trim()) {
      setError('Account holder name is required');
      setSubmitting(false);
      return;
    }
    if (!form.accountNumber.trim() || form.accountNumber.trim().length < 9 || form.accountNumber.trim().length > 18) {
      setError('Account number must be 9-18 digits');
      setSubmitting(false);
      return;
    }
    if (!validateIfsc(form.ifsc.trim().toUpperCase())) {
      setError('Invalid IFSC code (e.g. HDFC0001234)');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/deals/onboard-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accountHolderName: form.accountHolderName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifsc: form.ifsc.trim().toUpperCase(),
          beneficiaryName: form.beneficiaryName.trim() || form.accountHolderName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to link account');
        setSubmitting(false);
        return;
      }

      setSuccess('Bank account linked successfully!');
      setForm({ accountHolderName: '', accountNumber: '', ifsc: '', beneficiaryName: '' });
      await loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Connection error');
    }
    setSubmitting(false);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Remove this payout account?')) return;
    try {
      await fetch('/api/deals/payout-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accountId }),
      });
      await loadAccounts();
    } catch { /* ignore */ }
  };

  const setAsDefault = async (accountId: string) => {
    try {
      await fetch('/api/deals/payout-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accountId, setDefault: true }),
      });
      await loadAccounts();
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div style={{ padding: 32, color: '#fff', background: '#0b0e1a', minHeight: '100vh' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: '0 auto', color: '#E0E0DA', background: '#0b0e1a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#fff' }}>Payout Settings</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
        Link your bank account to receive payouts for completed deals.
        Your account details are sent directly to Razorpay — ValueSkins stores only a reference ID.
      </p>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: '#7f1d1d', color: '#fca5a5', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: 12, borderRadius: 8, background: '#14532d', color: '#86efac', marginBottom: 16, fontSize: 14 }}>
          {success}
        </div>
      )}

      {/* Existing accounts */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#fff' }}>Linked Accounts</h2>
          {accounts.map(acc => (
            <div key={acc.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: '#111827', borderRadius: 8, border: '1px solid #1A1A1A',
              marginBottom: 8,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {acc.beneficiary_name || 'Account'} (••••{acc.last_four_digits})
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {acc.payment_provider} — {acc.verification_status}
                  {acc.is_default && <span style={{ color: '#22c55e', marginLeft: 8 }}>Default</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!acc.is_default && (
                  <button onClick={() => setAsDefault(acc.id)} style={{
                    padding: '4px 12px', background: '#1A1A1A', color: '#B8B4AC', border: '1px solid #2D2D2D',
                    borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  }}>
                    Set Default
                  </button>
                )}
                <button onClick={() => handleDelete(acc.id)} style={{
                  padding: '4px 12px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
                  borderRadius: 6, fontSize: 12, cursor: 'pointer',
                }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new account form */}
      <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1A1A1A' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Link a Bank Account</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>Account Holder Name *</label>
            <input
              value={form.accountHolderName}
              onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))}
              placeholder="Name on bank account"
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>Account Number *</label>
            <input
              value={form.accountNumber}
              onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
              placeholder="9-18 digit account number"
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>IFSC Code *</label>
            <input
              value={form.ifsc}
              onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
              placeholder="e.g. HDFC0001234"
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Beneficiary Name (optional — shown to brands)
            </label>
            <input
              value={form.beneficiaryName}
              onChange={e => setForm(f => ({ ...f, beneficiaryName: e.target.value }))}
              placeholder="Display name for payouts"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '12px', background: submitting ? '#4b5563' : '#6366f1',
            color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}>
            {submitting ? 'Linking Account...' : 'Link Bank Account'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
        <p>Your bank details are encrypted and sent directly to Razorpay (PCI-DSS compliant).
        ValueSkins stores only a reference ID and the last 4 digits of your account number.</p>
        <p style={{ marginTop: 8 }}>
          Once linked, payouts are automatically sent when deals reach payment milestones
          (advance payment on escrow funding, final payment on deliverable approval).
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#0b0e1a', border: '1px solid #1A1A1A',
  borderRadius: 8, color: '#E0E0DA', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
