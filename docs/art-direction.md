# Art Direction & Asset Prompt Book — Zdravey!

Raster (painted) art in the style of **Bulgarian children's books & fairy tales**.
This document is the single source of truth for visual style. Every asset is
generated from a prompt here so the whole app looks like one hand-painted book.

> Workflow: generate → human test → refine the prompt here → regenerate.
> Nothing in the app is vector/flat anymore; all art is painted raster (PNG).

---

## 1. The look, in one paragraph

Warm, hand-painted **folk storybook** illustration — think mid-20th-century
Eastern-European children's picture books: gouache and watercolor texture,
visible brushwork, soft paper grain, rounded friendly shapes, cozy and never
scary. Bulgarian folk identity throughout: **shevitsa** (кръстат бод / cross-stitch)
borders, **martenitsa** red-and-white tassels, traditional **носия** costume
details, rose-valley and Balkan-mountain scenery. Rich but gentle earthy palette,
soft even lighting, storybook depth (flat-ish, no dramatic perspective).

Describe the *style*, never imitate a named living artist.

## 2. Palette

| Role | Hex | Note |
|------|-----|------|
| Poppy red (martenitsa) | `#E24B4A` | primary accent |
| Deep red | `#A32D2D` | shadows/outlines on red |
| Cream / linen | `#F1EFE8` | martenitsa white, paper |
| Ochre / wheat | `#C98A2B` | folk gold, sunlight |
| Forest green | `#3B6D11` | meadows, foliage |
| Deep pine | `#2E5A2E` | shadow greens |
| Indigo | `#2C3E6B` | night, deep accents |
| Rose pink | `#D4537E` | flowers, cheeks |
| Warm brown | `#712B13` | wood, hair, earth |

Keep every asset inside this palette so mixed generations feel unified.

## 3. Reusable prompt blocks

Paste `[STYLE]` at the end of every subject prompt, and `[NEG]` as the negative
prompt. Only the subject line changes per asset.

**[STYLE]**
```
hand-painted Bulgarian folk storybook illustration, warm gouache and watercolor
texture, visible brushwork and soft paper grain, rounded friendly shapes, cozy
fairy-tale mood, gentle even lighting, storybook flat depth, Bulgarian folk
motifs (shevitsa cross-stitch patterns, martenitsa red-and-white tassels,
traditional embroidered costume), earthy palette of poppy red, cream, ochre,
forest green, indigo and rose, high detail, warm and inviting, children's
picture book art
```

**[NEG]** (negative prompt)
```
photorealistic, 3d render, cgi, vector art, flat corporate illustration, harsh
outlines, glossy, neon, scary, creepy, sharp teeth, horror, dark, gore, sad,
modern clothing, logos, text, letters, words, watermark, signature, extra limbs,
deformed, low quality
```

**Consistency rules (read before generating anything):**
1. Generate a **character reference sheet** for each character FIRST (front view +
   3/4 view + 3 expressions). Lock a seed / save it as a reference image.
2. Reuse that reference (img2img / "character reference" / same seed) for every
   later pose of that character. Never re-roll a character from scratch.
3. Keep one light source (soft, top-left, warm) across all assets.
4. Generate everything at high res (≥2048 px on the long edge), then downscale
   for export. Painterly detail survives downscaling; it does not survive upscaling.

---

## 4. Characters

All characters: full body, standing, facing viewer, **transparent background**,
centered, generous margin, friendly expression. Append `[STYLE]`, use `[NEG]`.
Generate each as a reference sheet, then derive poses/expressions.

**Pizho** — the white martenitsa doll
```
Pizho, a small friendly martenitsa yarn doll come to life, made of soft white
wool with a round wool head and body, thin red string arms and legs, tiny tassel
feet, big warm eyes, gentle smile, [STYLE]
```

**Penda** — the red martenitsa doll
```
Penda, a small friendly martenitsa yarn doll come to life, made of soft red wool
with a round wool head and body, thin white string arms and legs, tiny tassel
feet, big warm eyes, cheerful smile, a tiny folk flower on her head, [STYLE]
```

