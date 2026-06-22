type Level = 1 | 2 | 3 | 4 | 5;

const LEVEL_THRESHOLDS: { level: Level; minDeals: number; label: string; color: string }[] = [
  { level: 1, minDeals: 0, label: 'Newcomer', color: '#94a3b8' },
  { level: 2, minDeals: 5, label: 'Emerging', color: '#22c55e' },
  { level: 3, minDeals: 15, label: 'Experienced', color: '#3b82f6' },
  { level: 4, minDeals: 35, label: 'Expert', color: '#a855f7' },
  { level: 5, minDeals: 75, label: 'Elite', color: '#f59e0b' },
];

const NEXT_LEVEL_INFO: Record<Level, { minDeals: number; label: string } | null> = {
  1: { minDeals: 5, label: 'Emerging' },
  2: { minDeals: 15, label: 'Experienced' },
  3: { minDeals: 35, label: 'Expert' },
  4: { minDeals: 75, label: 'Elite' },
  5: null,
};

export function getLevel(dealsCompleted: number): Level {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (dealsCompleted >= LEVEL_THRESHOLDS[i].minDeals) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

export function getLevelInfo(level: Level) {
  const info = LEVEL_THRESHOLDS.find(t => t.level === level);
  if (!info) throw new Error(`Invalid level: ${level}`);
  return info;
}

export function getNextLevelInfo(level: Level) {
  return NEXT_LEVEL_INFO[level];
}

export function getProgressToNext(dealsCompleted: number): { current: number; needed: number; progress: number } | null {
  const currentLevel = getLevel(dealsCompleted);
  const next = NEXT_LEVEL_INFO[currentLevel];
  if (!next) return null;

  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1]?.minDeals ?? 0;
  const dealsTowardNext = Math.max(0, dealsCompleted - currentThreshold);
  const dealsNeeded = Math.max(1, next.minDeals - currentThreshold);
  const progress = Math.min(dealsTowardNext / dealsNeeded, 1);

  return { current: dealsTowardNext, needed: dealsNeeded, progress };
}

export { LEVEL_THRESHOLDS };
export type { Level };
