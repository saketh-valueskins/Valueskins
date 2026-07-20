# Creator Setup (Onboarding) — UI Spec

> Template: **Creator onboarding wizard.** Light + dark (light tuned per `_global-conventions.md` G5).
> Inherits `_global-conventions.md` (no pill · Inter · sand accent · G4/G5) and obeys `BRANDING.md`.
> Status: **approved build.** Sample: `_samples_delete_later/creator-setup-sample.html` (5 steps, live preview, animated).

---

## 0. The problem with the current flow (and the answer)

**Do 8 steps get annoying? Yes.** The current build is classic wizard fatigue:

1. **8 near-empty screens** — one field each. Lots of clicks for little per screen.
2. **No payoff** — nothing visibly happens as you progress; it feels like data entry into a void.
3. **`Skip` on every step** — signals none of it matters, so why gate onboarding with it? Either it's worth asking now or it belongs on the profile later.
4. **Big gold `Next` button** — a large sand/gold fill violates BRANDING §4 (sand is a sparing accent, never a big fill).

The fix isn't "fewer questions" — it's **less friction and visible payoff:**

- **Consolidate 8 → 5 meaningful steps** (group thin single-field screens).
- **Live creator-card preview** that builds as you go — every step visibly completes your identity, turning tedium into momentum.
- **Lead with the ValueSkin** (the fun identity moment) early as the hook.
- **Defer truly-optional fields** to the profile instead of onboarding steps.
- **Fast:** autofocus, Enter-to-advance, instant animated transitions.

## 1. The 5 steps (consolidated)

| # | Step | Fields | Was |
|---|------|--------|-----|
| 1 | **Identity** | Display name · Instagram · City | Steps 1–2 (name, socials) |
| 2 | **Choose your ValueSkin** | Searchable, category-grouped profession picker → pixel skin animates into preview | Step 3 (the 50-pill dump) |
| 3 | **How you work** | Content languages (multi) · Script collaboration style | Steps 4–5 (languages, deal prefs) |
| 4 | **Rate & availability** | Rate-from (₹) · Open/Limited/Booked | Steps 6–7 (pricing, availability) |
| 5 | **You're set** | Review card → `Launch profile` | Step 8 (review) |

The profession picker gets **search + category groups** (not ~50 loose pills) — the same taxonomy as the Store. Selecting one is the payoff: the ValueSkin pixel appears in the live card.

## 2. Live preview (the momentum engine)

- A **sticky creator card** (premium dark surface, both themes) on the right that fills in live: ValueSkin pixel avatar, name, @handle · city, Type/skin + script-style pills (pop in), languages, rate, status, and a `% complete` line synced to progress.
- Empty state before a skin is picked: a quiet "Your ValueSkin appears here" placeholder — composed, not blank.
- This is why 5 steps don't feel like a chore: you watch your identity assemble.

## 3. Progress & navigation

- **Segmented progress bar** (5 segments, sand fill) + `Step N of 5` + `%`. Sand fill animates on advance.
- **Primary button = solid near-black (light) / off-white (dark)** — `Continue`, then `Launch profile` on the last step. **No gold fill.**
- `Back` = quiet outline. **`Skip for now`** appears only on genuinely optional steps (not step 1), as a quiet text link, not a button.
- **Keyboard:** Enter advances; first input autofocuses on each step.

## 4. Motion (flow)

- **Step transitions:** outgoing view fades/slides up-out, incoming fades/slides up-in (`opacity`+`translateY`, ~350ms `cubic-bezier(0.16,1,0.3,1)`). Feels like one continuous flow, not page reloads.
- Progress fill animates; preview pills pop with a slight rise; the live dot breathes.
- Transform/opacity only; `prefers-reduced-motion` disables transitions and renders steps statically.

## 5. Colour / theme

Light + dark, G5 light tokens (white cards, `#3A362E`/`#6E6A60` text, near-black pixel figures in light — here the preview card is dark so its figures stay off-white). Sand only for progress fill, selected chips, focus, pills. No green/blue/red; no large gold fill.

## 6. Do / Don't

**Do:** 5 grouped steps · live identity preview · ValueSkin picker early with search+categories · near-black primary button · Skip only where optional · Enter-to-advance · animated step flow · both themes.

**Don't:** 8 one-field screens · gold/sand-filled primary button · Skip on every step · dump 50 pills with no search · dead screens with no payoff · animate width/height · the pill.

---

*Answer to "do this many templates get annoying?": it's not the count, it's friction + payoff. Group the thin ones, show progress as a building identity, and keep it fast — then more steps still feel light.*
