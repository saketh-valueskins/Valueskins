import { query } from './db';
import { getLevel } from './levels';

export interface DateRange {
  from: string;
  to: string;
}

// ──────────────────────────────────────
// CREATOR ANALYTICS
// ──────────────────────────────────────

export interface CreatorAnalytics {
  revenue: RevenueAnalytics;
  deals: DealAnalytics;
  brands: BrandRelationshipAnalytics;
  campaigns: CampaignAnalytics;
  performance: PerformanceAnalytics;
  levels: LevelAnalytics;
}

export interface RevenueAnalytics {
  lifetimeEarnings: number;
  thisMonth: number;
  thisQuarter: number;
  thisYear: number;
  growthPercent: number;
  byMonth: Array<{ month: string; earnings: number }>;
  byBrand: Array<{ brandName: string; earnings: number; dealCount: number }>;
  byCampaign: Array<{ title: string; earnings: number }>;
}

export interface DealAnalytics {
  total: number;
  active: number;
  pending: number;
  cancelled: number;
  disputed: number;
  acceptanceRate: number;
  completionRate: number;
  repeatDealRate: number;
  byStatus: Array<{ status: string; count: number }>;
  volumeByMonth: Array<{ month: string; count: number }>;
}

export interface BrandRelationshipAnalytics {
  totalBrands: number;
  repeatBrands: number;
  repeatPercent: number;
  avgRevenuePerBrand: number;
  topBrands: Array<{ brandName: string; revenue: number; deals: number }>;
  brandRetention: number;
}

export interface CampaignAnalytics {
  participated: number;
  completionRate: number;
  avgValue: number;
  topCampaigns: Array<{ title: string; earnings: number }>;
  byCategory: Array<{ category: string; count: number; earnings: number }>;
}

export interface PerformanceAnalytics {
  avgDeliveryDays: number;
  revisionsRequested: number;
  totalReviews: number;
  avgRating: number;
  ratingTrend: Array<{ month: string; rating: number }>;
  disputes: number;
}

export interface LevelAnalytics {
  currentLevel: number;
  dealsCompleted: number;
  dealsToNextLevel: number;
  history: Array<{ level: number; achievedAt: string }>;
}

// ──────────────────────────────────────
// BRAND ANALYTICS
// ──────────────────────────────────────

export interface BrandAnalytics {
  spend: SpendAnalytics;
  creators: CreatorHiringAnalytics;
  campaigns: BrandCampaignAnalytics;
  marketplace: MarketplaceAnalytics;
  relationships: CreatorRelationshipAnalytics;
}

export interface SpendAnalytics {
  total: number;
  thisMonth: number;
  thisQuarter: number;
  thisYear: number;
  growthPercent: number;
  byMonth: Array<{ month: string; amount: number }>;
  byCreator: Array<{ creatorName: string; amount: number; dealCount: number }>;
  byCampaign: Array<{ title: string; amount: number }>;
}

export interface CreatorHiringAnalytics {
  totalCreators: number;
  repeatCreators: number;
  avgCostPerCreator: number;
  retentionRate: number;
  byCategory: Array<{ category: string; count: number; spend: number }>;
  hiringTrend: Array<{ month: string; newCreators: number }>;
}

export interface BrandCampaignAnalytics {
  created: number;
  completed: number;
  active: number;
  avgCost: number;
  completionRate: number;
  byCategory: Array<{ category: string; count: number; spend: number }>;
}

export interface MarketplaceAnalytics {
  avgApplicantsPerCampaign: number;
  applicationTrend: Array<{ month: string; applications: number }>;
  acceptanceRate: number;
  campaignFillRate: number;
  avgDaysToFill: number;
}

export interface CreatorRelationshipAnalytics {
  mostHired: Array<{ creatorName: string; deals: number; totalSpend: number }>;
  highestSpend: Array<{ creatorName: string; totalSpend: number }>;
  longestRelationships: Array<{ creatorName: string; daysSinceFirst: number; totalDeals: number }>;
  rehireRate: number;
}

function monthKey(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
}

