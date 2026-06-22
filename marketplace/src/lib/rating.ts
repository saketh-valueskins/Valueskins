export interface SocialStat {
  platform: string;
  handle: string;
  followers: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  content_type: string;
  primary_niche: string;
}

export interface CreatorRating {
  overallScore: number;
  followerScore: number;
  engagementScore: number;
  consistencyScore: number;
  reachTier: string;
  riskFlags: string[];
}

const PLAUSIBLE_FOLLOWER_LIMITS: Record<string, number> = {
  instagram: 50000000,
  tiktok: 100000000,
  youtube: 50000000,
  twitter: 50000000,
  linkedin: 50000000,
  snapchat: 50000000,
  pinterest: 50000000,
  twitch: 50000000,
  telegram: 50000000,
  whatsapp_channel: 50000000,
};

export function computeRating(stats: SocialStat[]): CreatorRating {
  const riskFlags: string[] = [];

  if (stats.length === 0) {
    return { overallScore: 0, followerScore: 0, engagementScore: 0, consistencyScore: 0, reachTier: 'Unrated', riskFlags: ['No social stats provided'] };
  }

  const totalFollowers = stats.reduce((sum, s) => sum + s.followers, 0);
  const avgEngagement = stats.length > 0 ? stats.reduce((sum, s) => sum + s.engagement_rate, 0) / stats.length : 0;

  for (const s of stats) {
    const limit = PLAUSIBLE_FOLLOWER_LIMITS[s.platform] || 50000000;
    if (s.followers > limit) {
      riskFlags.push(`${s.platform}: follower count (${s.followers.toLocaleString()}) exceeds ${limit.toLocaleString()} max for platform`);
    }
    if (s.followers > 0 && s.engagement_rate === 0) {
      riskFlags.push(`${s.platform}: followers > 0 but engagement_rate is 0`);
    }
    if (s.followers > 100000 && s.avg_likes === 0 && s.avg_comments === 0) {
      riskFlags.push(`${s.platform}: >100K followers but avg_likes and avg_comments are both 0`);
    }
  }

  const followerScore = computeFollowerScore(totalFollowers);
  const engagementScore = computeEngagementScore(avgEngagement);
  const consistencyScore = computeConsistencyScore(stats);

  let overallScore = Math.round(followerScore * 0.35 + engagementScore * 0.35 + consistencyScore * 0.30);
  overallScore = Math.max(0, Math.min(100, overallScore));

  if (riskFlags.length > 0) {
    overallScore = Math.max(0, overallScore - riskFlags.length * 10);
  }

  let reachTier: string;
  if (overallScore >= 85) reachTier = 'Top Tier';
  else if (overallScore >= 70) reachTier = 'High Reach';
  else if (overallScore >= 50) reachTier = 'Growing';
  else if (overallScore >= 25) reachTier = 'Emerging';
  else if (overallScore > 0) reachTier = 'Just Starting';
  else reachTier = 'Unrated';

  return { overallScore, followerScore, engagementScore, consistencyScore, reachTier, riskFlags };
}

function computeFollowerScore(totalFollowers: number): number {
  if (totalFollowers >= 1000000) return 100;
  if (totalFollowers >= 500000) return 90;
  if (totalFollowers >= 100000) return 75;
  if (totalFollowers >= 50000) return 60;
  if (totalFollowers >= 10000) return 40;
  if (totalFollowers >= 1000) return 20;
  if (totalFollowers > 0) return 10;
  return 0;
}

function computeEngagementScore(avgEngagement: number): number {
  if (avgEngagement >= 10) return 100;
  if (avgEngagement >= 5) return 80;
  if (avgEngagement >= 3) return 60;
  if (avgEngagement >= 1) return 40;
  if (avgEngagement >= 0.5) return 20;
  if (avgEngagement > 0) return 10;
  return 0;
}

function computeConsistencyScore(stats: SocialStat[]): number {
  if (stats.length <= 1) return stats.length === 1 ? 30 : 0;
  const platformsWithData = stats.filter(s => s.followers > 0 || s.engagement_rate > 0);
  return Math.min(100, Math.round((platformsWithData.length / stats.length) * 100));
}
