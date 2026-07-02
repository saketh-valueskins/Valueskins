'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const C = {
  primary: '#2563EB',
  bg: '#ffffff',
  surface: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  success: '#22c55e',
  danger: '#ef4444',
};

const ADMIN_PASSWORD = 'ValueskinsfounderOnly@123';

export default function AdminPanel() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [googleAuthVerified, setGoogleAuthVerified] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'users'>('dashboard');
  const [suspensionPassword, setSuspensionPassword] = useState('');
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<string | null>(null);

  // Check Google OAuth on mount
  useEffect(() => {
    const checkGoogleAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setAdminEmail(data.email);
          setGoogleAuthVerified(true);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      }
    };
    checkGoogleAuth();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD && googleAuthVerified) {
      setAuthenticated(true);
      setPasswordInput('');
    } else {
      alert('Invalid password or not authenticated with Google');
    }
  };

  const handleSuspendUser = (userId: string) => {
    setUserToSuspend(userId);
    setShowSuspensionModal(true);
  };

  const confirmSuspension = () => {
    if (!userToSuspend) return;

    // Save suspension to localStorage
    const suspensions = JSON.parse(localStorage.getItem('vs_admin_suspensions') || '{}');
    suspensions[userToSuspend] = {
      suspendedAt: new Date().toISOString(),
      suspendedBy: adminEmail,
      status: 'suspended'
    };
    localStorage.setItem('vs_admin_suspensions', JSON.stringify(suspensions));

    // Log action
    const logs = JSON.parse(localStorage.getItem('vs_admin_logs') || '[]');
    logs.push({
      action: 'suspend_user',
      userId: userToSuspend,
      timestamp: new Date().toISOString(),
      admin: adminEmail
    });
    localStorage.setItem('vs_admin_logs', JSON.stringify(logs));

    alert(`User ${userToSuspend} has been suspended`);
    setShowSuspensionModal(false);
    setSuspensionPassword('');
    setUserToSuspend(null);
  };

  if (!googleAuthVerified) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Admin Panel</h1>
        <p style={{ fontSize: '14px', color: C.textSecondary, marginBottom: '24px' }}>
          You must be logged in with Google to access the admin panel.
        </p>
        <a href="/api/auth/login" style={{ background: C.primary, color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, display: 'inline-block' }}>
          Login with Google
        </a>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.text, marginBottom: '24px' }}>Admin Panel</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>
              Admin Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${C.border}`,
                fontSize: '14px',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Login
          </button>
        </form>
        <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '16px' }}>
          Logged in as: <strong>{adminEmail}</strong>
        </p>
      </div>
    );
  }

  // Dashboard content
  const allUsers = JSON.parse(localStorage.getItem('vs_demo_my_profile') || '{}');
  const reports = JSON.parse(localStorage.getItem('vs_demo_deal_reports') || '[]');
  const suspensions = JSON.parse(localStorage.getItem('vs_admin_suspensions') || '{}');

  return (
    <div style={{ minHeight: '100vh', background: C.surface }}>
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>ValueSkins Admin</h1>
          <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0 0' }}>Logged in as {adminEmail}</p>
        </div>
        <button
          onClick={() => {
            setAuthenticated(false);
            router.push('/');
          }}
          style={{
            padding: '8px 16px',
            background: C.danger,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '0' }}>
        {(['dashboard', 'reports', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '16px 20px',
              background: activeTab === tab ? C.primary : 'transparent',
              color: activeTab === tab ? '#fff' : C.textSecondary,
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
              borderBottom: activeTab === tab ? `3px solid ${C.primary}` : 'none',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '20px' }}>Platform Overview</h2>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Users', value: Object.keys(allUsers).length, color: '#2563EB' },
                { label: 'Deal Reports', value: reports.length, color: '#22c55e' },
                { label: 'Suspended Accounts', value: Object.keys(suspensions).length, color: '#ef4444' },
              ].map((stat) => (
                <div key={stat.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Demographics */}
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>User Demographics</h3>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.6 }}>
                <p><strong>Age Ranges:</strong></p>
                <ul style={{ margin: '8px 0' }}>
                  {(() => {
                    const ageRanges: Record<string, number> = {};
                    // Count age ranges from all users (would need to iterate through actual user data)
                    return Object.entries(ageRanges).length > 0
                      ? Object.entries(ageRanges).map(([range, count]) => <li key={range}>{range}: {count}</li>)
                      : <li>No data yet</li>;
                  })()}
                </ul>
                <p style={{ marginTop: '12px' }}><strong>Genders:</strong></p>
                <ul style={{ margin: '8px 0' }}>
                  <li>Data aggregated from user profiles</li>
                </ul>
                <p style={{ marginTop: '12px' }}><strong>Locations:</strong></p>
                <ul style={{ margin: '8px 0' }}>
                  <li>Data aggregated from user profiles</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '20px' }}>Deal Reports</h2>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '12px' }}>
                All deal PDF reports are automatically uploaded to your Google Drive folder:
              </p>
              <a
                href="https://drive.google.com/drive/folders/1DEeqQXXQclLJUKhdiLeDpe6id27rVeTH"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '10px 16px',
                  background: C.primary,
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  marginBottom: '20px',
                }}
              >
                Open Google Drive Folder
              </a>
              <div style={{ fontSize: '12px', color: C.textMuted }}>
                {reports.length > 0 ? (
                  <div>
                    <p><strong>Reports on file:</strong> {reports.length}</p>
                    <ul>
                      {reports.slice(0, 10).map((report: any, idx: number) => (
                        <li key={idx}>{report.dealKey} - {report.timestamp}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>No reports yet. Deal reports will appear here as they are generated.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '20px' }}>User Management</h2>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600, color: C.textMuted }}>User ID</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600, color: C.textMuted }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600, color: C.textMuted }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(allUsers).length > 0 ? (
                    Object.keys(allUsers).map((userId) => (
                      <tr key={userId} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '8px', color: C.text }}>{userId.substring(0, 20)}...</td>
                        <td style={{ padding: '8px', color: suspensions[userId] ? C.danger : C.success }}>
                          {suspensions[userId] ? 'Suspended' : 'Active'}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {!suspensions[userId] ? (
                            <button
                              onClick={() => handleSuspendUser(userId)}
                              style={{
                                padding: '4px 12px',
                                background: C.danger,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const newSuspensions = { ...suspensions };
                                delete newSuspensions[userId];
                                localStorage.setItem('vs_admin_suspensions', JSON.stringify(newSuspensions));
                                window.location.reload();
                              }}
                              style={{
                                padding: '4px 12px',
                                background: C.success,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Unsuspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: C.textMuted }}>
                        No users yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Suspension Modal */}
      {showSuspensionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: C.card,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '95vw',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>Confirm Suspension</h2>
            <p style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '16px' }}>
              This account will be suspended immediately and logged out. 7-day review period begins.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.textMuted, marginBottom: '6px' }}>
                Confirm with password:
              </label>
              <input
                type="password"
                value={suspensionPassword}
                onChange={(e) => setSuspensionPassword(e.target.value)}
                placeholder="Admin password"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${C.border}`,
                  fontSize: '13px',
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowSuspensionModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: C.border,
                  color: C.text,
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSuspension}
                disabled={suspensionPassword !== ADMIN_PASSWORD}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: suspensionPassword === ADMIN_PASSWORD ? C.danger : C.border,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: suspensionPassword === ADMIN_PASSWORD ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  opacity: suspensionPassword === ADMIN_PASSWORD ? 1 : 0.6,
                }}
              >
                Suspend Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
