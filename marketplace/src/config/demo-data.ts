// Centralized demo/mock data configuration
// All hardcoded values should be defined here, not scattered throughout components

export const DEMO_CREATOR_CATEGORIES = {
  'Fashion': {
    name: 'Fashion',
    subProfessions: ['Boutique', 'Streetwear Brand', 'Luxury Fashion', 'Sustainable Fashion', 'Activewear', 'Accessories Brand', 'Vintage & Thrift', 'Tailoring & Alterations']
  },
  'Beauty': {
    name: 'Beauty',
    subProfessions: ['Cosmetics Brand', 'Skincare Line', 'Haircare Brand', 'Fragrance House', 'Beauty Clinic', 'Salon', 'Spa & Wellness', 'Organic Beauty']
  },
  'Travel': {
    name: 'Travel',
    subProfessions: ['Hotel', 'Resort', 'Travel Agency', 'Airline', 'Tour Operator', 'Vacation Rental', 'Cruise Line', 'Destination Marketing']
  },
  'Food & Beverage': {
    name: 'Food & Beverage',
    subProfessions: ['Restaurant', 'Cafe', 'Bakery', 'Fast Casual', 'Fine Dining', 'Food Truck', 'Bar & Lounge', 'Catering']
  },
  'Fitness': {
    name: 'Fitness',
    subProfessions: ['Gym', 'Fitness Studio', 'Wellness Center', 'Sports Brand', 'Athletic Apparel', 'Supplement Company', 'Yoga Studio', 'Outdoor Gear']
  },
  'Lifestyle': {
    name: 'Lifestyle',
    subProfessions: ['Home Goods', 'Subscription Box', 'Lifestyle App', 'Magazine & Media', 'Event Brand', 'Wellness Product', 'Luxury Goods', 'Sustainable Living']
  },
  'Photography': {
    name: 'Photography',
    subProfessions: ['Photo Studio', 'Camera Brand', 'Print Shop', 'Stock Photography', 'Event Photography', 'Film Lab', 'Photo Tech', 'Art Gallery']
  },
  'Interior Design': {
    name: 'Interior Design',
    subProfessions: ['Furniture Brand', 'Home Decor', 'Lighting Design', 'Textile Brand', 'Paint & Finishes', 'Architecture Firm', 'Staging Company', 'Outdoor Living']
  },
  'Technology': {
    name: 'Technology',
    subProfessions: ['SaaS Company', 'Mobile App', 'Agency', 'E-Commerce', 'Dev Tool', 'Game Studio', 'Hardware Brand', 'EdTech Platform']
  },
  'Entertainment': {
    name: 'Entertainment',
    subProfessions: ['Record Label', 'Streaming Service', 'Production Company', 'Event Venue', 'Talent Agency', 'Gaming Brand', 'Media Network', 'Experiential Marketing']
  },
  'Sports': {
    name: 'Sports',
    subProfessions: ['Sports Team', 'League', 'Stadium & Arena', 'Sporting Goods', 'Fan Merch', 'Training Facility', 'Sports Media', 'Esports Organization']
  },
  'Business': {
    name: 'Business',
    subProfessions: ['Consulting Firm', 'Agency', 'SaaS', 'Marketplace', 'E-Commerce', 'FinTech', 'SaaS Platform', 'B2B Service']
  }
};

export const DEMO_BRAND_CATEGORIES = {
  'Industry': {
    name: 'Industry',
    subCategories: ['Technology', 'Fashion', 'Beauty', 'Health & Wellness', 'Food & Beverage', 'Travel', 'Finance', 'Education']
  },
  'Company Size': {
    name: 'Company Size',
    subCategories: ['Startup', 'SMB', 'Mid-Market', 'Enterprise', 'Agency', 'Solo Brand']
  },
  'Campaign Type': {
    name: 'Campaign Type',
    subCategories: ['Product Review', 'Brand Ambassador', 'Sponsored Content', 'Event Coverage', 'Affiliate', 'UGC']
  },
  'Budget Tier': {
    name: 'Budget Tier',
    subCategories: ['Micro ($500-2K)', 'Standard ($2K-10K)', 'Premium ($10K-50K)', 'Enterprise ($50K+)']
  }
};

export const DEMO_SKILL_TAGS = [
  'React', 'Node.js', 'TypeScript', 'Python', 'JavaScript',
  'Figma', 'Adobe CC', 'Prototyping', 'User Research',
  'Content Creation', 'Video Editing', 'Photography',
  'Social Media', 'SEO', 'Analytics', 'Marketing'
];

export const DEMO_COLORS = {
  primary: '#0066CC',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#38bdf8',
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  textSecondary: '#cbd5e1'
};

export const DEMO_LIMITS = {
  maxCreatorsPerBulk: 100,
  maxDealAmount: 100000,
  minDealAmount: 100,
  exclusivityWindowDays: 30,
  maxRevisions: 3,
  maxPortfolioItems: 10
};
