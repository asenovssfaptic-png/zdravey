// generate-art.mjs — dev-time painted-art generator.
//
// Turns the prompts in docs/art-direction.md into actual PNG/JPEG art using a
// free, no-key image endpoint (pollinations.ai). Same idea as the audio
// generator: runs at BUILD/DEV time, writes files under assets/img/, which are
// then BUNDLED. The app makes no network calls at runtime. These are painted
// PLACEHOLDERS in the finalized style; hand-approved masters can replace them
// later (same filenames) without any code change.
//
// It reads VOCAB + CHARACTERS so the set never drifts, only generates MISSING
// files (re-runnable / incremental), and rewrites lib/images.ts.
//
//   node --experimental-strip-types scripts/generate-art.mjs            # fill gaps
//   node --experimental-strip-types scripts/generate-art.mjs --force    # regenerate
//   ...append category names to limit: `vocab:fruit vocab:animal char`   (optional)

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CHARACTERS } from "../characters/characters.ts";
import { VOCAB } from "../content/content-model.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "assets", "img");
const force = process.argv.includes("--force");

// The shared style suffix (condensed from docs/art-direction.md §3).
const STYLE =
  "hand-painted Bulgarian folk storybook illustration, warm gouache and " +
  "watercolor texture, visible brushwork, soft paper grain, rounded friendly " +
  "shapes, cozy fairy-tale mood, gentle even lighting, earthy palette of poppy " +
  "red, cream, ochre, forest green and rose, children's picture book art, no text";

// Which vocab categories get a painted illustration. Colors are swatches,
// numbers are digits, cities are map pins — those stay as-is (emoji/drawn).
const PAINT_CATEGORIES = ["fruit", "animal", "place", "family", "body"];

// Head-and-shoulders bust subjects per character (from art-direction.md §4).
const CHARACTER_SUBJECT = {
  pizho:
    "a martenitsa pom-pom doll: two round balls of pure white wool yarn stacked like pom-poms (head and body), thin red yarn string arms and legs ending in tassels, two tiny round black bead eyes and a small stitched smile, completely featureless otherwise, no nose, no snout, no whiskers, no ears, no muzzle, a handmade folk yarn ornament on a plain cream background",
  penda:
    "a martenitsa pom-pom doll: two round balls of pure red wool yarn stacked like pom-poms (head and body), thin white yarn string arms and legs ending in tassels, two tiny round black bead eyes and a small stitched smile, a tiny folk flower on top, completely featureless otherwise, no nose, no whiskers, no ears, no muzzle, a handmade folk yarn ornament on a plain cream background",
  baba_marta:
    "Baba Marta, a kind rosy-cheeked old Bulgarian grandmother, red embroidered headscarf, cream folk blouse with shevitsa cross-stitch, warm loving smile, head and shoulders portrait",
  kuma_lisa:
    "a clever friendly fox with orange fur and white muzzle, bright intelligent eyes, sly gentle smile, small embroidered folk waistcoat, head and shoulders portrait",
  hitar_petar:
    "Hitar Petar, a clever cheerful Bulgarian peasant man, tall brown fur kalpak hat, big friendly mustache, twinkling eyes, embroidered folk waistcoat, head and shoulders portrait",
  samodiva:
    "a gentle Bulgarian forest fairy maiden, long flowing hair, crown of wildflowers, white folk gown with delicate embroidery, kind serene smile, head and shoulders portrait",
  krali_marko:
    "Krali Marko, a big gentle-giant Bulgarian folk hero, large friendly mustache, fur cap, red embroidered warrior tunic, kind confident heroic smile, head and shoulders portrait",
  zmey:
    "a small friendly benevolent Bulgarian dragon, plump rounded body, soft green scales, pale belly, little rounded wings, big kind eyes, shy warm smile, no sharp teeth, cute, head and shoulders portrait",
  kuker:
    "a friendly Bulgarian festival Kuker mummer, shaggy fur costume, colorful decorated folk mask with wool pom-poms and gentle curled horns, cheerful and celebratory not scary, head and shoulders portrait",
};

