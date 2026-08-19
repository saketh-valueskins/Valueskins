# Tasks Remaining — Blocked & Flagged

## #9: Project.md (BLOCKING — needs creation)

**Status**: Not in repo. Cited by multiple specs as authority. Blocks:
- Level-2 tier naming (creator tiers, brand tiers)
- ValueSkin Type enumeration (what types exist, rules per type)

**What it should contain** (inferred from specs):
- Creator tier levels: Free, Pro, Enterprise (definitions, limits, revenue share)
- Brand tier levels: Free, Pro, Enterprise (definitions, limits)
- ValueSkin types: what they are, name/description/rules per type
- Pricing thresholds tied to tier
- Permission matrix (what each tier can do)

**Blockers**: 
- No written definition of tiers → specs assume it exists but don't define it
- No mock or reference design provided
- Can't pin feature values without it

**Action**: Write `phase-2/Project.md` as source of truth before proceeding with Store, tier UI, or type rules.

---

## #10: Render Password Still Live (SECURITY — needs manual rotation)

**Status**: Half-done
- ✅ Credential removed from repo (committed)
- ❌ Password still in git history (git log shows it)
- ❌ Render database 5432 still publicly reachable with old password

**Risk**: Anyone with git history access can retrieve the password and connect to the live database.

**Fix required** (manual, needs your Render dashboard):
1. Rotate database password in Render dashboard
2. Update any services connected to it (if any)
3. Verify 5432 is either firewalled or requires the new password

**Action**: You must do this via Render dashboard. Once rotated, the old password in git history becomes useless.

---

## #5: Store Two-Pane (INTENTIONALLY PAUSED)

**Status**: Blocked on structural spec
- SVG mock exists but has no written numbers (spacing, widths, colors, breakpoints)
- Structural rebuild would need ~20 hour refactor
- No written spec to validate against = risk of guessing wrong

**Why paused**:
- migration-and-cleanup.md's golden rule: "if removing something might break a flow, flag it instead"
- User shipped broken composer earlier today moving fast on big change at end of long stretch
- Risk of repeating that mistake is high at fatigue boundary

**Decision**: Don't rebuild #5 without writing `phase-2/Store.md` from the mock first. Spec → build, not guess → build.

**Action**: Ready to start on explicit go-ahead. Phase 1: write Store.md with exact values from mock. Phase 2: rebuild components.

---

## #12: Dead Code Cleanup (INTENTIONALLY PAUSED)

**Status**: Blocked on safety verification
- Deletes ~4,100 lines including `lib/security/**` (security boundary)
- No browser testing of affected flows completed
- Risk: silent failure in payment/auth flow, or creator/brand workflows

**Why paused**: Same fatigue boundary as #5. Deleting security lib without verification is the same error mode as shipping broken features.

**Decision**: Verify all flows work in browser first, then delete with test coverage.

**Action**: Ready to start on explicit go-ahead. Phase 1: test all flows (auth, payment, messaging, deals). Phase 2: delete + verify tests pass.

---

## Summary

| Task | Status | Blocker | Owner | Next Step |
|------|--------|---------|-------|-----------|
| #9 Project.md | ❌ Not done | Spec authority missing | You | Write phase-2/Project.md |
| #10 Render password | ❌ Half-done | Manual dashboard action | You | Rotate password in Render dashboard |
| #5 Store two-pane | ⏸️ Paused | No spec written | You → Me | Write phase-2/Store.md, then go-ahead |
| #12 Dead code | ⏸️ Paused | No browser verification | You → Me | Approve browser testing, then go-ahead |

**Recommendation**: 
- Do #9 and #10 immediately (you own both, unblock specs and security)
- On #5 and #12: write the spec first (Store.md), then give explicit go if you want both rebuilt together or one at a time
