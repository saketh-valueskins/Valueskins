# ValueSkin Systems Architecture

There are three distinct ValueSkin concepts in the codebase. This document explains
each one, how they relate, and the rules for keeping them aligned.

---

## System 1 — Brand Industry (STORE / DISPLAY ONLY)

**Purpose**: A categorization system for the ValueSkin store. Lets brands browse
value skins by broad industry categories (Fashion, Beauty, Tech, etc.). Each
category has sub-professions that are displayed as UI groupings.

**Used in**:
- `MarketplaceDemoPage.tsx` — `PROFESSIONS` constant (line 124)

**RULES**:
- NEVER used for matching, filtering, or targeting
- Purely a UI/organizational layer for the store
- Changing this does NOT affect creator discovery
- Sub-professions here are display labels only

---

## System 2 — Campaign Targeting (FILTERING)

**Purpose**: What the brand selects in the campaign creation form to specify
which type of creator they want. This drives the auto-matching algorithm.

**Used in**:
- `MarketplaceDemoPage.tsx` — campaign form dropdown (line 4898)
- `autoMatch.ts` — matching algorithm compares against creator's value_skin

**MUST MATCH System 3 exactly.**

---

## System 3 — Creator Profession (REGISTRATION)

**Purpose**: The profession a creator selects during onboarding. Stored in
`user_value_skins.value_skin` in the database. The auto-matching query
(`/api/creators/all`) joins on this table to find eligible creators.

**Used in**:
- `onboarding-creator.tsx` — profession picker (line 262)
- `/api/creators/all.ts` — JOINs `user_value_skins` for matching
- `/api/skins/manage.ts` — stores/retrieves value skins

**MUST MATCH System 2 exactly.**

---

## The Shared Source of Truth: `PROFESSION_BADGES`

Both **System 2** and **System 3** derive their options from the
`PROFESSION_BADGES` constant defined in:

```
src/features/valueskins/core/identity/AvatarOptions.tsx  (line 49)
```

This is the **single source of truth** for all creator professions.

```typescript
export const PROFESSION_BADGES: Record<string, ProfessionBadge> = {
  'Software Engineer':      { id: 'swe',  label: 'Software Engineer',      ... },
  'Comedian':               { id: 'cmd',  label: 'Comedian',               ... },
  // ... 60 more professions
};
```

---

## Rules for Future Changes

### Adding a new profession

1. **Edit `PROFESSION_BADGES`** in `AvatarOptions.tsx` (the ONLY file to change)
2. **That's it.** System 2 and System 3 automatically pick it up because both
   iterate over `Object.entries(PROFESSION_BADGES)` — no additional wiring needed.

### Adding a new brand store category

1. **Edit `PROFESSIONS`** in `MarketplaceDemoPage.tsx` (System 1 only)
2. This has ZERO effect on matching. It's purely a store display grouping.

### Never

- Add a separate profession list for campaign targeting that differs from
  `PROFESSION_BADGES` — this will break matching
- Add a separate profession list for creator onboarding that differs from
  `PROFESSION_BADGES` — creators won't get matched
- Use `PROFESSIONS` (System 1) values in the auto-matching algorithm

---

## How Alignment Works at Runtime

```
Brand creates campaign:
  → selects "Comedian" from dropdown (System 2 = PROFESSION_BADGES)
  → campaign.requiredProfessions = ['Comedian']

Creator registers:
  → selects "Comedian" from picker (System 3 = PROFESSION_BADGES)
  → POST /api/skins/manage → INSERT INTO user_value_skins (user_id, 'Comedian')

Auto-matching:
  → /api/creators/all JOINs user_value_skins → returns creators with value_skin
  → autoMatch() compares campaign.requiredProfessions vs creator.valueSkin
  → If country matches + profession matches → match found
```

Both the campaign dropdown and the creator picker iterate over
`Object.entries(PROFESSION_BADGES)`, so any profession a brand can target
is exactly the set of professions a creator can register with.

---

## File Reference

| System | Constant | File | Line |
|--------|----------|------|------|
| 1 (Brand Store) | `PROFESSIONS` | `MarketplaceDemoPage.tsx` | 124 |
| 2 (Campaign Target) | `PROFESSION_BADGES` keys | `AvatarOptions.tsx` | 49 → used at 4898 |
| 3 (Creator Registration) | `PROFESSION_BADGES` keys | `AvatarOptions.tsx` | 49 → used at onboarding-creator.tsx:262 |