**Baba Marta** — Grandma March, greeter & reward-giver
```
Baba Marta, a kind rosy-cheeked old Bulgarian grandmother, red embroidered
headscarf, cream folk blouse with shevitsa cross-stitch, red apron, holding a
bundle of red-and-white martenitsi, warm loving smile, [STYLE]
```

**Kuma Lisa** — clever fox, hint helper
```
Kuma Lisa, a clever friendly fox with orange fur and a soft white muzzle and
chest, bushy white-tipped tail, bright intelligent eyes, a sly gentle smile,
wearing a small embroidered folk waistcoat, [STYLE]
```

**Hitar Petar** — trickster, riddle rounds
```
Hitar Petar, a clever cheerful Bulgarian peasant man, tall brown fur kalpak hat,
big friendly mustache, twinkling eyes, embroidered folk waistcoat over a white
shirt, mid-wink as if sharing a joke, [STYLE]
```

**Samodiva** — forest fairy, nature units
```
a Samodiva, a gentle Bulgarian forest fairy maiden, long flowing hair, flowing
white folk gown with delicate embroidery, a crown of wildflowers, barefoot,
soft glow, kind serene smile, standing in tall meadow grass, [STYLE]
```

**Krali Marko** — folk hero, review "boss"
```
Krali Marko, a big gentle-giant Bulgarian folk hero, broad shoulders, large
friendly mustache, fur cap, red embroidered warrior tunic and wide belt, resting
a heavy mace over one shoulder, kind confident smile (heroic, not aggressive),
[STYLE]
```

**Zmey** — benevolent guardian dragon
```
a Zmey, a small friendly benevolent Bulgarian dragon, plump rounded body, soft
green scales, pale belly, little rounded wings, big kind eyes, a shy warm smile,
tiny harmless horns, curled protectively around a small pile of gold coins
(cute, absolutely not scary, no sharp teeth), [STYLE]
```

**Kuker** — masked mummer, pronunciation & festivals
```
a friendly Kuker, a Bulgarian festival mummer in a shaggy fur costume with a row
of round brass bells at the waist, a colorful decorated folk mask topped with
wool pom-poms and small feathers and gentle curled horns, festive and joyful,
cheerful painted mask face (celebratory, not frightening), [STYLE]
```

**Expression variants** (generate for every character, reusing its reference):
`neutral · happy/cheering · thinking/curious · pointing at something`. Baba Marta
also needs a "giving reward" pose; Kuma Lisa a "leaning-in whisper" pose.

---

## 5. Backgrounds & scenes

16:9 and 9:16 versions of each (web + mobile). Backgrounds are **softer and
lower-contrast** than foreground so tiles/text stay readable — no busy detail in
the center third where UI sits.

**Home / learning-path map**
```
a cozy storybook map of a Bulgarian village in a rose valley, winding dirt path
climbing past little folk cottages with red-tiled roofs, blooming rose bushes,
Balkan mountains and soft clouds in the distance, a stork nest on a chimney, warm
morning light, decorative shevitsa border, calm and inviting, [STYLE]
```

**Samodiva's meadow (nature units)**
```
a sunlit flowering mountain meadow with tall grass, wildflowers, slender birch
trees, a clear spring, gentle soft-focus background, magical peaceful atmosphere,
[STYLE]
```

**Zmey's treasure cave (unit reward)**
```
a warm cozy cave interior lit by golden light, a small tidy pile of gold coins
and a wooden chest, friendly and inviting (not dark or scary), soft glow, [STYLE]
```

**Festival square (Kuker / celebration)**
```
a Bulgarian village square during a spring festival, martenitsi and red-and-white
bunting strung between trees, folk decorations, blossoming branches, joyful sunny
atmosphere, [STYLE]
```

**Baba Marta's cottage (home base / rewards)**
```
a cozy interior of a traditional Bulgarian folk cottage, whitewashed walls, woven
kilim rug in red and ochre, martenitsi hanging by the window, warm hearth light,
[STYLE]
```

---

