import { useState, useEffect } from 'react';

const REPUTATION_STORAGE_KEY = 'valueskins_reputation_config';

export const DEFAULT_REPUTATION_FACTORS = [
  { name: 'Deal Completion Rate', weight: 25, maxPoints: 250 },
  { name: 'On-Time Delivery', weight: 20, maxPoints: 200 },
  { name: 'Brand Ratings', weight: 20, maxPoints: 200 },
  { name: 'Engagement Quality', weight: 15, maxPoints: 150 },
  { name: 'Creator Level', weight: 10, maxPoints: 100 },
  { name: 'Community Contribution', weight: 10, maxPoints: 100 },
];

export function useReputationConfig() {
  const [factors, setFactors] = useState(DEFAULT_REPUTATION_FACTORS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(REPUTATION_STORAGE_KEY);
      if (stored) {
        try {
          setFactors(JSON.parse(stored));
        } catch (e) {
          setFactors(DEFAULT_REPUTATION_FACTORS);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  const updateFactors = (newFactors: typeof DEFAULT_REPUTATION_FACTORS) => {
    setFactors(newFactors);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPUTATION_STORAGE_KEY, JSON.stringify(newFactors));
    }
  };

  return { factors, updateFactors, isLoaded };
}
