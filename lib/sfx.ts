import { useAudioPlayer } from "expo-audio";

// Short UI "juice" sounds for win moments (synthesized by scripts/generate-sfx.mjs,
// bundled — no runtime network). Kept separate from the vocab/narration players
// so a success chime can overlap the spoken word.
const SFX: Record<string, number> = {
  pop: require("../assets/audio/sfx/pop.wav"), // tiny click per correct item
  success: require("../assets/audio/sfx/success.wav"), // rising chime — exercise/round done
  fanfare: require("../assets/audio/sfx/fanfare.wav"), // big win — lesson/boss/puzzle solved
};

export type SfxName = keyof typeof SFX;

// One reusable player; swap the source per call (mirrors useOnDemandPlayer).
export function useSfx() {
  const player = useAudioPlayer(null);
  function play(name: SfxName) {
    const src = SFX[name];
    if (!src) return;
    player.replace(src);
    player.seekTo(0);
    player.play();
  }
  return { play };
}
