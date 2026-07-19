// Metro requires static require() calls to bundle local assets, so we can't
// turn a VocabItem's `audio.src` string into a file at runtime. This map is
// the one place that bridges the content model's path convention to actual
// bundled modules — add an entry here whenever a new clip is added to VOCAB.

export const AUDIO_ASSETS: Record<string, number> = {
  "audio/bg/yabalka__baba.wav": require("../assets/audio/bg/yabalka__baba.wav"),
  "audio/bg/banan__baba.wav": require("../assets/audio/bg/banan__baba.wav"),
  "audio/bg/grozde__baba.wav": require("../assets/audio/bg/grozde__baba.wav"),
  "audio/bg/krusha__baba.wav": require("../assets/audio/bg/krusha__baba.wav"),
  "audio/en/apple__default.wav": require("../assets/audio/en/apple__default.wav"),
  "audio/en/banana__default.wav": require("../assets/audio/en/banana__default.wav"),
  "audio/en/grapes__default.wav": require("../assets/audio/en/grapes__default.wav"),
  "audio/en/pear__default.wav": require("../assets/audio/en/pear__default.wav"),
};
