// System 1: Brand business types — what the brand IS (display-only, no matching logic)
// These are concrete storefront/business types, NOT creator professions.
// EXACTLY 7 brand categories — named DISTINCTLY from creator professions (Systems 2/3)
// so the two systems are never conflated.
export const PROFESSIONS = {
  'Fashion & Beauty Organisation': {
    name: 'Fashion & Beauty Organisation',
    subProfessions: [],
  },
  'F&B Organisation': {
    name: 'F&B Organisation',
    subProfessions: [],
  },
  'Travel Organisation': {
    name: 'Travel Organisation',
    subProfessions: [],
  },
  'Music Organisation': {
    name: 'Music Organisation',
    subProfessions: [],
  },
  'Tech Organisation': {
    name: 'Tech Organisation',
    subProfessions: [],
  },
  'Education Organisation': {
    name: 'Education Organisation',
    subProfessions: [],
  },
  'Entertainment Organisation': {
    name: 'Entertainment Organisation',
    subProfessions: [],
  },
};

export function getProfessionCategories() {
  return Object.values(PROFESSIONS).map(prof => ({
    id: prof.name,
    name: prof.name,
    subProfessions: prof.subProfessions,
  }));
}
