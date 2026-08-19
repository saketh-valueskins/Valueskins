# ValueSkin Systems Architecture

There are three distinct ValueSkin concepts in the codebase. **They are NOT the same.**

---

## System 1 — Brand Business Type (STORE / DISPLAY ONLY)

**Purpose**: What the brand IS as a business. A categorization system for the
brand ValueSkin store. Each category lists business types that a brand can
identify with (Cafe, Restaurant, SaaS, etc.).

**IMPORTANT**: System 1 values are BRAND BUSINESS TYPES (not creator professions).
A brand picks "Cafe" because they run a cafe, NOT because they are a comedian.

**Used in**:
- `MarketplaceDemoPage.tsx` — `PROFESSIONS` constant
- `config/professions.ts` — same constant, exported
- Store modal — shown to brands when buying value skins

**RULES**:
- MUST be business-related categories (Cafe, Restaurant, Fintech, etc.)
- NEVER used for matching, filtering, or targeting
- Changing this does NOT affect creator discovery
- Purely a UI layer — everyone sees what kind of brand they're dealing with

---

## System 2 — Campaign Targeting (FILTERING)

**Purpose**: What the brand selects in the campaign creation form to specify
which CREATOR PROFESSION they need for this campaign. Drives auto-matching.

**Used in**:
- `MarketplaceDemoPage.tsx` — campaign form "Target profession/niche" dropdown
- `autoMatch.ts` — matching algorithm compares against creator's value_skin

**MUST MATCH System 3 exactly.**

---

## System 3 — Creator Profession (REGISTRATION)

**Purpose**: The profession a creator selects during onboarding. Stored in
`user_value_skins.value_skin` in the database. The auto-matching query
(`/api/creators/all`) joins on this table to find eligible creators.

**Used in**:
- `onboarding-creator.tsx` — profession picker
- `/api/creators/all.ts` — JOINs `user_value_skins` for matching
- `/api/skins/manage.ts` — stores/retrieves value skins
- `valueskins/store.tsx` — creator-facing store showing creator professions

**MUST MATCH System 2 exactly.**

---

## The Shared Source of Truth (Systems 2 & 3): `PROFESSION_BADGES`

Both **System 2** and **System 3** derive their options from the
`PROFESSION_BADGES` constant defined in:

```
src/features/valueskins/core/identity/AvatarOptions.tsx  (line 49)
```

This is the **single source of truth** for all creator professions.

```typescript
export const PROFESSION_BADGES: Record<string, ProfessionBadge> = {
  'Fashion & Beauty':       { id: 'fab',  label: 'Fashion & Beauty',       ... },
  'Food':                   { id: 'food', label: 'Food',                   ... },
  'Travel':                 { id: 'trvl', label: 'Travel',                 ... },
  'Music':                  { id: 'mus',  label: 'Music',                  ... },
  'Tech':                   { id: 'tech', label: 'Tech',                   ... },
  'Education':              { id: 'edu',  label: 'Education',              ... },
  'Comedy & Entertainment': { id: 'com',  label: 'Comedy & Entertainment', ... },
  // EXACTLY 7 — the platform is intentionally focused on these niches
};
```

---

## The Source of Truth (System 1): `PROFESSIONS`

**System 1** is an entirely separate list of business-type categories in:

```
src/config/professions.ts
src/features/marketplace/demo/MarketplaceDemoPage.tsx  (same constant)
```

```typescript
const PROFESSIONS = {
  'F&B Organisation':   { subProfessions: ['Cafe', 'Restaurant', 'Bakery', ...] },
  'Fashion & Beauty Organisation': { subProfessions: ['Boutique', 'Salon', 'Cosmetics Store', ...] },
  'Tech Organisation': { subProfessions: ['SaaS Company', 'App Developer', 'Gaming Studio', ...] },
  // ... 7 total (F&B, Fashion & Beauty, Travel, Music, Tech, Education, Entertainment)
};
```

> **Naming rule**: System 1 category labels are DISTINCT from Systems 2/3 profession
> names (e.g. `F&B Organisation` vs the profession `Food`). They must never collide —
> a brand is a business, a creator is a person. The subProfessions themselves are the
> actual business types a brand buys (Cafe, Restaurant, SaaS, etc.).

---

## Critical Rule: NEVER CONFLATE SYSTEMS 1 AND 2/3

**System 1 values (brand business types) and Systems 2/3 values (creator professions)
are DIFFERENT LISTS.** They must never share constants or be used interchangeably.

| If you do this... | ...it breaks |
|---|---|
| A brand picks "Comedian" as their brand type | Makes no sense — brands are not comedians |
| A creator sees "Cafe" in the profession store | Makes no sense — creators are not businesses |
| Campaign targeting shows "Restaurant" as a profession | No creator has that — zero matches |
| Auto-match uses PROFESSIONS values | Evergreen season: zero matches |

---

## Rules for Future Changes

### Adding a new creator profession (Systems 2 & 3)

1. **Edit `PROFESSION_BADGES`** in `AvatarOptions.tsx` (the ONLY file to change)
2. Also add to `CREATOR_PROFESSIONS` in `MarketplaceDemoPage.tsx` (store grid for creators)
3. System 2 and System 3 automatically pick it up from `PROFESSION_BADGES`
   because both iterate over `Object.entries(PROFESSION_BADGES)`
   (`valueskins/store.tsx` is a redirect only — no changes needed there)

### Adding a new brand business type (System 1)

1. **Edit `PROFESSIONS`** in `MarketplaceDemoPage.tsx` and `config/professions.ts`
2. Mirror the category keys in `BRAND_CATEGORY_BADGES` in `AvatarOptions.tsx`
3. This has ZERO effect on matching. It's purely a brand identity display.
4. Keep category labels DISTINCT from creator profession names (e.g. `F&B Organisation`, not `Food`)

### Never

- Merge PROFESSIONS (System 1) with PROFESSION_BADGES (Systems 2/3)
- Use `PROFESSIONS` values in the campaign creation dropdown
- Use `PROFESSIONS` values in the auto-matching algorithm
- Use `PROFESSION_BADGES` values in the brand store grid

---

## How Alignment Works at Runtime

```
Brand picks identity:
  → selects "Cafe" from F&B Organisation store (System 1 = PROFESSIONS, brand type)
  → Stored as brand's value_skin, displayed on brand profile

Brand creates campaign targeting food creators:
  → selects "Food" from dropdown (System 2 = PROFESSION_BADGES)
  → campaign.requiredProfessions = ['Food']

Creator registers as a food creator:
  → selects "Food" from picker (System 3 = PROFESSION_BADGES)
  → POST /api/skins/manage → INSERT INTO user_value_skins (user_id, 'Food')

Auto-matching:
  → /api/creators/all JOINs user_value_skins → returns creators with value_skin
  → autoMatch() compares campaign.requiredProfessions vs creator.valueSkin
  → If country matches + profession matches → match found
```

---

## File Reference

| System | Constant | Files |
|--------|----------|-------|
| 1 (Brand Type) | `PROFESSIONS` | `MarketplaceDemoPage.tsx`, `config/professions.ts` |
| 2 (Campaign Target) | `PROFESSION_BADGES` keys | `AvatarOptions.tsx` → campaign form dropdown |
| 3 (Creator Registration) | `PROFESSION_BADGES` keys | `AvatarOptions.tsx` → onboarding, `valueskins/store.tsx` |
| Creator Store Grid | `CREATOR_PROFESSIONS` | `MarketplaceDemoPage.tsx` (store modal for creators) |
