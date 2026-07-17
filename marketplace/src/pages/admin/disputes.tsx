'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const C = {
  bg: '#0A0A0A',
  surface: 'rgba(10, 10, 10, 0.86)',
  card: 'rgba(20, 20, 20, 0.8)',
  border: 'rgba(184, 180, 172, 0.18)',
  text: '#F5F5F0',
  textSecondary: '#B8B4AC',
  primary: '#C8B89A',
};

export default function AdminDisputes() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
        credentials: 'include',
      });

      if (!res.ok) {
        router.push('/admin/login');
        return;
      }

      setAuthenticated(true);
    } catch (err) {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.textSecondary }}>Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/admin/main" style={{ color: C.primary, textDecoration: 'none', fontSize: '14px', marginRight: '20px' }}>← Back</Link>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: C.text, margin: 0, flex: 1 }}>Disputed Deals</h1>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: C.textSecondary, fontSize: '16px' }}>No disputed deals at this time.</p>
          <p style={{ color: C.textSecondary, fontSize: '14px' }}>Deals with disputes will appear here for manual review.</p>
        </div>
      </div>
    </div>
  );
}