## 6. Vocabulary illustrations (the tile pictures)

These replace the emoji. **Critical for legibility:** each is a SINGLE object,
centered, simple, high-contrast, on a **transparent or soft cream background**,
readable at ~120 px. Same painted style, but cleaner and less busy than scenes.

Template:
```
a single <ITEM>, painted like a warm folk storybook illustration, centered,
simple clean shapes, soft shadow, transparent background, no scene, no text,
readable as a small icon, [STYLE]
```

Starter set (fruits + family, expand later):
`red apple` · `banana` · `bunch of grapes` · `pear` · then family portraits:
`a kind grandmother in folk headscarf (баба)`, `a grandfather with mustache (дядо)`,
`a warm mother (мама)`, `a father (тате)`, `a young brother (брат)`,
`a young sister (сестра)` — half-body folk-costume portraits, same template.

Keep the vocab set visually consistent: same framing, same margin, same light.

---

## 7. UI elements (painted, but must stay functional)

UI is painted to match the book, but affordances must remain obvious and
high-contrast. Export as PNG with transparency.

- **Audio button:** a round wooden folk button with a painted red horn/whistle
  motif, clear raised look so it reads as tappable.
- **Answer tile frame:** a soft painted card with a thin shevitsa border, cream
  fill; the vocab illustration sits inside.
- **Correct state:** the card's border blooms into a green folk-leaf motif (never
  a red X for wrong — wrong just gently dims and shakes).
- **Martenitsa reward:** a single beautifully painted red-and-white martenitsa
  (Pizho & Penda tassels) — the collectible currency icon.
- **Progress:** a string of martenitsa beads filling left to right (painted),
  not a clinical bar.
- **Star:** a warm hand-painted ochre star for lesson scores.
- **Screen frame:** an optional thin shevitsa cross-stitch border for lesson
  screens (tileable — generate a seamless strip).
- **Text panel:** a painted "scroll" or linen card that sits behind any text so
  it stays legible over scenery. Generate a stretchable 9-slice version.

Template:
```
<UI ITEM>, hand-painted folk storybook style, on transparent background, clean
and clearly tappable, high contrast, no text, [STYLE]
```

---

## 8. Celebration & alphabet art

**Celebration:** Pizho & Penda cheering with arms up, a shower of painted
martenitsi and folk-flower confetti, Baba Marta handing over a martenitsa, joyful.
Generate as a full scene (reuse character references for the cheering poses).

**Alphabet track:** painted letter cards — a big folk-decorated letter (Latin for
bg→en, Cyrillic for en→bg) framed with shevitsa, paired with its example object.
```
a large decorated letter "<X>", painted folk storybook style, framed with shevitsa
cross-stitch, warm and friendly, transparent background, no other text, [STYLE]
```

---

## 9. Technical specs & delivery

- **Format:** PNG-24 with alpha for characters, items, UI; PNG/JPG for full-bleed
  backgrounds.
- **Master res:** generate ≥2048 px long edge; keep masters, export downscaled.
- **Density exports:** @1x / @2x / @3x for mobile; provide web sizes to match.
- **Aspect:** characters/items square-ish with transparent margin; backgrounds in
  both 16:9 (web) and 9:16 (mobile) — regenerate per aspect, don't stretch.
- **Safe zone:** keep key subject inside the central 80%; kids' UI overlays edges.
- **Naming:** `char/pizho_neutral@2x.png`, `vocab/fruit_apple@2x.png`,
  `bg/meadow_9x16.jpg`, `ui/audio_button@2x.png`.
- **Consistency check:** lay every generated asset on one board at final on-device
  size before approving — reject anything that reads muddy, off-palette, or "off-book."

## 10. What to test with humans

- Do kids instantly recognize each vocab item at tile size? (biggest risk)
- Do the characters read as warm/friendly (especially Zmey and the Kuker mask —
  confirm they're not scary to a 5-year-old)?
- Is text legible over every background/panel combo?
- Does the set feel like one consistent book, or like mixed generations?

Bring findings back and we revise the prompts here, asset by asset.
