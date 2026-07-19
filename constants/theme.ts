// Shared martenitsa-themed design tokens. Components must read colors,
// spacing, and sizes from here — no hardcoded hex/px scattered around.

export const Colors = {
  red: "#E24B4A",
  darkRed: "#A32D2D",
  white: "#F1EFE8",
  text: "#3A2323",
  textMuted: "#8C6F6F",
  gold: "#F2C14E",
  correct: "#5FA777",
  // Soft background tints for resolved/selected states.
  tintGold: "#FBF3DC",
  tintGreen: "#E7F5EC",
  // Crisp white for the martenitsa's Pizho doll (the app "white" is cream).
  martenitsaWhite: "#FFFFFF",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radii = {
  md: 16,
  lg: 24,
  round: 999,
} as const;

export const FontSizes = {
  body: 18,
  label: 22,
  title: 32,
  huge: 48,
} as const;

export const TouchTarget = {
  min: 88,
  comfortable: 72, // grid cells (alphabet) where many targets share a screen
} as const;
