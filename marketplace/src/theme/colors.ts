// ValueSkins Design System — brand palette per LOGO_HANDOFF.md
// Near-black / off-white / warm sand. No blues, no startup greens.
// Token names kept identical so all 29 importing pages re-skin uniformly.

export const COLORS = {
  // Primary — near black, the brand's strong action color
  primary: '#0A0A0A',
  primaryContainer: '#F0F0EA',
  onPrimary: '#F5F5F0',
  onPrimaryContainer: '#2D2D2D',
  primaryFixed: '#F0F0EA',
  primaryFixedDim: '#E0E0DA',

  // Secondary — charcoal
  secondary: '#2D2D2D',
  secondaryContainer: '#F0F0EA',
  onSecondary: '#F5F5F0',
  onSecondaryContainer: '#2D2D2D',
  secondaryFixed: '#F0F0EA',
  secondaryFixedDim: '#E0E0DA',

  // Tertiary — deep sand accent family
  tertiary: '#A08A5E',
  tertiaryContainer: '#F0EBE0',
  onTertiary: '#F5F5F0',
  onTertiaryContainer: '#6B5C3E',
  tertiaryFixed: '#F0EBE0',
  tertiaryFixedDim: '#C8B89A',

  // Background — off-white
  background: '#F5F5F0',
  onBackground: '#0A0A0A',
  surface: '#F5F5F0',
  surfaceBright: '#F5F5F0',
  surfaceDim: '#E8E8E2',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FAFAF7',
  surfaceContainer: '#F0F0EA',
  surfaceContainerHigh: '#EAEAE4',
  surfaceContainerHighest: '#E0E0DA',
  onSurface: '#0A0A0A',
  onSurfaceVariant: '#2D2D2D',
  inverseSurface: '#0A0A0A',
  inverseOnSurface: '#F5F5F0',

  // Outline
  outline: '#8B8B85',
  outlineVariant: '#E0E0DA',

  // Error — restrained brick/oxblood, NOT fire-engine red (BRANDING §4/§10.7).
  // Reserved for inline error TEXT and the inside of confirm dialogs only —
  // never a resting CTA or button fill. Muted so it reads on off-white/near-black
  // without fighting the sand accent.
  error: '#B0413E',
  errorContainer: '#F3E3E1',
  onError: '#FFFFFF',
  onErrorContainer: '#7A2B29',

  // Semantic — no startup green, no orange (BRANDING §4).
  // Positive/success reads in the brand's own language: deep sand.
  success: '#A08A5E', // deep sand — success/active/positive (was green)
  accent: '#A08A5E', // deep sand — brand accent (no blues)
  warning: '#8A7A56', // muted sand-charcoal — caution (was orange)

  // Text variants
  text: '#0A0A0A',
  textMuted: '#2D2D2D',
  textVariant: '#8B8B85',

  // Utility
  transparent: 'transparent',
  white: '#ffffff',
  black: '#000000',
};

// Legacy color names for backwards compatibility
export const C = {
  bg: COLORS.background,
  surface: COLORS.surface,
  primary: COLORS.primary,
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
  border: '#E0E0DA',
  borderLight: '#F0F0EA',
};

export default COLORS;
