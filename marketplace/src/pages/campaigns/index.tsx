'use client';
import type { GetServerSidePropsContext } from 'next';
import { getSessionUserId } from '@/lib/session';
import { query } from '@/lib/db';
import MarketplaceLayout from '@/components/MarketplaceLayout';
import CampaignList from '@/features/campaigns/CampaignList';

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const cookie = ctx.req.headers.cookie || '';
  const userId = await getSessionUserId(cookie);
  if (!userId) return { props: { initialCampaigns: [], initialPagination: null } };

  try {
    const page = 1, pageSize = 20, offset = 0;
    const countResult = await query('SELECT COUNT(*) as total FROM campaigns WHERE brand_id = $1', [userId]);
    const total = parseInt(countResult.rows[0]?.total || '0');
    const r = await query(
      `SELECT c.*, COUNT(ci.id) as invite_count,
        COUNT(ci.id) FILTER (WHERE ci.status = 'accepted') as accepted_count
       FROM campaigns c
       LEFT JOIN campaign_invites ci ON c.id = ci.campaign_id
       WHERE c.brand_id = $1
       GROUP BY c.id ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    return {
      props: {
        initialCampaigns: r.rows || [],
        initialPagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total },
      },
    };
  } catch {
    return { props: { initialCampaigns: [], initialPagination: null } };
  }
}

interface CampaignsPageProps {
  initialCampaigns: any[];
  initialPagination: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean } | null;
}

export default function CampaignsPage({ initialCampaigns = [], initialPagination = null }: CampaignsPageProps) {
  return (
    <MarketplaceLayout title="Campaigns" hideHeader>
      <CampaignList initialCampaigns={initialCampaigns} initialPagination={initialPagination} />
    </MarketplaceLayout>
  );
}
