/* Gentle sounds — bundled WAVs synthesized by scripts/build-content.mjs
 * (the web app used a WebAudio oscillator). A second dedicated player so
 * SFX never truncate speech on the shared clip player. All fire-and-forget
 * and optional: sound failure never breaks play. */

import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { SFX_ASSETS } from "../content/generated/audioAssets";

/* Lazily created — the web player needs a browser environment, which the
 * static-export (SSR) pass does not have. */
let sfxPlayer: AudioPlayer | null | undefined;

function play(src: number): void {
  try {
    if (sfxPlayer === undefined) sfxPlayer = createAudioPlayer();
    if (!sfxPlayer) return;
    sfxPlayer.replace(src);
    sfxPlayer.seekTo(0).catch(() => {});
    sfxPlayer.play();
  } catch {
    sfxPlayer = sfxPlayer ?? null;
    /* sound is optional */
  }
}

/** Correct answer / finish. */
export function chime(): void {
  play(SFX_ASSETS.chime);
}

/** Gentle miss (low, soft — never harsh). */
export function boop(): void {
  play(SFX_ASSETS.boop);
}

/** A matched pair / a safari find. */
export function match(): void {
  play(SFX_ASSETS.match);
}
