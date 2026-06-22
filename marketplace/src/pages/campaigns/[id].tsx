'use client';
import { useRouter } from 'next/router';
import MarketplaceLayout from '@/components/MarketplaceLayout';
import CampaignDetail from '@/features/campaigns/CampaignDetail';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <MarketplaceLayout title="Campaign" hideHeader>
      {id ? <CampaignDetail campaignId={Number(id)} /> : <div style={{ padding: '20px', color: '#94a3b8' }}>Loading...</div>}
    </MarketplaceLayout>
  );
}