function startOfQuarter(): Date {
  const d = new Date();
  const m = d.getMonth();
  d.setMonth(m - (m % 3), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfYear(): Date {
  const d = new Date();
  d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
  return d;
}

// ──────────────────────────────────────
// QUERY FUNCTIONS
// ──────────────────────────────────────

export async function getCreatorAnalytics(accountId: number): Promise<CreatorAnalytics> {
  const [revenueRows, dealRows, brandRows, campaignRows, reviewRows, levelRows] = await Promise.all([
    query(`
      SELECT
        COALESCE(SUM(CASE WHEN d.phase = 'completed' THEN d.offer_amount ELSE 0 END), 0) as lifetime_earnings,
        COALESCE(SUM(CASE WHEN d.phase = 'completed' AND d.completed_at >= $2 THEN d.offer_amount ELSE 0 END), 0) as this_month,
        COALESCE(SUM(CASE WHEN d.phase = 'completed' AND d.completed_at >= $3 THEN d.offer_amount ELSE 0 END), 0) as this_quarter,
        COALESCE(SUM(CASE WHEN d.phase = 'completed' AND d.completed_at >= $4 THEN d.offer_amount ELSE 0 END), 0) as this_year
      FROM deals d WHERE d.creator_id = $1
    `, [accountId, startOfMonth().toISOString(), startOfQuarter().toISOString(), startOfYear().toISOString()]),

    query(`
      SELECT phase, COUNT(*) as count FROM deals
      WHERE creator_id = $1 GROUP BY phase
    `, [accountId]),

    query(`
      SELECT a.display_name as brand_name, COUNT(*) as deals,
        COALESCE(SUM(d.offer_amount), 0) as revenue
      FROM deals d JOIN accounts a ON d.brand_id = a.id
      WHERE d.creator_id = $1 AND d.phase IN ('completed', 'checklist')
      GROUP BY a.display_name ORDER BY revenue DESC
    `, [accountId]),

    query(`
      SELECT COALESCE(d.brief_title, 'Untitled') as title, d.offer_amount as earnings
      FROM deals d WHERE d.creator_id = $1 AND d.phase = 'completed'
      ORDER BY d.offer_amount DESC LIMIT 10
    `, [accountId]),

    query(`
      SELECT COUNT(*) as total,
        COALESCE(AVG(rating_quality), 0) as avg_rating
      FROM deal_reviews WHERE reviewee_id = (SELECT id FROM users WHERE account_id = $1 LIMIT 1)
    `, [accountId]),

    query(`
      SELECT ur.deals_completed FROM user_reputation ur WHERE ur.account_id = $1
    `, [accountId]),
  ]);

  const revenue = revenueRows.rows[0] || {};
  const dealCounts = dealRows.rows || [];
  const brandMap = brandRows.rows || [];
  const campaignList = campaignRows.rows || [];
  const reviewRow = reviewRows.rows[0] || {};
  const repRow = levelRows.rows[0] || {};

  const dealsCompleted = repRow.deals_completed || 0;
  const currentLevel = getLevel(dealsCompleted);
  const nextThreshold = [5, 15, 35, 75, Infinity][Math.min(currentLevel - 1, 4)];

  // Monthly earnings trend
  const monthlyRows = await query(`
    SELECT DATE_TRUNC('month', d.completed_at) as month,
      COALESCE(SUM(d.offer_amount), 0) as earnings
    FROM deals d WHERE d.creator_id = $1 AND d.phase = 'completed'
      AND d.completed_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', d.completed_at) ORDER BY month
  `, [accountId]);

  // Rating trend
  const ratingRows = await query(`
    SELECT DATE_TRUNC('month', dr.created_at) as month,
      AVG(dr.rating_quality) as rating
    FROM deal_reviews dr
    WHERE dr.reviewee_id = (SELECT id FROM users WHERE account_id = $1 LIMIT 1)
      AND dr.created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', dr.created_at) ORDER BY month
  `, [accountId]);

  const totalDeals = dealCounts.reduce((s: number, r: any) => s + parseInt(r.count), 0);
  const completedCount = dealCounts.find((r: any) => r.phase === 'completed')?.count || 0;
  const activeCount = dealCounts.filter((r: any) => r.phase === 'checklist' || r.phase === 'quality_check').reduce((s: number, r: any) => s + parseInt(r.count), 0);
  const pendingCount = dealCounts.filter((r: any) => r.phase !== 'completed' && r.phase !== 'cancelled' && r.phase !== 'disputed').reduce((s: number, r: any) => s + parseInt(r.count), 0);
  const cancelledCount = dealCounts.find((r: any) => r.phase === 'cancelled')?.count || 0;
  const disputedCount = 0; // disputes not tracked by phase

  const repeatBrands = brandMap.filter((r: any) => parseInt(r.deals) > 1);
  const totalBrands = brandMap.length;

  return {
    revenue: {
      lifetimeEarnings: parseFloat(revenue.lifetime_earnings || '0'),
      thisMonth: parseFloat(revenue.this_month || '0'),
      thisQuarter: parseFloat(revenue.this_quarter || '0'),
      thisYear: parseFloat(revenue.this_year || '0'),
      growthPercent: 0,
      byMonth: monthlyRows.rows.map((r: any) => ({ month: monthKey(new Date(r.month)), earnings: parseFloat(r.earnings) })),
      byBrand: brandMap.map((r: any) => ({ brandName: r.brand_name, earnings: parseFloat(r.revenue), dealCount: parseInt(r.deals) })),
      byCampaign: campaignList.map((r: any) => ({ title: r.title, earnings: parseFloat(r.earnings) })),
    },
    deals: {
      total: totalDeals,
      active: activeCount,
      pending: pendingCount,
      cancelled: parseInt(cancelledCount),
      disputed: disputedCount,
      acceptanceRate: totalDeals > 0 ? Math.round((completedCount / totalDeals) * 100) : 0,
      completionRate: totalDeals > 0 ? Math.round((completedCount / totalDeals) * 100) : 0,
      repeatDealRate: totalBrands > 0 ? Math.round((repeatBrands.length / totalBrands) * 100) : 0,
      byStatus: dealCounts.map((r: any) => ({ status: r.phase, count: parseInt(r.count) })),
      volumeByMonth: [],
    },
    brands: {
      totalBrands,
      repeatBrands: repeatBrands.length,
      repeatPercent: totalBrands > 0 ? Math.round((repeatBrands.length / totalBrands) * 100) : 0,
      avgRevenuePerBrand: totalBrands > 0 ? parseFloat(revenue.lifetime_earnings || '0') / totalBrands : 0,
      topBrands: brandMap.slice(0, 10).map((r: any) => ({ brandName: r.brand_name, revenue: parseFloat(r.revenue), deals: parseInt(r.deals) })),
      brandRetention: totalBrands > 0 ? Math.round((repeatBrands.length / totalBrands) * 100) : 0,
    },
    campaigns: {
      participated: campaignList.length,
      completionRate: totalDeals > 0 ? Math.round((completedCount / totalDeals) * 100) : 0,
      avgValue: completedCount > 0 ? parseFloat(revenue.lifetime_earnings || '0') / completedCount : 0,
      topCampaigns: campaignList.slice(0, 5).map((r: any) => ({ title: r.title, earnings: parseFloat(r.earnings) })),
      byCategory: [],
    },
    performance: {
      avgDeliveryDays: 0,
      revisionsRequested: 0,
      totalReviews: parseInt(reviewRow.total || '0'),
      avgRating: parseFloat(reviewRow.avg_rating || '0'),
      ratingTrend: ratingRows.rows.map((r: any) => ({ month: monthKey(new Date(r.month)), rating: parseFloat(r.rating) })),
      disputes: 0,
    },
    levels: {
      currentLevel,
      dealsCompleted,
      dealsToNextLevel: Math.max(0, nextThreshold - dealsCompleted),
      history: [],
    },
  };
}

export async function getBrandAnalytics(accountId: number): Promise<BrandAnalytics> {
  const [spendRows, dealRows, creatorRows, campaignRows, applicantRows, brandCreators] = await Promise.all([
    query(`
      SELECT
        COALESCE(SUM(offer_amount), 0) as total,
        COALESCE(SUM(CASE WHEN phase = 'completed' AND completed_at >= $2 THEN offer_amount ELSE 0 END), 0) as this_month,
        COALESCE(SUM(CASE WHEN phase = 'completed' AND completed_at >= $3 THEN offer_amount ELSE 0 END), 0) as this_quarter,
        COALESCE(SUM(CASE WHEN phase = 'completed' AND completed_at >= $4 THEN offer_amount ELSE 0 END), 0) as this_year
      FROM deals WHERE brand_id = $1
    `, [accountId, startOfMonth().toISOString(), startOfQuarter().toISOString(), startOfYear().toISOString()]),

    query(`
      SELECT phase, COUNT(*) as count FROM deals
      WHERE brand_id = $1 GROUP BY phase
    `, [accountId]),

    query(`
      SELECT a.display_name as creator_name, COUNT(*) as deals,
        COALESCE(SUM(d.offer_amount), 0) as amount
      FROM deals d JOIN accounts a ON d.creator_id = a.id
      WHERE d.brand_id = $1 AND d.phase IN ('completed', 'checklist')
      GROUP BY a.display_name ORDER BY amount DESC
    `, [accountId]),

    query(`
      SELECT phase as status, COUNT(*) as count FROM opportunities
      WHERE brand_user_id = (SELECT id FROM users WHERE account_id = $1 LIMIT 1)
      GROUP BY phase
    `, [accountId]),

    query(`
      SELECT COUNT(*) as total FROM opportunity_applications oa
      JOIN opportunities o ON oa.opportunity_id = o.id
      WHERE o.brand_user_id = (SELECT id FROM users WHERE account_id = $1 LIMIT 1)
    `, [accountId]),

    query(`
      SELECT a.display_name as creator_name,
        COUNT(*) as total_deals,
        COALESCE(SUM(d.offer_amount), 0) as total_spend,
        MIN(d.created_at) as first_deal_date
      FROM deals d JOIN accounts a ON d.creator_id = a.id
      WHERE d.brand_id = $1 AND d.phase = 'completed'
      GROUP BY a.display_name
      ORDER BY total_spend DESC
    `, [accountId]),
  ]);

  const spend = spendRows.rows[0] || {};
  const dealCounts = dealRows.rows || [];
  const creatorList = creatorRows.rows || [];
  const campaignsList = campaignRows.rows || [];
  const brandCreatorList = brandCreators.rows || [];

  const totalDeals = dealCounts.reduce((s: number, r: any) => s + parseInt(r.count), 0);
  const totalCampaigns = campaignsList.reduce((s: number, r: any) => s + parseInt(r.count), 0);
  const completed = dealCounts.find((r: any) => r.phase === 'completed')?.count || 0;
  const activeCamps = campaignsList.filter((r: any) => r.status === 'open' || r.status === 'active').reduce((s: number, r: any) => s + parseInt(r.count), 0);

  const monthlySpend = await query(`
    SELECT DATE_TRUNC('month', d.completed_at) as month,
      COALESCE(SUM(d.offer_amount), 0) as amount
    FROM deals d WHERE d.brand_id = $1 AND d.phase = 'completed'
      AND d.completed_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', d.completed_at) ORDER BY month
  `, [accountId]);

  const repeatCreators = creatorList.filter((r: any) => parseInt(r.deals) > 1);

  return {
    spend: {
      total: parseFloat(spend.total || '0'),
      thisMonth: parseFloat(spend.this_month || '0'),
      thisQuarter: parseFloat(spend.this_quarter || '0'),
      thisYear: parseFloat(spend.this_year || '0'),
      growthPercent: 0,
      byMonth: (monthlySpend.rows || []).map((r: any) => ({ month: monthKey(new Date(r.month)), amount: parseFloat(r.amount) })),
      byCreator: creatorList.map((r: any) => ({ creatorName: r.creator_name, amount: parseFloat(r.amount), dealCount: parseInt(r.deals) })),
      byCampaign: [],
    },
    creators: {
      totalCreators: creatorList.length,
      repeatCreators: repeatCreators.length,
      avgCostPerCreator: creatorList.length > 0 ? parseFloat(spend.total || '0') / creatorList.length : 0,
      retentionRate: creatorList.length > 0 ? Math.round((repeatCreators.length / creatorList.length) * 100) : 0,
      byCategory: [],
      hiringTrend: [],
    },
    campaigns: {
      created: totalCampaigns,
      completed: campaignsList.find((r: any) => r.status === 'completed')?.count || 0,
      active: activeCamps,
      avgCost: totalCampaigns > 0 ? parseFloat(spend.total || '0') / totalCampaigns : 0,
      completionRate: totalCampaigns > 0 ? Math.round((completed / totalDeals) * 100) : 0,
      byCategory: [],
    },
    marketplace: {
      avgApplicantsPerCampaign: 0,
      applicationTrend: [],
      acceptanceRate: 0,
      campaignFillRate: 0,
      avgDaysToFill: 0,
    },
    relationships: {
      mostHired: brandCreatorList.slice(0, 10).map((r: any) => ({
        creatorName: r.creator_name,
        deals: parseInt(r.total_deals),
        totalSpend: parseFloat(r.total_spend),
      })),
      highestSpend: brandCreatorList.slice(0, 10).map((r: any) => ({
        creatorName: r.creator_name,
        totalSpend: parseFloat(r.total_spend),
      })),
      longestRelationships: brandCreatorList.slice(0, 10).map((r: any) => ({
        creatorName: r.creator_name,
        daysSinceFirst: Math.round((Date.now() - new Date(r.first_deal_date).getTime()) / 86400000),
        totalDeals: parseInt(r.total_deals),
      })),
      rehireRate: creatorList.length > 0 ? Math.round((repeatCreators.length / creatorList.length) * 100) : 0,
    },
  };
}
