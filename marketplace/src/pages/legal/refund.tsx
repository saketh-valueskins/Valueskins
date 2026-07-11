'use client';
import Link from 'next/link';
const C = { bg: '#0A0A0A', text: '#F5F5F0', textSecondary: '#B8B4AC', primary: '#C8B89A' };
export default function RefundPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '60px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ color: C.primary, textDecoration: 'none', fontSize: '14px', marginBottom: '32px', display: 'inline-block' }}>← Back</Link>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>Refund & Cancellation Policy</h1>
        <p style={{ color: C.textSecondary, marginBottom: '40px' }}>Effective: June 22, 2026 | Last Updated: July 11, 2026</p>
        <div style={{ lineHeight: '1.8', color: C.textSecondary }}>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>1. Overview</h2>
          <p>This Refund & Cancellation Policy ("Policy") governs all cancellations and refunds on the ValueSkins platform ("Platform"). Since ValueSkins operates an escrow-based marketplace connecting Creators and Brands, refunds and cancellations are handled within the Deal framework agreed between the parties.</p>
          <p>All payments on the Platform are processed through Razorpay (for INR transactions) and Stripe (for USD transactions). The Company never holds, controls, or has direct access to user funds.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>2. Cancellation by Mutual Agreement</h2>
          <p>Both the Creator and the Brand may agree to cancel a Deal at any stage. Upon mutual cancellation:</p>
          <p>• If no funds have been deposited, no payment is processed.</p>
          <p>• If funds are held in escrow, the full amount is refunded to the Brand within 5-7 business days (subject to Razorpay/Stripe processing timelines).</p>
          <p>• Platform fees (if any) are not charged on cancelled deals.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>3. Cancellation by Brand (Before Delivery)</h2>
          <p>A Brand may cancel a Deal before the Creator submits Deliverables:</p>
          <p>• The full escrow amount is refunded to the Brand.</p>
          <p>• No platform fee is charged.</p>
          <p>• Refunds are processed within 5-7 business days to the original payment method.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>4. Cancellation Due to Non-Delivery</h2>
          <p>If a Creator fails to submit Deliverables within the agreed timeline, the Brand may cancel the Deal and receive a full refund. The Platform's auto-resolution system also triggers a full refund to the Brand if the Creator misses the deadline by more than 7 days without communication.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>5. Kill Fee (Partial Cancellation)</h2>
          <p>If a Creator has partially completed work, the Brand and Creator may agree to a kill fee — a partial payment for partial delivery. The amount is negotiated between the parties. If the Brand agrees to pay the kill fee:</p>
          <p>• The kill fee amount is released from escrow to the Creator.</p>
          <p>• The remaining escrow balance is refunded to the Brand.</p>
          <p>• The Platform fee (2%) applies only to the amount released.</p>
          <p>If the parties cannot agree on a kill fee, the dispute resolution process in Section 7 applies.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>6. Auto-Resolution & Default Rules</h2>
          <p>If neither party takes action within defined timeframes:</p>
          <p>• <strong>Brand fails to review:</strong> If a Brand does not review submitted Deliverables within 7 calendar days, the Deliverables are deemed approved and funds are released to the Creator.</p>
          <p>• <strong>Creator fails to deliver:</strong> If a Creator does not submit Deliverables within the agreed timeline plus a 7-day grace period, the Brand may cancel and receive a full refund.</p>
          <p>• <strong>Stalemate:</strong> If no resolution is reached within 14 days of a dispute, the escrow is split 70% to the Brand and 30% to the Creator, unless either party objects within 48 hours of notice.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>7. Dispute Resolution & Refunds</h2>
          <p>If a Brand is unsatisfied with Deliverables and the Creator disagrees with the refund request:</p>
          <p>1. <strong>Negotiation:</strong> Both parties attempt to resolve through the Platform's messaging system (7 days).</p>
          <p>2. <strong>Moderation:</strong> If negotiation fails, the dispute is escalated to the Platform's moderation team, which reviews Deal terms, deliverables, and communications. The moderator may recommend: (a) full refund, (b) partial refund / kill fee, or (c) release of funds to Creator.</p>
          <p>3. <strong>Arbitration:</strong> If the moderator's decision is not accepted by either party, the dispute proceeds to binding arbitration under the Arbitration and Conciliation Act, 1996, in Mumbai, India.</p>
          <p>During the dispute resolution process, funds remain frozen in escrow until resolution.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>8. Refund Timelines</h2>
          <p>Once a refund is approved (by mutual agreement, moderation, or arbitration):</p>
          <p>• <strong>Razorpay (INR):</strong> Refunds are credited within 5-7 business days to the original payment method (UPI, net banking, card, or wallet).</p>
          <p>• <strong>Stripe (USD):</strong> Refunds are credited within 5-10 business days to the original payment method.</p>
          <p>• <strong>Platform fees:</strong> Any platform fee already deducted is refunded proportionally if the refund is granted in full.</p>
          <p>Refunds are processed by Razorpay/Stripe directly from the escrow account. ValueSkins does not hold or process refunds directly.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>9. Non-Refundable Items</h2>
          <p>The following are not eligible for refund:</p>
          <p>• Services that have been fully delivered and approved by the Brand.</p>
          <p>• Platform fees on completed deals (services rendered).</p>
          <p>• Milestone payments that have been individually approved by the Brand for completed milestones.</p>
          <p>• Any payment where the Brand has explicitly waived the right to refund in the Deal terms (e.g., "no refund" clauses agreed in writing).</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>10. Chargebacks</h2>
          <p>If a Brand initiates a chargeback with their bank or card issuer instead of using the Platform's dispute resolution process:</p>
          <p>• The relevant Creator account will be notified and may be suspended pending investigation.</p>
          <p>• We will provide all Deal records, communications, and delivery evidence to the payment processor to contest the chargeback.</p>
          <p>• Brands who abuse chargebacks may have their accounts permanently suspended.</p>
          <p>• If a chargeback is found to be fraudulent, the Brand may be pursued for recovery of costs.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>11. Cancellation by ValueSkins</h2>
          <p>We reserve the right to cancel any Deal or account in the following circumstances:</p>
          <p>• Violation of our Terms of Service or Acceptable Use Policy.</p>
          <p>• Suspected fraudulent, illegal, or prohibited activity.</p>
          <p>• Technical errors resulting in duplicate or erroneous payments.</p>
          <p>In such cases, any funds held in escrow will be returned to the Brand after deducting applicable fees for services already rendered.</p>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginTop: '24px', marginBottom: '12px' }}>12. Contact for Refund Queries</h2>
          <p>If you have questions about a refund or cancellation:</p>
          <p><strong>Email:</strong> <Link href="mailto:support@valueskins.com" style={{color: C.primary}}>support@valueskins.com</Link></p>
          <p><strong>Grievance Officer:</strong> <Link href="/legal/grievance" style={{color: C.primary}}>Click here for Grievance Officer details</Link></p>
          <p><strong>Response Time:</strong> We acknowledge all refund queries within 24 hours and aim to resolve within 7 business days.</p>

        </div>
      </div>
    </div>
  );
}