// Painted scene backgrounds + a folk border. Kept soft / low-contrast so text
// and tiles stay readable over them (docs/art-direction.md §5).
const BACKGROUNDS = [
  {
    name: "village",
    w: 896,
    h: 1216,
    prompt:
      "a cozy storybook Bulgarian village in a rose valley, winding dirt path past little folk cottages with red-tiled roofs, blooming rose bushes, Balkan mountains and soft clouds, warm morning light, soft and low-contrast, calm and inviting",
  },
  {
    name: "meadow",
    w: 896,
    h: 1216,
    prompt:
      "a sunlit flowering mountain meadow with tall grass, wildflowers, slender birch trees and distant soft hills, gentle soft-focus, peaceful, low-contrast pastel",
  },
  {
    name: "festival",
    w: 896,
    h: 1216,
    prompt:
      "a joyful Bulgarian spring festival village square, red-and-white martenitsi and bunting strung between blossoming trees, folk decorations, sunny happy atmosphere, soft low-contrast",
  },
  {
    name: "shevitsa_border",
    w: 1024,
    h: 128,
    prompt:
      "a seamless horizontal Bulgarian shevitsa cross-stitch embroidery border strip, geometric folk motifs in poppy red and dark red on cream linen, symmetrical, tileable, flat, centered",
  },
];

// Painted Bulgarian landmark scenes for the jigsaw puzzle game. Square, rich
// but friendly — the finished picture IS the reward (docs/art-direction.md §5).
const PUZZLES = [
  {
    name: "rila_monastery",
    label: { bg: "Рилски манастир", en: "Rila Monastery" },
    prompt:
      "Rila Monastery in the Bulgarian mountains, iconic striped arched colonnades and red-and-white painted facade, green domes, forested peaks behind, sunny cheerful",
  },
  {
    name: "nesebar",
    label: { bg: "Несебър", en: "Nesebar" },
    prompt:
      "the old seaside town of Nesebar on the Black Sea, little stone-and-wood houses with red roofs, an old stone church, blue sea and boats, sunny",
  },
  {
    name: "belogradchik",
    label: { bg: "Белоградчишки скали", en: "Belogradchik Rocks" },
    prompt:
      "the Belogradchik rock formations, huge warm-red sandstone rocks and towers with green trees, a little fortress, dramatic but friendly, blue sky",
  },
  {
    name: "rose_valley",
    label: { bg: "Розовата долина", en: "Rose Valley" },
    prompt:
      "the Bulgarian Rose Valley, rolling fields of blooming pink roses, a woman in folk costume gathering roses in a basket, mountains behind, warm morning",
  },
  {
    name: "plovdiv",
    label: { bg: "Стария Пловдив", en: "Old Plovdiv" },
    prompt:
      "the old town of Plovdiv, colorful revival-era houses with bay windows on a cobbled hill street, warm cheerful colors",
  },
  {
    name: "pirin_lake",
    label: { bg: "Пирин", en: "Pirin" },
    prompt:
      "a clear blue glacial lake high in the Pirin mountains, pine trees and rocky peaks reflected in the water, wildflowers, peaceful sunny day",
  },
];

const only = process.argv.filter(
  (a) => a.startsWith("vocab:") || a === "char" || a === "bg" || a === "puzzle",
);
function wants(kind) {
  return only.length === 0 || only.includes(kind);
}

// Build the work list: {file, prompt, w?, h?}.
const jobs = [];
for (const [id, c] of Object.entries(CHARACTERS)) {
  if (!wants("char")) continue;
  const subject = CHARACTER_SUBJECT[id];
  if (!subject) continue;
  jobs.push({
    file: join(IMG, "char", `${id}.jpg`),
    prompt: `${subject}, centered, soft cream background, ${STYLE}`,
  });
}
for (const [id, v] of Object.entries(VOCAB)) {
  const category = id.split(".")[0];
  if (!PAINT_CATEGORIES.includes(category)) continue;
  if (!wants(`vocab:${category}`)) continue;
  jobs.push({
    file: join(IMG, "vocab", `${id.replace(/\./g, "_")}.jpg`),
    prompt: `a single ${v.labels.en}, centered, simple clean shapes, soft cream background, readable as a small icon, ${STYLE}`,
  });
}
for (const bg of BACKGROUNDS) {
  if (!wants("bg")) continue;
  jobs.push({ file: join(IMG, "bg", `${bg.name}.jpg`), prompt: `${bg.prompt}, ${STYLE}`, w: bg.w, h: bg.h });
}
for (const pz of PUZZLES) {
  if (!wants("puzzle")) continue;
  jobs.push({ file: join(IMG, "puzzle", `${pz.name}.jpg`), prompt: `${pz.prompt}, ${STYLE}`, w: 768, h: 768 });
}

