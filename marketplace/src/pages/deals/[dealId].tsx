import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DealRoomChat from '@/components/DealRoomChat';
import BrandVerificationBadge from '@/components/BrandVerificationBadge';

export default function DealPage() {
  const router = useRouter();
  const { dealId } = router.query;
  const [deal, setDeal] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agreementPhase, setAgreementPhase] = useState(false);
  const [syncNotification, setSyncNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!dealId) return;

    fetch(`/api/deals/${dealId}`)
      .then(r => r.json())
      .then(d => {
        setDeal(d.deal);
        setMessages(d.messages || []);
        setLoading(false);
      });
  }, [dealId]);

  const handleAgree = async () => {
    if (!deal) return;

    setSyncNotification(null);

    const res = await fetch('/api/deals/accept-and-sync-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });

    const data = await res.json();

    if (res.ok) {
      setAgreementPhase(true);
      if (data.calendarEventId) {
        setSyncNotification({
          type: 'success',
          text: 'Deal accepted! Synced to your Google Calendar.',
        });
      } else if (data.calendarError) {
        setSyncNotification({
          type: 'info',
          text: data.calendarError,
        });
      } else {
        setSyncNotification({
          type: 'success',
          text: 'Deal accepted!',
        });
      }
    } else {
      setSyncNotification({
        type: 'error',
        text: data.error || 'Failed to accept deal',
      });
    }
  };

  const handleComplete = async () => {
    const res = await fetch('/api/deals/complete-with-release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });

    if (res.ok) {
      router.push(`/deals/${dealId}/review`);
    }
  };

  const handleSendMessage = (text: string) => {
    fetch(`/api/deals/${dealId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
  };


  if (loading) return <div>Loading...</div>;
  if (!deal) return <div>Deal not found</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
            {deal.title}
          </h1>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--c-text-variant)', fontWeight: 600 }}>
                STATUS
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {deal.status}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--c-text-variant)', fontWeight: 600 }}>
                PHASE
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {deal.phase}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--c-text-variant)', fontWeight: 600 }}>
                VALUE SKIN
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {deal.value_skin}
              </div>
            </div>

            {deal.requires_shoot_on_location && ['accepted', 'softhold', 'checklist', 'approved'].includes(deal.phase) && (
              <>
                <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--c-text-variant)', fontWeight: 600, marginBottom: '12px' }}>
                    SHOOT DETAILS
                  </div>
                  {deal.shoot_date && (
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--c-text-variant)' }}>Date:</span> {new Date(deal.shoot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                  {deal.shoot_time && (
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--c-text-variant)' }}>Time:</span> {deal.shoot_time}
                    </div>
                  )}
                  {deal.location && (
                    <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                      <span style={{ color: 'var(--c-text-variant)' }}>Location:</span> {deal.location}
                    </div>
                  )}
                  {deal.google_calendar_event_id && (
                    <div style={{ fontSize: '12px', color: 'var(--c-accent)', fontWeight: 600, padding: '10px', background: 'rgba(200, 184, 154, 0.1)', borderRadius: '6px', textAlign: 'center', marginTop: '12px' }}>
                      Synced to Google Calendar
                    </div>
                  )}
                </div>

                {deal.submission_deadline && (
                  <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--c-text-variant)', fontWeight: 600, marginBottom: '8px' }}>
                      DEADLINES
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--c-text-variant)' }}>Submit by:</span> {new Date(deal.submission_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {deal.approval_deadline && (
                      <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--c-text-variant)' }}>Approval by:</span> {new Date(deal.approval_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    {deal.posting_deadline && (
                      <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--c-text-variant)' }}>Post by:</span> {new Date(deal.posting_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    {deal.payment_due_date && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: 'var(--c-text-variant)' }}>Payment due:</span> {new Date(deal.payment_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div>
              <div style={{ fontSize: '12px', color: 'var(--c-text-variant)', fontWeight: 600 }}>
                BUDGET
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                ${deal.budget}
              </div>
            </div>

            {deal.brand_verified && (
              <BrandVerificationBadge status="verified" brandName={deal.brand_name} />
            )}

            <div style={{ display: 'grid', gap: '8px' }}>
              {!agreementPhase && (
                <button
                  onClick={handleAgree}
                  style={{
                    padding: '10px 16px',
                    background: '#0A0A0A',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Agree and Create Escrow
                </button>
              )}

              {agreementPhase && !deal.completed_at && (
                <button
                  onClick={handleComplete}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--c-accent)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Mark Complete and Release Payment
                </button>
              )}

              <a
                href={`/api/deals/export-proof?dealId=${dealId}`}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#0A0A0A',
                  border: '1px solid #0A0A0A',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Download Proof
              </a>
            </div>
          </div>
        </div>

        <DealRoomChat
          dealId={dealId as string}
          brandName={deal.brand_name}
          initialMessages={messages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
