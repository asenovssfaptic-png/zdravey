// generate-notes.mjs — dev-time tone generator for the Music minigame.
// Writes short pentatonic sine-tone WAVs (pure Node, no deps, no network) that
// are bundled like the rest of the audio. Re-runnable; skips existing files.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "audio", "notes");
mkdirSync(OUT, { recursive: true });

// A bright C-major pentatonic — no "wrong"-sounding note, so any tap is pleasant.
const NOTES = { c: 523.25, d: 587.33, e: 659.25, g: 783.99, a: 880.0 };
const RATE = 44100;
const DUR = 0.6;

function wav(freq) {
  const n = Math.floor(RATE * DUR);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    // Gentle attack/decay envelope so notes sound like a soft bell, no clicks.
    const env = Math.min(1, t * 40) * Math.exp(-3 * t);
    const s = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
    data.writeInt16LE(Math.max(-32767, Math.min(32767, (s * 32767) | 0)), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

let made = 0;
for (const [name, freq] of Object.entries(NOTES)) {
  const file = join(OUT, `${name}.wav`);
  if (existsSync(file)) continue;
  writeFileSync(file, wav(freq));
  made++;
  console.log(`NOTE ${name} (${freq.toFixed(0)}Hz) -> assets/audio/notes/${name}.wav`);
}
console.log(`Done. Generated ${made} note(s).`);
