import type { ImageSourcePropType } from "react-native";

// Painted-art registry. The finalized art direction (docs/art-direction.md) is
// hand-painted folk-storybook PNGs, exported per docs/asset-pipeline.md into
// assets/img/{char,vocab,ui,bg}. Those assets aren't generated yet, so these
// maps are empty and every component falls back to its emoji / drawn
// placeholder. To adopt a painted asset: drop the PNG into assets/img/... and
// add one require() line here — no component changes needed. Metro resolves
// @2x/@3x automatically.

// Vocab tile illustrations, keyed by VocabItem id (e.g. "fruit.apple").
export const VOCAB_IMAGES: Record<string, ImageSourcePropType> = {
  // "fruit.apple": require("../assets/img/vocab/fruit_apple.png"),
};

// Character busts for bubbles/hints, keyed by CharacterId (e.g. "baba_marta").
export const CHARACTER_IMAGES: Record<string, ImageSourcePropType> = {
  // "baba_marta": require("../assets/img/char/baba_marta_neutral.png"),
};

export function vocabImage(id?: string): ImageSourcePropType | null {
  return (id && VOCAB_IMAGES[id]) || null;
}

export function characterImage(id?: string): ImageSourcePropType | null {
  return (id && CHARACTER_IMAGES[id]) || null;
}
