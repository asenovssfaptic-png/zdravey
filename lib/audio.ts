import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import type { AudioClip } from "@/content/content-model";
import { AUDIO_ASSETS } from "./audioAssets";

// A kid can tap a tile before its audio finishes loading; seekTo(0) makes
// repeat taps restart the clip instead of doing nothing.
export function useClipPlayer(clip: AudioClip) {
  const source = AUDIO_ASSETS[clip.src] ?? null;
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  function play() {
    player.seekTo(0);
    player.play();
  }

  return { play, isPlaying: status.playing };
}

// One reusable player for grids (e.g. the alphabet) where mounting a separate
// player per tile would be wasteful. Swaps the source on each tap.
export function useOnDemandPlayer() {
  const player = useAudioPlayer(null);

  function play(clip: AudioClip) {
    const source = AUDIO_ASSETS[clip.src] ?? null;
    if (!source) return;
    player.replace(source);
    player.seekTo(0);
    player.play();
  }

  return { play };
}
