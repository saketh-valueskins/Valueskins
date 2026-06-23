// System 1: Brand business types — what the brand IS (display-only, no matching logic)
export const PROFESSIONS = {
  'Food & Beverage': {
    name: 'Food & Beverage',
    subProfessions: ['Cafe', 'Restaurant', 'Bakery', 'Food Truck', 'Bar/Pub', 'Brewery', 'Winery', 'Catering'],
  },
  'Retail & E-commerce': {
    name: 'Retail & E-commerce',
    subProfessions: ['Fashion Brand', 'Beauty Brand', 'DTC Brand', 'Marketplace', 'Luxury Goods', 'Home Goods', 'Pet Supplies'],
  },
  'Technology': {
    name: 'Technology',
    subProfessions: ['SaaS', 'Mobile App', 'Gaming Studio', 'AI/ML Platform', 'B2B Software', 'Hardware', 'DevTool', 'Cybersecurity'],
  },
  'Health & Wellness': {
    name: 'Health & Wellness',
    subProfessions: ['Fitness Brand', 'Supplement Brand', 'Wellness App', 'Meditation', 'Healthcare Provider', 'Telehealth'],
  },
  'Beauty & Cosmetics': {
    name: 'Beauty & Cosmetics',
    subProfessions: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Nail Brand', 'Men Grooming'],
  },
  'Travel & Hospitality': {
    name: 'Travel & Hospitality',
    subProfessions: ['Hotel', 'Resort', 'Airline', 'Travel Agency', 'Tour Operator', 'Cruise Line'],
  },
  'Fashion & Apparel': {
    name: 'Fashion & Apparel',
    subProfessions: ['Streetwear', 'Luxury', 'Activewear', 'Footwear', 'Accessories', 'Sustainable Fashion'],
  },
  'Media & Entertainment': {
    name: 'Media & Entertainment',
    subProfessions: ['Streaming Service', 'Record Label', 'Film Studio', 'Publisher', 'Gaming Brand', 'News Outlet'],
  },
  'Sports': {
    name: 'Sports',
    subProfessions: ['Sportswear', 'Sports Team', 'Fitness Equipment', 'Outdoor Gear', 'Sports League'],
  },
  'Education': {
    name: 'Education',
    subProfessions: ['EdTech', 'Online Course Platform', 'Tutoring Service', 'Academy', 'Test Prep'],
  },
  'Finance & Insurance': {
    name: 'Finance & Insurance',
    subProfessions: ['Fintech', 'Bank', 'Insurance', 'Investment Platform', 'Crypto', 'Wealth Management'],
  },
  'Real Estate': {
    name: 'Real Estate',
    subProfessions: ['Property Developer', 'Real Estate Agency', 'Co-working Space', 'Rental Platform'],
  },
  'Professional Services': {
    name: 'Professional Services',
    subProfessions: ['Agency', 'Consultancy', 'Law Firm', 'Marketing Agency', 'PR Firm', 'Accounting'],
  },
  'Automotive': {
    name: 'Automotive',
    subProfessions: ['Car Manufacturer', 'Dealership', 'EV Brand', 'Auto Parts', 'Ride Share'],
  },
  'Non-Profit & Public': {
    name: 'Non-Profit & Public',
    subProfessions: ['Non-Profit', 'Foundation', 'Government Agency', 'NGO', 'Religious Organization'],
  },
};

export function getProfessionCategories() {
  return Object.values(PROFESSIONS).map(prof => ({
    id: prof.name,
    name: prof.name,
    subProfessions: prof.subProfessions,
  }));
}
