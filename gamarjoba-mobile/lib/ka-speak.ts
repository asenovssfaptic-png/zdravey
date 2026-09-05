/* Universal tap-to-hear: ONE shared mechanism mapping exact Georgian text
 * to a bundled audio id, built once at import (a port of the web app's
 * KA_SPEAK index, app.js). Georgian text is tappable IFF a clip resolves;
 * unresolvable text stays plain. Precedence: vocab → reading extras →
 * syllables → letters → examples; each also indexed under its
 * trailing-punctuation-stripped key. */

import { AUDIO_ASSETS, type AudioId } from "../content/generated/audioAssets";
import { CURRICULUM } from "../content/generated/curriculum";

const C = CURRICULUM;

/** Strip trailing punctuation so "გამარჯობა!" finds the "გამარჯობა" clip. */
export function kaKey(t: string): string {
  return String(t).replace(/[?!.,…]+$/, "");
}

export const KA_SPEAK: Record<string, AudioId> = {};

function indexKa(ka: string, id: string): void {
  if (!(id in AUDIO_ASSETS)) return;
  const aid = id as AudioId;
  if (!KA_SPEAK[ka]) KA_SPEAK[ka] = aid;
  const k = kaKey(ka);
  if (!KA_SPEAK[k]) KA_SPEAK[k] = aid;
}

// order matters — vocab wins:
Object.keys(C.vocab).forEach((id) => indexKa(C.vocab[id].ka, id));
(C.readingTrack?.extras ?? []).forEach((x) => indexKa(x.ka, x.id));
(C.readingTrack?.syllables ?? []).forEach((x) => indexKa(x.ka, x.id));
Object.keys(C.audioIds.letters).forEach((ch) => indexKa(ch, C.audioIds.letters[ch]));
Object.keys(C.audioIds.examples).forEach((ka) => indexKa(ka, C.audioIds.examples[ka]));

/** Bundled clip for exact Georgian text, or null (→ text stays plain). */
export function resolveKaAudio(text: string): AudioId | null {
  return KA_SPEAK[text] ?? KA_SPEAK[kaKey(text)] ?? null;
}
