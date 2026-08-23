import React from 'react';

interface BrandVerificationBadgeProps {
  status: 'verified' | 'pending' | 'rejected';
  brandName: string;
}

export default function BrandVerificationBadge({ status, brandName }: BrandVerificationBadgeProps) {
  const statusStyles = {
    verified: { background: 'rgba(200, 184, 154, 0.1)', color: '#166534', text: 'Verified' },
    pending: { background: 'rgba(200, 184, 154, 0.1)', color: '#92400e', text: 'Pending' },
    rejected: { background: 'rgba(176, 65, 62, 0.1)', color: 'var(--c-error)', text: 'Rejected' },
  };

  const style = statusStyles[status];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: style.background, color: style.color, borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
      <span>{status === 'verified' ? '✓' : status === 'pending' ? '⏳' : '✗'}</span>
      <span>{style.text}</span>
    </div>
  );
}
