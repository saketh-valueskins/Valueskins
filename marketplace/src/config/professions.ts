// System 1: Brand business types — what the brand IS (display-only, no matching logic)
// These are concrete storefront/business types, NOT creator professions.
// EXACTLY 7 brand categories — named DISTINCTLY from creator professions (Systems 2/3)
// so the two systems are never conflated.
export const PROFESSIONS = {
  'Fashion & Beauty Organisation': {
    name: 'Fashion & Beauty Organisation',
    subProfessions: ['Boutique', 'Clothing Store', 'Jewelry Store', 'Sneaker Shop', 'Salon', 'Barbershop', 'Nail Salon', 'Cosmetics Store'],
  },
  'F&B Organisation': {
    name: 'F&B Organisation',
    subProfessions: ['Cafe', 'Restaurant', 'Bakery', 'Pizzeria', 'Ice Cream Shop', 'Food Truck', 'Juice Bar', 'Bar', 'Brewery', 'Winery'],
  },
  'Travel Organisation': {
    name: 'Travel Organisation',
    subProfessions: ['Hotel', 'Resort', 'Bed & Breakfast', 'Hostel', 'Travel Agency', 'Tour Company'],
  },
  'Music Organisation': {
    name: 'Music Organisation',
    subProfessions: ['Music School', 'Concert Venue', 'Recording Studio', 'Music Label', 'Instrument Store', 'DJ Service'],
  },
  'Tech Organisation': {
    name: 'Tech Organisation',
    subProfessions: ['SaaS Company', 'App Developer', 'Software Company', 'Gaming Studio', 'Tech Startup', 'Computer Store', 'Repair Shop', 'IT Services'],
  },
  'Education Organisation': {
    name: 'Education Organisation',
    subProfessions: ['School', 'Preschool', 'Tutoring Center', 'Coding Bootcamp', 'Language School', 'Driving School'],
  },
  'Entertainment Organisation': {
    name: 'Entertainment Organisation',
    subProfessions: ['Comedy Club', 'Movie Theater', 'Nightclub', 'Arcade', 'Escape Room', 'Bowling Alley', 'Karaoke Bar', 'Production House'],
  },
};

export function getProfessionCategories() {
  return Object.values(PROFESSIONS).map(prof => ({
    id: prof.name,
    name: prof.name,
    subProfessions: prof.subProfessions,
  }));
}
