'use client';
import Link from 'next/link';

const C = {
  bg: '#0f172a',
  surface: 'rgba(15, 23, 42, 0.86)',
  border: 'rgba(148, 163, 184, 0.18)',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  primary: '#38bdf8',
};

export default function GrievanceOfficer() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '60px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ color: C.primary, textDecoration: 'none', fontSize: '14px', marginBottom: '32px', display: 'inline-block' }}>
          Back to Home
        </Link>

        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>Grievance Officer</h1>
        <p style={{ color: C.textSecondary, marginBottom: '40px' }}>
          In compliance with the Information Technology Act, 2000 and the DPDP Act, 2023
        </p>

        <div style={{ lineHeight: '1.8', color: C.textSecondary }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '32px', marginBottom: '12px' }}>Contact Information</h2>
          <p>
            If you have any complaints, concerns, or queries regarding your data, privacy, or use of the platform, you may contact our Grievance Officer:
          </p>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '24px', marginTop: '16px' }}>
            <p><strong style={{ color: C.text }}>Grievance Officer:</strong> Saketh Velamuri</p>
            <p><strong style={{ color: C.text }}>Email:</strong> <a href="mailto:valueskinsfounder@gmail.com" style={{ color: C.primary }}>valueskinsfounder@gmail.com</a></p>
            <p><strong style={{ color: C.text }}>Response Time:</strong> We acknowledge within 24 hours and resolve within 30 days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
