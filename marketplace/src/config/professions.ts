// System 1: Brand business types — what the brand IS (display-only, no matching logic)
// These are concrete storefront/business types, NOT creator professions
export const PROFESSIONS = {
  'Food & Beverage': {
    name: 'Food & Beverage',
    subProfessions: ['Cafe', 'Restaurant', 'Bakery', 'Pizzeria', 'Ice Cream Shop', 'Food Truck', 'Juice Bar', 'Bar', 'Brewery', 'Winery'],
  },
  'Retail & Shopping': {
    name: 'Retail & Shopping',
    subProfessions: ['Clothing Boutique', 'Department Store', 'Vintage Shop', 'Jewelry Store', 'Bookstore', 'Grocery Store', 'Convenience Store', 'Thrift Store'],
  },
  'Technology': {
    name: 'Technology',
    subProfessions: ['App Developer', 'Software Company', 'Gaming Studio', 'Computer Store', 'Tech Startup', 'Repair Shop', 'IT Services'],
  },
  'Health & Fitness': {
    name: 'Health & Fitness',
    subProfessions: ['Gym', 'Yoga Studio', 'Spa', 'Meditation Center', 'Health Clinic', 'Pharmacy', 'Dental Clinic'],
  },
  'Beauty & Personal Care': {
    name: 'Beauty & Personal Care',
    subProfessions: ['Salon', 'Barbershop', 'Nail Salon', 'Tattoo Studio', 'Cosmetics Store', 'Fragrance Shop'],
  },
  'Travel & Hospitality': {
    name: 'Travel & Hospitality',
    subProfessions: ['Hotel', 'Resort', 'Bed & Breakfast', 'Hostel', 'Travel Agency', 'Tour Company'],
  },
  'Fashion & Apparel': {
    name: 'Fashion & Apparel',
    subProfessions: ['Boutique', 'Streetwear Store', 'Sneaker Shop', 'Tailor', 'Uniform Shop', 'Shoe Store'],
  },
  'Entertainment & Media': {
    name: 'Entertainment & Media',
    subProfessions: ['Comedy Club', 'Movie Theater', 'Nightclub', 'Arcade', 'Concert Venue', 'Escape Room', 'Bowling Alley', 'Karaoke Bar'],
  },
  'Sports & Recreation': {
    name: 'Sports & Recreation',
    subProfessions: ['Sports Bar', 'Golf Course', 'Tennis Club', 'Bike Shop', 'Skate Park', 'Swimming Pool', 'Stadium'],
  },
  'Education': {
    name: 'Education',
    subProfessions: ['School', 'Preschool', 'Tutoring Center', 'Dance Studio', 'Music School', 'Coding Bootcamp', 'Language School', 'Driving School'],
  },
  'Finance & Insurance': {
    name: 'Finance & Insurance',
    subProfessions: ['Bank', 'Credit Union', 'Investment Office', 'Insurance Agency', 'Accounting Office', 'Currency Exchange'],
  },
  'Real Estate': {
    name: 'Real Estate',
    subProfessions: ['Real Estate Office', 'Property Management', 'Co-working Space', 'Apartment Complex', 'Storage Facility'],
  },
  'Professional Services': {
    name: 'Professional Services',
    subProfessions: ['Law Firm', 'Marketing Agency', 'Consulting Firm', 'Architecture Firm', 'Design Studio', 'Photography Studio', 'Print Shop'],
  },
  'Automotive': {
    name: 'Automotive',
    subProfessions: ['Car Dealership', 'Auto Repair Shop', 'Car Wash', 'Gas Station', 'EV Charging Station', 'Tire Shop'],
  },
  'Home & Garden': {
    name: 'Home & Garden',
    subProfessions: ['Furniture Store', 'Home Depot', 'Garden Center', 'Florist', 'Hardware Store', 'Paint Shop'],
  },
  'Non-Profit & Community': {
    name: 'Non-Profit & Community',
    subProfessions: ['Charity Shop', 'Community Center', 'Museum', 'Library', 'Art Gallery', 'Animal Shelter', 'Place of Worship'],
  },
};

export function getProfessionCategories() {
  return Object.values(PROFESSIONS).map(prof => ({
    id: prof.name,
    name: prof.name,
    subProfessions: prof.subProfessions,
  }));
}