// Stable per-file seed so re-runs are reproducible.
function seedOf(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h % 100000;
}

let made = 0;
let skipped = 0;
for (const job of jobs) {
  if (existsSync(job.file) && !force) {
    skipped++;
    continue;
  }
  mkdirSync(dirname(job.file), { recursive: true });
  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(job.prompt) +
    `?width=${job.w ?? 512}&height=${job.h ?? 512}&nologo=true&model=flux&seed=${seedOf(job.file)}`;
  const name = job.file.replace(IMG + "/", "");
  process.stdout.write(`ART  ${name} ... `);
  try {
    execFileSync("curl", ["-fsS", "--max-time", "120", "-o", job.file, url], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    const kb = Math.round(statSync(job.file).size / 1024);
    if (kb < 3) throw new Error(`tiny file (${kb}kb)`);
    console.log(`ok (${kb}kb)`);
    made++;
  } catch (e) {
    console.log("FAILED: " + e.message);
  }
}

// Rewrite lib/images.ts from whatever art now exists on disk.
function fileFor(dir, name) {
  const p = join(IMG, dir, name);
  return existsSync(p) ? `../assets/img/${dir}/${name}` : null;
}

const vocabEntries = Object.keys(VOCAB)
  .map((id) => ({ id, req: fileFor("vocab", `${id.replace(/\./g, "_")}.jpg`) }))
  .filter((e) => e.req)
  .map((e) => `  ${JSON.stringify(e.id)}: require(${JSON.stringify(e.req)}),`)
  .join("\n");

const charEntries = Object.keys(CHARACTERS)
  .map((id) => ({ id, req: fileFor("char", `${id}.jpg`) }))
  .filter((e) => e.req)
  .map((e) => `  ${JSON.stringify(e.id)}: require(${JSON.stringify(e.req)}),`)
  .join("\n");

const bgEntries = BACKGROUNDS.map((bg) => ({ name: bg.name, req: fileFor("bg", `${bg.name}.jpg`) }))
  .filter((e) => e.req)
  .map((e) => `  ${JSON.stringify(e.name)}: require(${JSON.stringify(e.req)}),`)
  .join("\n");

const puzzleEntries = PUZZLES.map((pz) => ({ name: pz.name, req: fileFor("puzzle", `${pz.name}.jpg`) }))
  .filter((e) => e.req)
  .map((e) => `  ${JSON.stringify(e.name)}: require(${JSON.stringify(e.req)}),`)
  .join("\n");

const banner =
  "// AUTO-GENERATED registry — painted art from scripts/generate-art.mjs.\n" +
  "// Components fall back to emoji/avatars for any id NOT listed here.\n" +
  "// Re-run the generator to add more; drop a hand-approved PNG at the same\n" +
  "// path to replace a placeholder with no code change.\n";

writeFileSync(
  join(ROOT, "lib", "images.ts"),
  `import type { ImageSourcePropType } from "react-native";\n\n${banner}\n` +
    `export const VOCAB_IMAGES: Record<string, ImageSourcePropType> = {\n${vocabEntries}\n};\n\n` +
    `export const CHARACTER_IMAGES: Record<string, ImageSourcePropType> = {\n${charEntries}\n};\n\n` +
    `export const BACKGROUNDS: Record<string, ImageSourcePropType> = {\n${bgEntries}\n};\n\n` +
    `export const PUZZLE_IMAGES: Record<string, ImageSourcePropType> = {\n${puzzleEntries}\n};\n\n` +
    `export function vocabImage(id?: string): ImageSourcePropType | null {\n` +
    `  return (id && VOCAB_IMAGES[id]) || null;\n}\n\n` +
    `export function characterImage(id?: string): ImageSourcePropType | null {\n` +
    `  return (id && CHARACTER_IMAGES[id]) || null;\n}\n\n` +
    `export function background(name: string): ImageSourcePropType | null {\n` +
    `  return BACKGROUNDS[name] || null;\n}\n\n` +
    `export function puzzleImage(name: string): ImageSourcePropType | null {\n` +
    `  return PUZZLE_IMAGES[name] || null;\n}\n`,
);

console.log(`\nDone. Generated ${made}, skipped ${skipped}. Rewrote lib/images.ts.`);
