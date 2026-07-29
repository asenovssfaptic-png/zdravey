// generate-sfx.mjs — dev-time UI sound generator (pure Node, no deps, no network).
// Synthesizes short "juice" sounds for win moments and writes bundled WAVs.
// Re-runnable; skips existing files. `npm run generate:sfx`.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "audio", "sfx");
mkdirSync(OUT, { recursive: true });

const RATE = 44100;

// Render an array of tone segments into a mono 16-bit WAV buffer.
// Each segment: { freq, start, dur, gain, decay }.
function render(totalDur, segments) {
  const n = Math.floor(RATE * totalDur);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let s = 0;
    for (const seg of segments) {
      const lt = t - seg.start;
      if (lt < 0 || lt > seg.dur) continue;
      const attack = Math.min(1, lt * 120); // ~8ms soft attack, no click
      const env = attack * Math.exp(-(seg.decay ?? 6) * lt);
      s += Math.sin(2 * Math.PI * seg.freq * lt) * env * (seg.gain ?? 0.5);
    }
    s = Math.max(-1, Math.min(1, s));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

// A tiny soft "pop"/click — one short high blip. Per correct item.
const POP = render(0.16, [{ freq: 880, start: 0, dur: 0.16, gain: 0.55, decay: 22 }]);
// A bright rising 3-note arpeggio (C6 E6 G6) — completing an exercise/round.
const SUCCESS = render(0.6, [
  { freq: 1046.5, start: 0.0, dur: 0.25, gain: 0.5, decay: 7 },
  { freq: 1318.5, start: 0.11, dur: 0.28, gain: 0.5, decay: 7 },
  { freq: 1568.0, start: 0.22, dur: 0.36, gain: 0.55, decay: 5.5 },
]);
// A fuller fanfare (C E G C-octave) — big wins (lesson done / puzzle solved).
const FANFARE = render(0.95, [
  { freq: 523.25, start: 0.0, dur: 0.3, gain: 0.45, decay: 5 },
  { freq: 659.25, start: 0.14, dur: 0.3, gain: 0.45, decay: 5 },
  { freq: 783.99, start: 0.28, dur: 0.34, gain: 0.5, decay: 4.5 },
  { freq: 1046.5, start: 0.44, dur: 0.5, gain: 0.6, decay: 3.2 },
]);

const FILES = { "pop.wav": POP, "success.wav": SUCCESS, "fanfare.wav": FANFARE };
let made = 0;
for (const [name, data] of Object.entries(FILES)) {
  const file = join(OUT, name);
  if (existsSync(file)) continue;
  writeFileSync(file, data);
  made++;
  console.log(`SFX ${name} (${(data.length / 1024).toFixed(0)}kb)`);
}
console.log(`Done. Generated ${made} sfx.`);
