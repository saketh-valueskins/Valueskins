type Level = 1 | 2 | 3 | 4 | 5;

// Earned Tier ladder — Project.md §4 Layer 2 / §11.
//   1 Raw    0–4     2 Seed   5–14    3 Signal 15–34
//   4 Aura   35–74   5 Icon   75+
// Tier rises ONLY on completed, paid deals, and never decays in V1 (§11).
//
// G3: sand only. Project.md §4 describes green/blue/purple/gold frames per tier,
// but BRANDING and the phase-2 specs are sand-only and forbid green outright —
// sand wins here (see phase-2/flagged.md P2-F6).
const LEVEL_THRESHOLDS: { level: Level; minDeals: number; label: string; color: string }[] = [
  { level: 1, minDeals: 0, label: 'Raw', color: '#8A867E' },
  { level: 2, minDeals: 5, label: 'Seed', color: '#B8B4AC' },
  { level: 3, minDeals: 15, label: 'Signal', color: '#A08A5E' },
  { level: 4, minDeals: 35, label: 'Aura', color: '#A08A5E' },
  { level: 5, minDeals: 75, label: 'Icon', color: '#C8B89A' },
];

const NEXT_LEVEL_INFO: Record<Level, { minDeals: number; label: string } | null> = {
  1: { minDeals: 5, label: 'Seed' },
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
