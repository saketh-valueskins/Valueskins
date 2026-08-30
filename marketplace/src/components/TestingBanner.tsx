import React from 'react';

export default function TestingBanner() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        zIndex: 999,
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.5px',
        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
      }}
    >
      ⚠️ Testing • Launch Oct 2026
    </div>
  );
}
