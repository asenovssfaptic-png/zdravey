# Asset Pipeline — Zdravey!

How raster art from `art-direction.md` becomes shipped assets across **web +
iOS + Android** from one Expo codebase. Distilled from the raster-graphics
Executive Summary and adapted to our stack. Companion to `art-direction.md`
(what to draw) — this doc is **how to export, name, and ship it**.

## 1. Density model (the one thing to get right)

We ship one codebase; Expo/React Native handles density with filename suffixes,
so we **do not** hand-maintain Android `res/drawable-*` buckets or iOS
`.xcassets`. Provide three scales per raster asset:

| Suffix | Scale | Serves |
|--------|-------|--------|
| `name.png`    | @1x (1.0×) | baseline / low-density |
| `name@2x.png` | @2x (2.0×) | most modern phones, iPad, web hi-dpi |
| `name@3x.png` | @3x (3.0×) | high-density phones (Pro/Max class) |

`require('./name.png')` auto-picks the right scale on native **and** web (Metro).
For reference, this maps onto native buckets as: @1x≈mdpi, @1.5≈hdpi, @2x≈xhdpi,
@3x≈xxhdpi, @4x≈xxxhdpi — but you only author @1x/@2x/@3x and let the framework
resolve. Generate the master at **≥2048 px** on the long edge, then downscale to
the three sizes (painterly detail survives downscaling, never upscale).

## 2. Formats (per use-case)

| Asset | Format | Why |
|-------|--------|-----|
| Characters, UI, icons, **vocab items** | **PNG-24 + alpha** | need transparency, crisp edges |
| Full-bleed backgrounds / scenes | **WebP** (JPEG fallback) | no alpha needed; WebP ≈30% smaller than JPEG, ≈26% smaller than PNG; supported on modern iOS/Android/browsers |
| Photos (family, if any) | WebP or JPEG q80–90 | lossy is fine, no alpha |

- Skip **HEIF/HEIC** — great compression but too little cross-platform support
  for bundled app content.
- Keep a lossless PNG **master** of every asset; export the delivery format from it.

## 3. Export sizes by asset type

Sizes are @1x (points). Multiply ×2 and ×3 for the other scales.

| Asset | @1x | @3x | Notes |
|-------|-----|-----|-------|
| Character, full body | 160×200 | 480×600 | transparent margin; one file per pose/expression |
| Character bust (bubbles/hints) | 96×120 | 288×360 | crop from full body |
| Vocab item (tile picture) | 96×96 | 288×288 | single object, centered, simple, high-contrast |
| Nav / category icon | 32×32 | 96×96 | book / puzzle / music / star |
| Reward star, martenitsa | 64×64 | 192×192 | painted, transparent |
| Button background | 240×64 | 720×192 | painted plate; **text is live**, not baked in |
| Screen frame / border | 512 tile | — | seamless/tileable shevitsa strip |
| Text panel (scroll/card) | 9-slice | — | stretchable; keep corners in the slice guides |
| Background (portrait) | — | ≥1290×2796 | single high-res master, `resizeMode: cover` |
| Background (landscape) | — | ≥2796×1290 | regenerate per orientation, don't stretch |
| App icon | — | 1024×1024 | Expo `icon`; pick one character option from the board |
| Android adaptive icon | — | 1024×1024 | foreground + solid/painted background layer |
| Splash | — | ≥1242×2688 | Expo `splash`; centered logo on safe background |

**Buttons/frames:** bake only the painted plate/border as the image; render the
label as real text on top (keeps text crisp, translatable, and re-themeable —
essential since the app is bilingual).

## 4. Naming

Lowercase, no spaces, grouped by type, `@2x`/`@3x` suffix. Matches the folders
in `CLAUDE.md`:

```
char/pizho_neutral@2x.png      char/baba_marta_reward@3x.png
vocab/fruit_apple@2x.png       vocab/family_baba@2x.png
ui/btn_start@2x.png            ui/martenitsa@2x.png   ui/star@2x.png
ui/frame_shevitsa@2x.png       ui/panel_scroll_9slice@2x.png
bg/meadow_9x16.webp            bg/village_16x9.webp
icon/nav_lessons@2x.png        app/icon.png (1024)     app/splash.png
```

Character files: `char/{id}_{expression}@Nx.png` where expression ∈
`neutral | happy | thinking | pointing | reward | whisper`.

## 5. Loading in Expo/RN

- Bundled: `<Image source={require('../assets/img/vocab/fruit_apple.png')} />`
  — RN/Metro resolves `@2x`/`@3x` automatically (native + web).
- Backgrounds: `<ImageBackground ... resizeMode="cover" />` with the single
  high-res master per orientation.
- Preload critical art at startup with `expo-asset` `Asset.loadAsync([...])` so
  the first screen doesn't pop in.
- Lazy-load non-critical art (later units, game screens) so first load stays small.

## 6. Optimization

Compress every delivery asset (target: no visible quality loss):

```bash
# PNG (characters / UI / vocab / icons)
pngquant --quality=65-85 --strip --skip-if-larger --force -o out.png in.png

# WebP (backgrounds)
cwebp -q 80 in.png -o out.webp

# JPEG fallback
jpegoptim --max=85 --strip-all bg.jpg
```

- Automate in a build/prebuild script over `/assets/img`.
- Every extra scale/asset grows app size — ship only @1x/@2x/@3x, nothing more.
- Prefer one shared background per unit over many near-duplicates.

## 7. Accessibility (hard requirements)

- **Contrast:** text and essential icons meet **WCAG AA ≥4.5:1** (≥3:1 for large
  text). This is why text sits on cream panels, not raw scenery — verify each
  text-over-art combo with a contrast checker.
- **Labels:** every meaningful `<Image>`/control gets an `accessibilityLabel`
  (the RN equivalent of alt text / contentDescription) so screen readers work.
- **Scaling:** respect OS font scaling / Dynamic Type; layouts must not clip.
- **Never rely on color alone** — correct/incorrect also uses shape/motion/audio.
- Audio-first still governs: every prompt has sound regardless of the visuals.

## 8. Handoff checklist (per asset batch)

- [ ] Master ≥2048 px kept; delivery exported at @1x/@2x/@3x.
- [ ] Correct format (PNG+alpha for art/UI/vocab; WebP+JPEG for backgrounds).
- [ ] Transparent backgrounds clean (no fringe/halo) on characters, items, UI.
- [ ] Named per §4 and dropped in the right `/assets/img/*` folder.
- [ ] Compressed (pngquant/cwebp/jpegoptim); no oversized files.
- [ ] On-device check: readable and un-muddy at real tile/character size.
- [ ] Contrast checked for any text-over-art; `accessibilityLabel` set.
- [ ] Consistent with the master style board (palette, light, "one book" feel).

## 9. Definition of done for a screen

All art present at 3 scales, backgrounds in both orientations, buttons/frames as
plates with live text, contrast verified, critical assets preloaded, and the
screen matches its comp on the style board on a real phone (portrait) and a
browser window (landscape).
