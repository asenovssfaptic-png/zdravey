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

const only = process.argv.filter((a) => a.startsWith("vocab:") || a === "char");
function wants(kind) {
  return only.length === 0 || only.includes(kind);
}

// Build the work list: {file, prompt, seed}.
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
    `?width=512&height=512&nologo=true&model=flux&seed=${seedOf(job.file)}`;
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
    `export function vocabImage(id?: string): ImageSourcePropType | null {\n` +
    `  return (id && VOCAB_IMAGES[id]) || null;\n}\n\n` +
    `export function characterImage(id?: string): ImageSourcePropType | null {\n` +
    `  return (id && CHARACTER_IMAGES[id]) || null;\n}\n`,
);

console.log(`\nDone. Generated ${made}, skipped ${skipped}. Rewrote lib/images.ts.`);
