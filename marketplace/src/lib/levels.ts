type Level = 1 | 2 | 3 | 4 | 5;

// Tier names come from the Raw -> Icon scale. The phase-2 Profile spec pins
// Signal = level 3 and Aura = level 4 at 35 deals, which matches the thresholds
// below exactly. Level 2's canonical name is still unconfirmed — Project.md,
// the authority for §4, is not in this repo (see phase-2/flagged.md P2-F6).
//
// G3: sand only. These previously carried green / purple / amber, which the
// brand rules forbid outright.
const LEVEL_THRESHOLDS: { level: Level; minDeals: number; label: string; color: string }[] = [
  { level: 1, minDeals: 0, label: 'Raw', color: '#8A867E' },
  { level: 2, minDeals: 5, label: 'Emerging', color: '#B8B4AC' },
  { level: 3, minDeals: 15, label: 'Signal', color: '#A08A5E' },
  { level: 4, minDeals: 35, label: 'Aura', color: '#A08A5E' },
  { level: 5, minDeals: 75, label: 'Icon', color: '#C8B89A' },
];

const NEXT_LEVEL_INFO: Record<Level, { minDeals: number; label: string } | null> = {
  1: { minDeals: 5, label: 'Emerging' },
  2: { minDeals: 15, label: 'Signal' },
  3: { minDeals: 35, label: 'Aura' },
  4: { minDeals: 75, label: 'Icon' },
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
