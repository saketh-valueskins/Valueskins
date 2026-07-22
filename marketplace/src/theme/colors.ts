// ValueSkins Design System — brand palette per LOGO_HANDOFF.md
// Near-black / off-white / warm sand. No blues, no startup greens.
//
// THEMING: every token below resolves to a CSS custom property, NOT a literal
// hex. The actual values live in styles/globals.css under
// :root[data-theme="light"] and :root[data-theme="dark"], and ThemeProvider
// stamps data-theme onto <html>. That is what makes light/dark apply to the
// whole app.
//
// Why it has to work this way: nearly every surface in this codebase is styled
// with inline `style={{ ... }}`, and inline styles cannot be overridden by a
// stylesheet. So the theme has to change what JS emits. Emitting a var() means
// all ~25 importing files re-skin with no changes at their call sites.
//
// DO NOT put a raw hex back into these tokens — a hex is frozen at one theme
// and silently reintroduces the light-panel-on-dark-shell bug.

const v = (name: string) => `var(--c-${name})`;

export const COLORS = {
  // Primary — near black in light, off-white in dark; the strong action colour
  primary: v('primary'),
  primaryContainer: v('primary-container'),
  onPrimary: v('on-primary'),
  onPrimaryContainer: v('on-primary-container'),
  primaryFixed: v('primary-container'),
  primaryFixedDim: v('surface-highest'),

  // Secondary — charcoal
  secondary: v('secondary'),
  secondaryContainer: v('primary-container'),
  onSecondary: v('on-primary'),
  onSecondaryContainer: v('on-primary-container'),
  secondaryFixed: v('primary-container'),
  secondaryFixedDim: v('surface-highest'),

  // Tertiary — deep sand accent family (identical in both themes)
  tertiary: v('accent'),
  tertiaryContainer: v('tertiary-container'),
  onTertiary: v('on-primary'),
  onTertiaryContainer: v('on-tertiary-container'),
  tertiaryFixed: v('tertiary-container'),
  tertiaryFixedDim: v('accent-bright'),

  // Background / surfaces
  background: v('bg'),
  onBackground: v('text'),
  surface: v('surface'),
  surfaceBright: v('surface-bright'),
  surfaceDim: v('surface-dim'),
  surfaceContainerLowest: v('surface-lowest'),
  surfaceContainerLow: v('surface-low'),
  surfaceContainer: v('surface-container'),
  surfaceContainerHigh: v('surface-high'),
  surfaceContainerHighest: v('surface-highest'),
  onSurface: v('text'),
  onSurfaceVariant: v('text-muted'),
  inverseSurface: v('inverse-surface'),
  inverseOnSurface: v('inverse-on-surface'),

  // Outline
  outline: v('outline'),
  outlineVariant: v('outline-variant'),

  // Error — restrained brick/oxblood, NOT fire-engine red (BRANDING §4/§10.7).
  // Inline error TEXT and confirm dialogs only — never a resting CTA fill.
  error: v('error'),
  errorContainer: v('error-container'),
  onError: v('on-error'),
  onErrorContainer: v('on-error-container'),

  // Semantic — no startup green, no orange (BRANDING §4).
  success: v('accent'), // deep sand — success/active/positive
  accent: v('accent'),
  warning: v('warning'),

  // Text variants
  text: v('text'),
  textMuted: v('text-muted'),
  textVariant: v('text-variant'),

  // Utility — genuinely fixed, never themed
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',
};

// Legacy color names for backwards compatibility
export const C = {
  bg: COLORS.background,
  surface: COLORS.surface,
  surfaceAlt: COLORS.surfaceContainer,
  card: COLORS.surfaceContainerLowest,
  primary: COLORS.primary,
  onPrimary: COLORS.onPrimary, // correct foreground ON C.primary in BOTH themes
  primaryContainer: COLORS.primaryContainer,
  secondary: COLORS.secondary,
  outline: COLORS.outline,
  outlineVariant: COLORS.outlineVariant,
  onSurface: COLORS.onSurface,
  onSurfaceVariant: COLORS.onSurfaceVariant,
  textMuted: COLORS.textMuted,
  textSecondary: COLORS.textMuted, // Alias for backwards compatibility
  accent: COLORS.accent,
  success: COLORS.success,
  error: COLORS.error,
  warning: COLORS.warning,
  text: COLORS.text,
  border: v('border'),
  borderLight: v('border-light'),
  danger: COLORS.error,
};

/**
 * Apply an alpha to a themed token.
 *
 * The old code wrote C.primary followed by a 2-digit hex alpha — appending it to a hex
 * colour. That only works when the token is a literal hex; now that tokens are
 * `var(--c-primary)`, string concatenation would emit `var(--c-primary)15`,
 * which is invalid CSS and silently drops the background.
 *
 * @param color a token from C / COLORS (a var() expression)
 * @param hexAlpha the original 0x00–0xFF alpha, e.g. 0x15
 */
export function withAlpha(color: string, hexAlpha: number): string {
  const pct = Math.round((hexAlpha / 255) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export default COLORS;
