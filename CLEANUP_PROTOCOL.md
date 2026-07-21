# Cleanup Protocol

> How dead code gets removed from this repo. Derived from `ui-specs/phase-2/migration-and-cleanup.md`
> and hardened by the 2026-07-21 pass. Follow it in order. Do not skip step 1.

**Governing rule:** *a slightly larger codebase that works beats a lean one that's broken.*
If removing something **might** break a build or a flow, do not remove it — flag it.

---

## The five boundaries — never sweep across these

Auth · payments/escrow · session · data models · security controls.

Code inside these may be deleted only as a **deliberate, isolated decision**, never as part of a
bulk pass. If a sweep reaches one of them, stop and add a `P2-F#` to `ui-specs/phase-2/flagged.md`.

---

## Step 1 — Map before you touch anything

Never delete from intuition. Build the reachability graph first.

```bash
node tools/deadcode.js marketplace/src
```

Roots are `src/pages/**` (Next.js entry points), `src/middleware.ts`, and test files. Anything not
reachable from a root is a **candidate** — not a verdict.

Then classify every candidate into one of three tiers:

| Tier | Meaning | Action |
|---|---|---|
| **A** | Provably dead: zero importers, no dynamic reference, outside all five boundaries | delete |
| **B** | Superseded by the redesign; spec confirms the replacement exists | delete, cite the spec in the commit |
| **C** | Inside a boundary, or intentional scaffolding for planned work | **flag, do not delete** |

---

## Step 2 — Verify each candidate against the four false-positive traps

A reachability tool lies in predictable ways. Check all four before deleting:

1. **Ambient type declarations.** `*.d.ts` files are loaded by TypeScript, never imported. Always
   look orphaned. **Never delete on reachability alone.**
2. **Dead clusters.** A file with importers can still be dead if *its importers* are dead. Trace the
   chain to a real page. (`lib/prisma.ts` showed 4 importers — all four were themselves orphaned.)
3. **Alias vs relative imports.** Grepping `@/lib/foo` misses `./foo`. Trust the graph, not grep.
4. **Partial directories.** A dead folder often has one live file. Check every survivor before
   `git rm -r`. (`features/events/data/types.ts` was live inside an otherwise dead tree.)

Prove the negative explicitly. "Probably unused" is not a reason to delete:

```bash
# does anything reference it, in any import form?
grep -rIn "the-module" marketplace/src --include="*.ts" --include="*.tsx"
# is the dependency it needs even installed / configured?
ls marketplace/prisma/ 2>/dev/null || echo "no schema — this code cannot run"
```

---

## Step 3 — Delete in small, reversible commits

One concern per commit. Never mix a deletion with a fix.

After **every** commit:

```bash
cd marketplace && npm run build
```

`next.config.js` sets `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`, so **a passing build
does not mean a working app.** Read the warnings — `Attempted import error` lines are real runtime
bugs. Also run:

```bash
npx tsc --noEmit          # the check the build is configured to skip
```

If a change breaks anything: revert that commit, flag it, move on. Do not "fix forward" mid-sweep.

---

## Step 4 — Bug pass while you're in there

Cleanup invalidates caches and surfaces latent bugs. Catch them:

- `Attempted import error` in build output → a function that doesn't exist → dead endpoint
- broken links / unreachable routes
- missing loading / empty / error states
- inputs below 16px (iOS zoom-on-focus)
- animations with no `prefers-reduced-motion` fallback
- horizontal-scroll leaks (`overflow-x`)
- theme-token mismatches (pure `#000` instead of brand `#0A0A0A`; `100vh` instead of `100dvh`)

---

## Step 5 — Log everything

Nothing vanishes silently. Every pass produces:

1. **The map** (before): candidates by tier.
2. **The removed-items log** (after): what, how big, and *why it was provably safe* — in the commit
   message, so `git log` alone explains the deletion.
3. **The flag list**: everything in Tier C, appended to `ui-specs/phase-2/flagged.md` as `P2-F#`.

---

## What counts as dead

Unreachable modules · unused exports/imports · commented-out blocks · `console.log` **in shipped
client code** · duplicate implementations of one job · superseded pre-redesign screens · unreferenced
assets · stale routes · feature flags never read · backup directories (`*.bak`, `*.old`, `* 2.ts`).

## What does *not* count as dead

`*.d.ts` ambient types · server-side operational logging in migrations/cron · deliberate scaffolding
for scheduled work · anything inside the five boundaries · anything you have not proven.

---

## Repo-specific traps (learned the hard way)

- **`ui-specs/` is tracked on only some branches.** Switching branches silently deletes the specs
  from your working tree. Confirm `ls ui-specs/` after every `git checkout`.
- **`.gitignore` has `node_modules/` — which does not match `node_modules.bak/`.** That is how
  50,739 files got committed. Ignore backup patterns explicitly.
- **Never add a repo-root `vercel.json`** — it breaks Next.js detection. The dashboard
  `Root Directory=marketplace` drives the build.
- **Lockfile drift has broken this project's deploys before.** Any `package.json` change goes in its
  own commit, with `npm install` run and the lockfile committed alongside.
- **Deploys race.** GitHub Actions and Vercel's Git integration both deploy; verify on the real URL
  in incognito, not the dashboard.

---

## Quick reference

```bash
node tools/deadcode.js marketplace/src   # 1. map
grep -rIn "candidate" marketplace/src    # 2. prove it's unreferenced
git rm <files> && cd marketplace && npm run build && npx tsc --noEmit   # 3. delete + verify
git commit                               # 4. one concern, with the why
# 5. Tier C -> ui-specs/phase-2/flagged.md
```
