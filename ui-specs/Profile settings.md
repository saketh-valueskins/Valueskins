# Profile Settings — UI Spec

> Template: **Profile / account settings** (creator + brand). Light + dark.
> Inherits `_global-conventions.md` (no pill · Inter · sand accent · G4) and obeys `BRANDING.md`.
> Status: **approved build.** Sample: `_samples_delete_later/profile-settings-sample.html`.

> **Note:** this is a *different surface* from `Personal Settings.md` (that one = profile-data/brand-profile fields). Decide whether they merge into one Settings hub or stay as two tabs. Recommendation: one Settings shell, these as two rail groups.

---

## 0. What's changing

The generic stacked grey cards + red Sign Out are replaced with an **identity-led, left-rail settings hub** carrying the real controls a marketplace account needs.

1. **Remove the oval pill** (G1); wordmark as text.
2. **Identity hero** replaces the plain "Account Settings" box.
3. **Left nav rail + scrollspy** (same pattern as `Personal Settings`).
4. **Red Sign Out → quiet Danger Zone.**
5. **Inter everywhere; light + dark.**
6. **New sections added** (below) — notifications, payments/payouts, security, connections, appearance.

---

## 1. Layout

Left **nav rail (236px, sticky, scrollspy)** + content, centered in `max-width:1180px`. Rail sections: `Account · Profile & Skins · Notifications · Payments & Payouts · Security · Connections · Appearance · Danger Zone`. Active item = sand left-border, scrollspy updates on scroll, smooth-scroll on click (G4 orientation). Collapses to pill-chips < 900px.

## 2. Account (identity hero)

- **Hero card** (premium dark surface both themes): ValueSkin pixel avatar (~92px framed), name, email, and **Type × Tier × Verified** pills (`Professional` solid sand, `Signal · Level 3` outline, `Verified` with sand check). This anchors the page — no more grey "Account Settings" box.
- Below: editable `Display name` + `Email` (hairline fields, sand focus), `Save Changes` (solid near-black/off-white by theme).

## 3. Profile & Skins (quick-link rows)

- `Creator Profile` → the detailed editor (bio, social links, portfolio, **pitch clip**, marketplace settings). Quiet icon row.
- `Manage ValueSkins` → shows worn skin (`App Developer`) with its pixel avatar; links to switch/acquire in the Store. Ties Settings to the identity system.

## 4. Notifications (toggles)

Sand toggle switches: `New applications`, `Deal updates`, `Payouts & invoices`, `Product & marketing emails` (last off by default). Each with a one-line description.

## 5. Payments & Payouts (new — essential for a money-moving platform)

- **Payout method** card: UPI (or bank) primary, `Edit`.
- **PAN** card (masked): required for TDS (Section 194R) + identity gate. `Update`.
- Note: TDS deducted at source on payouts, remitted quarterly, Form 16A issued quarterly (`Project.md §12/§15`); `View statements →`.
- *(Sample values are placeholders — wire to Razorpay/records later.)*

## 6. Security (new)

- **Two-factor authentication** toggle (OTP on new-device sign-in).
- **Active sessions** (device/location count) → `Review`.
- **Login history** → row link.

## 7. Connected Accounts (new)

- **Google** — connected, used for sign-in (from the OAuth login).
- **Instagram** — `Connect` via official Meta OAuth to verify reach/engagement (**V2** per `Project.md §10` — ships disabled/"coming soon" until Meta App Review).

## 8. Appearance (new)

- **Theme** segmented control: `Light · Dark · System` (sand selected). Persists per user.

## 9. Danger Zone (replaces red Sign Out)

- Restrained bordered block: `Log out` and `Delete account` (GDPR Art. 17, 30-day) as quiet Charcoal-outline buttons — no red fill (G3). Confirmation carries the weight, not colour.

## 10. Colour / motion

Sand only for markers, toggles-on, active rail, focus, verified checks. No blue/green/red resting states. Motion: transform/opacity — smooth scroll, toggle slide, row/tap feedback; `prefers-reduced-motion` aware.

## 11. Do / Don't

**Do:** identity hero · left rail + scrollspy · real controls (notifications, payouts+TDS, 2FA, connections, theme) · sand toggles · quiet danger zone · light+dark.

**Don't:** stacked generic grey cards · red Sign Out · bury identity · invent live payout numbers in prod · bright/green/blue states · the pill.
