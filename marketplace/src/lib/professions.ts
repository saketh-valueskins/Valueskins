/*
 * PROFESSION EXPANSION SYSTEM
 * ──────────────────────────────────────────────────────────────────────────
 * The platform intentionally supports EXACTLY 7 professions, one per niche:
 * Fashion & Beauty, Food, Travel, Music, Tech, Education, Comedy & Entertainment.
 *
 * 1. AI-driven trending detection (mock: based on request_count)
 * 2. User submission + admin approval workflow
 * 3. Platform-specific profession availability
 *
 * PATENT ANGLE: Profession tagging system allows creators to self-categorize
 * within the 7 niches, which directly weights the AI matching algorithm's
 * category_affinity score. A creator's chosen niche is NOT just identity—
 * it's an ML input.
 */

export type Platform = 'meta' | 'linkedin' | 'youtube' | 'across';

export type ProfessionCategory =
  | 'Fashion & Beauty'
  | 'Food'
  | 'Travel'
  | 'Music'
  | 'Tech'
  | 'Education'
  | 'Comedy & Entertainment';

export interface Profession {
  id: string;
  name: string;
  category: ProfessionCategory;
  description: string;
  icon: string; // emoji placeholder, can be replaced with SVG
  gradientFrom: string;
  gradientTo: string;
  platforms: Platform[];
  trending?: boolean;
  request_count?: number;
  estimated_avg_deal?: number;
  active_brands?: number;
  nested?: boolean; // for hierarchical professions within a niche
}

const PROFESSIONS: Profession[] = [
  {
    id: 'fashion-beauty',
    name: 'Fashion & Beauty',
    category: 'Fashion & Beauty',
    description: 'Fashion, makeup, skincare, and style creators',
    icon: '💄',
    gradientFrom: '#ec4899',
    gradientTo: '#be184d',
    platforms: ['meta', 'youtube', 'across'],
    request_count: 512,
    estimated_avg_deal: 2500,
    active_brands: 26,
    trending: true,
  },
  {
    id: 'food',
    name: 'Food',
    category: 'Food',
    description: 'Chefs, food critics, and culinary storytellers',
    icon: '🍜',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    platforms: ['meta', 'youtube', 'across'],
    request_count: 445,
    estimated_avg_deal: 2200,
    active_brands: 22,
    trending: true,
  },
  {
    id: 'travel',
    name: 'Travel',
    category: 'Travel',
    description: 'Travel vloggers, guides, and experience creators',
    icon: '✈️',
    gradientFrom: '#06b6d4',
    gradientTo: '#0891b2',
    platforms: ['meta', 'youtube', 'across'],
    request_count: 389,
    estimated_avg_deal: 2800,
    active_brands: 18,
  },
  {
    id: 'music',
    name: 'Music',
    category: 'Music',
    description: 'Musicians, singers, DJs, and audio creators',
    icon: '🎵',
    gradientFrom: '#8b5cf6',
    gradientTo: '#6366f1',
    platforms: ['meta', 'youtube', 'across'],
    request_count: 345,
    estimated_avg_deal: 2600,
    active_brands: 16,
  },
  {
    id: 'tech',
    name: 'Tech',
    category: 'Tech',
    description: 'Engineers, developers, and tech educators',
    icon: '💻',
    gradientFrom: '#0095f6',
    gradientTo: '#1f51ba',
    platforms: ['meta', 'linkedin', 'youtube', 'across'],
    request_count: 478,
    estimated_avg_deal: 3200,
    active_brands: 24,
    trending: true,
  },
  {
    id: 'education',
    name: 'Education',
    category: 'Education',
    description: 'Teachers, professors, tutors, and course creators',
    icon: '📚',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    platforms: ['meta', 'linkedin', 'youtube', 'across'],
    request_count: 312,
    estimated_avg_deal: 1800,
    active_brands: 15,
  },
  {
    id: 'comedy-entertainment',
    name: 'Comedy & Entertainment',
    category: 'Comedy & Entertainment',
    description: 'Comedians, actors, hosts, and entertainers',
    icon: '🎭',
    gradientFrom: '#f43f5e',
    gradientTo: '#e11d48',
    platforms: ['meta', 'youtube', 'across'],
    request_count: 402,
    estimated_avg_deal: 3000,
    active_brands: 20,
    trending: true,
  },
];

// ═════════════════════════════════════════════════════════════════════════
// PLATFORM CONFIGURATIONS
// ═════════════════════════════════════════════════════════════════════════

export interface PlatformConfig {
  id: Platform;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  logoEmoji: string;
  themes: {
    bg: string;
    card: string;
    separator: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    accentColor: string;
  };
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  meta: {
    id: 'meta',
    name: 'Meta Platforms',
    description: 'Reach creators across Instagram & Threads',
    primaryColor: '#0a66c2',
    secondaryColor: '#0a66c2',
    logoEmoji: '👥',
    themes: {
      bg: '#000000',
      card: '#1a1a1a',
      separator: '#262626',
      textPrimary: '#f5f5f5',
      textSecondary: '#b0b0b0',
      textTertiary: '#737373',
      accentColor: '#0a66c2',
    },
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect with professionals & B2B creators',
    primaryColor: '#0a66c2',
    secondaryColor: '#004182',
    logoEmoji: '💼',
    themes: {
      bg: '#ffffff',
      card: '#f3f2ef',
      separator: '#e5e5e1',
      textPrimary: '#000000',
      textSecondary: '#666666',
      textTertiary: '#8a8d91',
      accentColor: '#0a66c2',
    },
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    description: 'Grow your audience on video platform',
    primaryColor: '#ff0000',
    secondaryColor: '#cc0000',
    logoEmoji: '📺',
    themes: {
      bg: '#000000',
      card: '#1a1a1a',
      separator: '#262626',
      textPrimary: '#f5f5f5',
      textSecondary: '#b0b0b0',
      textTertiary: '#737373',
      accentColor: '#ff0000',
    },
  },
  across: {
    id: 'across',
    name: 'Across All Platforms',
    description: 'Sell your persona across Meta, LinkedIn & YouTube',
    primaryColor: '#8b5cf6',
    secondaryColor: '#6366f1',
    logoEmoji: '🌐',
    themes: {
      bg: '#000000',
      card: '#1a1a1a',
      separator: '#262626',
      textPrimary: '#f5f5f5',
      textSecondary: '#b0b0b0',
      textTertiary: '#737373',
      accentColor: '#8b5cf6',
    },
  },
};

// ═════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Get all professions for a given platform
 */
export function getProfessionsByPlatform(platform: Platform): Profession[] {
  if (platform === 'across') return PROFESSIONS;
  return PROFESSIONS.filter(p => p.platforms.includes(platform));
}

/**
 * Get trending professions (AI-scanned, user-requested, high-demand)
 */
export function getTrendingProfessions(limit: number = 5): Profession[] {
  return PROFESSIONS.filter(p => p.trending).slice(0, limit);
}

/**
 * Get professions by category
 */
export function getProfessionsByCategory(category: Profession['category'], platform?: Platform): Profession[] {
  let filtered = PROFESSIONS.filter(p => p.category === category);
  if (platform && platform !== 'across') {
    filtered = filtered.filter(p => p.platforms.includes(platform));
  }
  return filtered;
}

/**
 * Get a single profession by ID
 */
export function getProfessionById(id: string): Profession | undefined {
  return PROFESSIONS.find(p => p.id === id);
}

/**
 * Randomize profession ordering for carousel/feed
 */
export function shuffleProfessions(professions: Profession[]): Profession[] {
  return [...professions].sort(() => Math.random() - 0.5);
}

export default PROFESSIONS;
