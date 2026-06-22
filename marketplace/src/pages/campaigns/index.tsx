'use client';
import MarketplaceLayout from '@/components/MarketplaceLayout';
import CampaignList from '@/features/campaigns/CampaignList';

export default function CampaignsPage() {
  return (
    <MarketplaceLayout title="Campaigns" hideHeader>
      <CampaignList />
    </MarketplaceLayout>
  );
}
