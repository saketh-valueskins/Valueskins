export const PROFESSIONS = {
  'Fashion': {
    name: 'Fashion',
    subProfessions: ['Boutique', 'Streetwear Brand', 'Luxury Fashion', 'Sustainable Fashion', 'Activewear', 'Accessories Brand', 'Vintage & Thrift', 'Tailoring & Alterations'],
  },
  'Beauty': {
    name: 'Beauty',
    subProfessions: ['Cosmetics Brand', 'Skincare Line', 'Haircare Brand', 'Fragrance House', 'Beauty Clinic', 'Salon', 'Spa & Wellness', 'Organic Beauty'],
  },
  'Travel': {
    name: 'Travel',
    subProfessions: ['Hotel', 'Resort', 'Travel Agency', 'Airline', 'Tour Operator', 'Vacation Rental', 'Cruise Line', 'Destination Marketing'],
  },
  'Food & Beverage': {
    name: 'Food & Beverage',
    subProfessions: ['Restaurant', 'Cafe', 'Bakery', 'Fast Casual', 'Fine Dining', 'Food Truck', 'Bar & Lounge', 'Catering'],
  },
  'Fitness': {
    name: 'Fitness',
    subProfessions: ['Gym', 'Fitness Studio', 'Wellness Center', 'Sports Brand', 'Athletic Apparel', 'Supplement Company', 'Yoga Studio', 'Outdoor Gear'],
  },
  'Lifestyle': {
    name: 'Lifestyle',
    subProfessions: ['Home Goods', 'Subscription Box', 'Lifestyle App', 'Magazine & Media', 'Event Brand', 'Wellness Product', 'Luxury Goods', 'Sustainable Living'],
  },
  'Photography': {
    name: 'Photography',
    subProfessions: ['Photo Studio', 'Camera Brand', 'Print Shop', 'Stock Photography', 'Event Photography', 'Film Lab', 'Photo Tech', 'Art Gallery'],
  },
  'Interior Design': {
    name: 'Interior Design',
    subProfessions: ['Furniture Brand', 'Home Decor', 'Lighting Design', 'Textile Brand', 'Paint & Finishes', 'Architecture Firm', 'Staging Company', 'Outdoor Living'],
  },
  'Technology': {
    name: 'Technology',
    subProfessions: ['SaaS Company', 'Mobile App', 'Agency', 'E-Commerce', 'Dev Tool', 'Game Studio', 'Hardware Brand', 'EdTech Platform'],
  },
  'Entertainment': {
    name: 'Entertainment',
    subProfessions: ['Record Label', 'Streaming Service', 'Production Company', 'Event Venue', 'Talent Agency', 'Gaming Brand', 'Media Network', 'Experiential Marketing'],
  },
  'Sports': {
    name: 'Sports',
    subProfessions: ['Sports Team', 'League', 'Stadium & Arena', 'Sporting Goods', 'Fan Merch', 'Training Facility', 'Sports Media', 'Esports Organization'],
  },
  'Business': {
    name: 'Business',
    subProfessions: ['Consulting Firm', 'Agency', 'SaaS', 'Marketplace', 'E-Commerce', 'FinTech', 'SaaS Platform', 'B2B Service'],
  },
};

export function getProfessionCategories() {
  return Object.values(PROFESSIONS).map(prof => ({
    id: prof.name,
    name: prof.name,
    subProfessions: prof.subProfessions,
  }));
}
