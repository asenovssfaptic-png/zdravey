/* Gamarjoba! mobile — programmatic app icon.
 *
 * Renders the borjgali (the app's brand mark — 7 spiral arms, matching the
 * web app's <symbol id="borjgali">: quadratic curves M50,50 Q58,30 50,12
 * rotated k·(360/7)°, plus a center disc) into PNGs with pure Node + zlib.
 * No dependencies: a minimal PNG encoder + stamped-disc rasterization
 * (sample each curve densely, stamp filled discs of radius strokeWidth/2 —
 * fast, and gives correct round caps/joins).
 *
 * Outputs (committed):
 *   assets/images/icon.png                     1024² red glyph on #FAF6F0
 *   assets/images/android-icon-foreground.png  1024² transparent, glyph in 66% safe zone
 *   assets/images/android-icon-background.png  1024² solid #FAF6F0
 *   assets/images/android-icon-monochrome.png  1024² white glyph, transparent
 *   assets/images/splash-icon.png              512² red glyph, transparent
 *   assets/images/favicon.png                  48² icon
 *
 * Run: npm run build:icon
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "assets", "images");
fs.mkdirSync(OUT, { recursive: true });

const RED = [0xda, 0x29, 0x1c, 255]; // theme accent
const CREAM = [0xfa, 0xf6, 0xf0, 255]; // theme bg
const WHITE = [255, 255, 255, 255];

/* ---------------- PNG encoder (RGBA, 8-bit) ---------------- */

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // filter: none per scanline
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------------- borjgali rasterizer ---------------- */

/** Render the borjgali into a size×size RGBA buffer.
 * bg: [r,g,b,a] or null (transparent); fg: glyph color;
 * scale: glyph size as a fraction of the canvas (1 = full 100-unit box). */
function renderBorjgali(size, bg, fg, scale = 1) {
  const rgba = Buffer.alloc(size * size * 4);
  if (bg) {
    for (let i = 0; i < size * size; i++) {
      rgba[i * 4] = bg[0];
      rgba[i * 4 + 1] = bg[1];
      rgba[i * 4 + 2] = bg[2];
      rgba[i * 4 + 3] = bg[3];
    }
  }

  // coverage mask with 2x supersampling grid for soft edges
  const ss = 2;
  const m = size * ss;
  const mask = new Uint8Array(m * m);

  // unit(0-100) -> mask px
  const u = (v) => ((v - 50) * scale + 50) * (m / 100);
  const strokeW = 6 * scale * (m / 100); // stroke width 6 units
  const capR = strokeW / 2;

  function stampDisc(cx, cy, r) {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(m - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(m - 1, Math.ceil(cy + r));
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) mask[y * m + x] = 1;
      }
    }
  }

  // 7 arms: quadratic bezier P0(50,50) C(58,30) P1(50,12), rotated k*(360/7)°
  const ARMS = 7;
  for (let k = 0; k < ARMS; k++) {
    const ang = (k * 2 * Math.PI) / ARMS;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const rot = ([x, y]) => {
      const dx = x - 50;
      const dy = y - 50;
      return [50 + dx * cos - dy * sin, 50 + dx * sin + dy * cos];
    };
    const p0 = rot([50, 50]);
    const pc = rot([58, 30]);
    const p1 = rot([50, 12]);
    const N = 4000;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = 1 - t;
      const x = a * a * p0[0] + 2 * a * t * pc[0] + t * t * p1[0];
      const y = a * a * p0[1] + 2 * a * t * pc[1] + t * t * p1[1];
      stampDisc(u(x), u(y), capR);
    }
  }
  // center disc r=7 units
  stampDisc(u(50), u(50), 7 * scale * (m / 100));

  // downsample mask -> alpha blend fg over bg
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          cov += mask[(y * ss + sy) * m + (x * ss + sx)];
        }
      }
      if (cov === 0) continue;
      const a = cov / (ss * ss);
      const i = (y * size + x) * 4;
      if (bg) {
        rgba[i] = Math.round(fg[0] * a + rgba[i] * (1 - a));
        rgba[i + 1] = Math.round(fg[1] * a + rgba[i + 1] * (1 - a));
        rgba[i + 2] = Math.round(fg[2] * a + rgba[i + 2] * (1 - a));
        rgba[i + 3] = 255;
      } else {
        rgba[i] = fg[0];
        rgba[i + 1] = fg[1];
        rgba[i + 2] = fg[2];
        rgba[i + 3] = Math.round(255 * a);
      }
    }
  }
  return rgba;
}

function solid(size, color) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = color[0];
    rgba[i * 4 + 1] = color[1];
    rgba[i * 4 + 2] = color[2];
    rgba[i * 4 + 3] = color[3];
  }
  return rgba;
}

function write(name, size, rgba) {
  fs.writeFileSync(path.join(OUT, name), encodePng(size, size, rgba));
  console.log(`  ✓ ${name} (${size}×${size})`);
}

console.log("Rendering borjgali icons…");
write("icon.png", 1024, renderBorjgali(1024, CREAM, RED, 0.82));
write("android-icon-foreground.png", 1024, renderBorjgali(1024, null, RED, 0.6)); // 66% safe zone
write("android-icon-background.png", 1024, solid(1024, CREAM));
write("android-icon-monochrome.png", 1024, renderBorjgali(1024, null, WHITE, 0.6));
write("splash-icon.png", 512, renderBorjgali(512, null, RED, 0.9));
write("favicon.png", 48, renderBorjgali(48, CREAM, RED, 0.86));
console.log("Done.");
