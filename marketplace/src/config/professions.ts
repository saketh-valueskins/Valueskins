export const PROFESSIONS = {
  'Technology': {
    name: 'Technology',
    subProfessions: ['Software Engineer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'UX/UI Designer', 'AI/ML Specialist', 'Security Researcher'],
  },
  'Entertainment': {
    name: 'Entertainment',
    subProfessions: ['Actor', 'Comedian', 'Musician', 'Producer', 'Director', 'Screenwriter', 'Animator', 'Voice Actor'],
  },
  'Healthcare': {
    name: 'Healthcare',
    subProfessions: ['Doctor', 'Surgeon', 'Nurse', 'Pharmacist', 'Therapist', 'Nutritionist'],
  },
  'Legal': {
    name: 'Legal',
    subProfessions: ['Lawyer', 'Attorney', 'Judge', 'Corporate Lawyer'],
  },
  'Business & Finance': {
    name: 'Business & Finance',
    subProfessions: ['CEO', 'Entrepreneur', 'Tech Entrepreneur', 'Operations Manager', 'Consultant', 'Financial Advisor', 'Trader', 'Investment Banker', 'Crypto Analyst', 'Finance Student'],
  },
  'Education': {
    name: 'Education',
    subProfessions: ['Teacher', 'Professor', 'Tutor', 'EdTech Creator'],
  },
  'Food & Beverage': {
    name: 'Food & Beverage',
    subProfessions: ['Chef', 'Pastry Chef', 'Food Critic', 'Food Photographer', 'Restaurant Owner', 'Sommelier', 'Culinary Student'],
  },
  'Sports & Fitness': {
    name: 'Sports & Fitness',
    subProfessions: ['Professional Athlete', 'Fitness Coach', 'Yoga Instructor', 'Sports Manager'],
  },
  'Aviation': {
    name: 'Aviation',
    subProfessions: ['Commercial Pilot', 'Air Traffic Controller', 'Aircraft Engineer', 'Aviation Student', 'Cabin Crew Manager'],
  },
  'Real Estate': {
    name: 'Real Estate',
    subProfessions: ['Real Estate Agent', 'Real Estate Developer'],
  },
  'Creative': {
    name: 'Creative',
    subProfessions: ['Graphic Designer', 'Digital Artist', 'Illustrator', 'Photographer'],
  },
};

export function getProfessionCategories() {
  return Object.values(PROFESSIONS).map(prof => ({
    id: prof.name,
    name: prof.name,
    subProfessions: prof.subProfessions,
  }));
}
