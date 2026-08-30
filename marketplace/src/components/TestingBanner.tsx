import React from 'react';

export default function TestingBanner() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        color: 'white',
        padding: '12px 20px',
        textAlign: 'center',
        zIndex: 10000,
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: '0.5px',
      }}
    >
      ⚠️ <strong>Under Testing</strong> • Full launch expected <strong>October 2026</strong>
    </div>
  );
}
