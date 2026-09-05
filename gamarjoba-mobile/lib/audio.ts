/* Gamarjoba! mobile — speech/content audio.
 *
 * ONE shared expo-audio player (the web app plays one clip at a time;
 * keep that). Everything resolves when playback finishes (via
 * playbackStatusUpdate.didJustFinish) with a per-call fallback timeout so
 * a broken/blocked asset never stalls a session. A missing/unknown id is a
 * silent no-op — all 340 clips are bundled, so there is no speechSynthesis
 * fallback (deliberate parity deviation, see blueprint §2).
 *
 * SFX live in lib/sfx.ts on a second player so a chime never truncates
 * speech.
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { AUDIO_ASSETS, type AudioId } from "../content/generated/audioAssets";
import { CURRICULUM } from "../content/generated/curriculum";
import type { Letter, Praise, Speakable } from "../content/types";

const C = CURRICULUM;

let playToken = 0;
let finishResolve: (() => void) | null = null;

/* Lazily created on first playback: expo-audio's web player touches the
 * browser `Audio` global, which does not exist during static export
 * (SSR) — and a player is pointless there anyway. */
let player: AudioPlayer | null | undefined;

function getPlayer(): AudioPlayer | null {
  if (player !== undefined) return player;
  try {
    player = createAudioPlayer();
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      /* audio mode is a nicety; never crash */
    });
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish && finishResolve) {
        const r = finishResolve;
        finishResolve = null;
        r();
      }
    });
  } catch {
    player = null; // no audio environment — every play is a silent no-op
  }
  return player;
}

/** Play a bundled clip by id. Resolves when the clip finishes (or after
 * `fallbackMs`, or immediately for a null/unknown id). Starting a new clip
 * resolves the previous caller right away — exactly one clip plays at a
 * time. */
export function playId(
  id: AudioId | string | null | undefined,
  fallbackMs = 4000
): Promise<void> {
  // interrupt: resolve whoever was waiting on the previous clip
  if (finishResolve) {
    const r = finishResolve;
    finishResolve = null;
    r();
  }
  const asset = id != null ? (AUDIO_ASSETS as Record<string, number>)[id] : undefined;
  playToken++;
  const p = asset === undefined ? null : getPlayer();
  if (asset === undefined || !p) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      if (finishResolve === fire) finishResolve = null;
      resolve();
    };
    finishResolve = fire;
    try {
      p.replace(asset);
      p.seekTo(0).catch(() => {});
      p.play();
    } catch {
      fire();
      return;
    }
    setTimeout(fire, fallbackMs); // a broken asset never stalls a session
  });
}

/** Stop whatever is playing and resolve any waiter. */
export function stopAll(): void {
  playToken++;
  try {
    player?.pause();
  } catch {
    /* noop */
  }
  if (finishResolve) {
    const r = finishResolve;
    finishResolve = null;
    r();
  }
}

export function playWord(w: Speakable, fallbackMs?: number): Promise<void> {
  return playId(w.id, fallbackMs);
}

export function letterAudioId(l: Letter): string | null {
  return C.audioIds.letters[l.ka] ?? null;
}

export function playLetter(l: Letter, fallbackMs?: number): Promise<void> {
  return playId(letterAudioId(l), fallbackMs);
}

/** Letters have no `id`; anything speakable goes through here. */
export function playItem(x: Speakable | Letter | null | undefined, fallbackMs?: number): Promise<void> {
  if (!x) return Promise.resolve();
  if ("id" in x) return playId(x.id, fallbackMs);
  return playLetter(x, fallbackMs);
}

/** Bundled clip for a letter's example word: reuse the matching vocab
 * item's clip when one exists, else the dedicated example clip. */
export function exampleAudioId(exampleKa: string, vocabMatch?: { id: string } | null): string | null {
  if (vocabMatch?.id) return vocabMatch.id;
  return C.audioIds.examples[exampleKa] ?? null;
}

export function playExample(
  ka: string,
  vocabMatch?: { id: string } | null,
  fallbackMs?: number
): Promise<void> {
  return playId(exampleAudioId(ka, vocabMatch), fallbackMs);
}

/** Play a random Georgian praise clip; returns which one (for toasts). */
export function playPraise(): Praise | null {
  const list = C.praise ?? [];
  if (!list.length) return null;
  const p = list[Math.floor(Math.random() * list.length)];
  playId(p.id).catch(() => {});
  return p;
}

/** Spoken UI instruction (English), looked up by its exact on-screen text
 * via CURRICULUM.uiAudio. No-op when no clip exists. */
export function playUi(text: string, fallbackMs = 1800): Promise<void> {
  return playId(C.uiAudio[text] ?? null, fallbackMs);
}

export interface SoundOutHandle {
  cancel(): void;
}

/** Sound a word out: each Mkhedruli letter at 450 ms intervals, then the
 * whole word 500 ms after the last letter. `onStep(i)` fires as letter i
 * starts (for highlighting); `onStep(-1)` when the letters clear and the
 * whole word plays. Cancellation token like the web `soundToken`. */
export function soundOut(item: Speakable, onStep?: (i: number) => void): SoundOutHandle {
  let cancelled = false;
  const chars = String(item.ka).split("");
  let i = 0;
  function step(): void {
    if (cancelled) return;
    if (i < chars.length) {
      const ch = chars[i];
      onStep?.(i);
      playId(C.audioIds.letters[ch] ?? null).catch(() => {});
      i++;
      setTimeout(step, 450);
    } else {
      setTimeout(() => {
        if (cancelled) return;
        onStep?.(-1);
        playId(item.id).catch(() => {});
      }, 500);
    }
  }
  step();
  return {
    cancel() {
      cancelled = true;
    },
  };
}
