/* Gamarjoba! mobile — design tokens, ported verbatim from the web app's
 * styles.css :root. The ONLY place hex colors may appear.
 */

export const colors = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  surfaceAlt: "#F3EBDF",
  ink: "#2B2320",
  inkSoft: "#6B5E57",
  accent: "#DA291C",
  accentDeep: "#A81C11",
  accentTint: "#FBE9E7",
  success: "#1E7A3C",
  successTint: "#E7F4EB",
  warnSoft: "#FFF3DC",
  gold: "#C89B3C",
  focus: "#1D4ED8",
  border: "#E5DCCF",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const type = {
  body: 17,
  h1: 28,
  h1Weight: "800" as const,
  h2: 20,
  h2Weight: "700" as const,
  /** Georgian text runs ×1.15 of the surrounding size (web `.ka`). */
  kaScale: 1.15,
} as const;

/** Minimum touch target (dp) — hard accessibility rule. */
export const minTarget = 48;

/** Soft card shadow (≈ web --shadow: 0 2px 8px rgba(43,35,32,.10)). */
export const shadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 2,
} as const;

export const theme = { colors, spacing, radii, type, minTarget, shadow };
export default theme;
