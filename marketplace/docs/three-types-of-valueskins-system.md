# Three Types of ValueSkins: Complete System

## Overview

ValueSkins operates with three distinct but interrelated systems of categorization. Each serves a different purpose in matching creators with brands.

---

## Type 1: Brand Profile (Brand Categories)

**What it is**: What kind of business/organization the brand IS.

**Source of truth**: `PROFESSIONS` in [`src/config/professions.ts`](../src/config/professions.ts)

**Display in UI**: Via `BRAND_CATEGORY_BADGES` in [`src/features/valueskins/core/identity/AvatarOptions.tsx`](../src/features/valueskins/core/identity/AvatarOptions.tsx)

**The 7 Categories**:
1. Fashion & Beauty Organisation
2. F&B Organisation
3. Travel Organisation
4. Music Organisation
5. Tech Organisation
6. Education Organisation
7. Entertainment Organisation

**Purpose**: 
- Brands declare what type of business they are during profile setup
- Display-only (no matching logic)
- Helps creators understand brand identity at a glance

**Note**: These names deliberately include "Organisation" suffix to distinguish them from creator professions (Systems 2/3).

---

## Type 2: Campaign Targeting Skins

**What it is**: Which creator types/niches a brand wants to target when creating a campaign.

**Source of truth**: `PROFESSION_BADGES` in [`src/features/valueskins/core/identity/AvatarOptions.tsx`](../src/features/valueskins/core/identity/AvatarOptions.tsx)

**Used via**: `Object.keys(PROFESSION_BADGES)` passed to CampaignComposer component

**The 7 Niches**:
1. Fashion & Beauty
2. Food
3. Travel
4. Music
5. Tech
6. Education
7. Comedy & Entertainment

**Purpose**:
- When brands create campaigns, they select which creator niches they want to work with
- Enables precise targeting and filtering of creator audience

**Critical Rule**: Must always match Type 3 (Creator Skins) to ensure brands can only target creators that actually exist on the platform

---

## Type 3: Creator Skins (Creator Professions)

**What it is**: What kind of creator/professional the creator IS.

**Source of truth**: `PROFESSION_BADGES` in [`src/features/valueskins/core/identity/AvatarOptions.tsx`](../src/features/valueskins/core/identity/AvatarOptions.tsx)

**The 7 Niches**:
1. Fashion & Beauty
2. Food
3. Travel
4. Music
5. Tech
6. Education
7. Comedy & Entertainment

**Purpose**:
- Creators declare their niche/profession during profile setup
- Used for matching with compatible brand campaigns
- Displayed as badges on creator profiles

**Critical Rule**: Must always match Type 2 (Campaign Targeting) to ensure brands can only target existing creator types

---

## The Critical Invariant

**Type 2 and Type 3 must always use the same list.**

This is currently enforced by design:
- Both point to the same source: `PROFESSION_BADGES`
- If the list changes, both are updated automatically
- No divergence is possible without breaking the source

### Why This Matters

If Type 2 and Type 3 diverge:
- **Problem A**: Brand targets "Visual Storytelling" niche, but no creators registered in "Visual Storytelling"
  - Result: Empty campaign, wasted brand effort, poor UX
  
- **Problem B**: Creator registers as "Podcaster" but brands can't target "Podcaster" niche
  - Result: Creator won't get matched with relevant deals

This invariant prevents both problems by design.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                   ValueSkins Taxonomy                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Type 1: Brand Categories                                   │
│  ─────────────────────────                                  │
│  Source: PROFESSIONS (professions.ts)                       │
│  Display: BRAND_CATEGORY_BADGES (AvatarOptions.tsx)         │
│  Count: 7 (Fashion, F&B, Travel, Music, Tech, Edu, Ent)     │
│  Purpose: What brand IS (display only)                      │
│  Example: "Fashion & Beauty Organisation"                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  Type 2: Campaign Targeting Skins    Type 3: Creator  │ │
│  │  ───────────────────────────────     ─────────────────│ │
│  │  Source: PROFESSION_BADGES           Source: SAME      │ │
│  │  Used: CampaignComposer              Used: Creator     │ │
│  │  Count: 7 (Fashion, Food, Travel,    profile display   │ │
│  │           Music, Tech, Edu, Comedy)                    │ │
│  │  Purpose: Who brands target          Purpose: Who      │ │
│  │                                       creators ARE      │ │
│  │  ✓ SYNCHRONIZED BY DESIGN            ✓ SYNCHRONIZED    │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                        (Both point to                        │
│                      PROFESSION_BADGES)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Locations (Source of Truth)

| Type | File | Key |
|------|------|-----|
| **Type 1** | `src/config/professions.ts` | `PROFESSIONS` |
| **Type 1 Display** | `src/features/valueskins/core/identity/AvatarOptions.tsx` | `BRAND_CATEGORY_BADGES` |
| **Type 2 & 3** | `src/features/valueskins/core/identity/AvatarOptions.tsx` | `PROFESSION_BADGES` |

---

## Current State (August 30, 2026)

✅ **Type 1 (Brand Categories)**: 7 categories, all correctly named with "Organisation" suffix
✅ **Type 2 & Type 3 (Campaign Targeting & Creator Skins)**: Synchronized automatically via single `PROFESSION_BADGES` source
✅ **Invariant Enforced**: No code path allows Type 2 and Type 3 to diverge

**Status**: System is correctly implemented. The three types are properly separated and synchronized.

---

## Adding a New Category (If Ever Needed)

**Process**:
1. Add new entry to `PROFESSION_BADGES` (line 47 in AvatarOptions.tsx)
   - This automatically updates both Type 2 and Type 3
2. Add new brand category to `PROFESSIONS` (src/config/professions.ts) if brands should also be able to register as this type
3. Add new badge to `BRAND_CATEGORY_BADGES` if it's a brand-only category

**Example (hypothetical)**:
```typescript
// If adding "Gaming" category:

// Type 2 & 3 (automatic sync)
PROFESSION_BADGES: {
  'Gaming': { id: 'gam', label: 'Gaming', abbreviation: 'GAM', color: '#7C3AED', emoji: '' },
  // ... rest
}

// Type 1 (if brands should also be gaming orgs)
PROFESSIONS: {
  'Gaming Organisation': { name: 'Gaming Organisation', subProfessions: [] },
  // ... rest
}

// Type 1 Display
BRAND_CATEGORY_BADGES: {
  'Gaming Organisation': { id: 'gamorg', label: 'Gaming Organisation', abbreviation: 'GAM', color: '#7C3AED' },
  // ... rest
}
```

This ensures:
- Creator can register as "Gaming" (Type 3)
- Brand can target "Gaming" creators (Type 2)
- Brand can declare themselves as "Gaming Organisation" (Type 1)
- All three systems remain synchronized

---

## Verification Commands

Check that Type 2 and Type 3 are synchronized:
```bash
# Count entries in PROFESSION_BADGES
grep -c "id: '" src/features/valueskins/core/identity/AvatarOptions.tsx | grep 7

# Verify no divergence exists in campaign targeting vs creator registration
grep -A 100 "PROFESSION_BADGES" src/features/valueskins/core/identity/AvatarOptions.tsx | head -20
```

Verify Type 1 has 7 categories:
```bash
grep -c "Organisation" src/config/professions.ts
```

All should return 7.
