# Vashlovani analyzer — method and results

Two analyzers over the imagery collected in `NOTES.md`, plus a published GIS
site that renders the output. Everything below is measured, not estimated.

## 1. Land cover and water (Sentinel-2, 10–20 m)

`analyze_features.py`. Sentinel-2 L2A of **2025-08-30** (0.04% cloud), tiles
38TNL + 38TPL mosaicked, resampled to the 20 m SCL grid. Indices: NDVI, NDWI,
MNDWI, NDMI, BSI, brightness. Unsupervised k-means, k=7, deterministic init.

**Reflectance scaling settled empirically** — see `NOTES.md`. `DN x 1e-4`, no
additive offset; the advertised `-0.1` offset drives vegetation red reflectance
to −0.042.

Classes are labelled **by rank within the scene**, not by absolute NDVI cutoffs.
Cutoffs tuned on temperate imagery mislabel a semi-desert, where NDVI 0.32 is
respectable grass cover.

| class | km² | NDVI | BSI | brightness |
|---|---|---|---|---|
| dense_vegetation | 38.0 | +0.71 | −0.16 | 0.049 |
| woodland_scrub | 111.1 | +0.49 | +0.04 | 0.062 |
| steppe_grass | 233.6 | +0.32 | +0.15 | 0.088 |
| dry_steppe | 281.4 | +0.19 | +0.22 | 0.109 |
| sparse_bare | 220.3 | +0.17 | +0.17 | 0.138 |
| shadowed_or_dark_soil | 150.6 | +0.15 | +0.30 | 0.068 |
| badlands_bright_bare | 99.1 | +0.10 | +0.16 | 0.195 |

Water: MNDWI > 0.05 or SCL = water, and NDVI < 0.2 → **1.39 km², 136 polygons**,
15 bodies of 2 ha or more. The park is 89.8% "bare" by the scene-classification
band, which is what a semi-desert in late August looks like.

Caveat worth carrying: one late-August date. Annual grasses are senesced by
then, which suppresses NDVI and pushes real steppe toward the bare classes.
Water extent is equally date-specific — these channels are seasonal.

## 2. Track detection (Esri World Imagery, 1.8 m/px)

`roadnet.py`. This is the part that needed real work.

### Hand-tuned filters do not work here

`sweep_params.py` evaluated nine detector configurations against OSM tracks as
ground truth (positive = within 8 m of a mapped highway; negative = a ring
30–70 m away), on the window with the densest labels:

| detector | ROC AUC | TPR at FPR ≤ 5% |
|---|---|---|
| sato ridge filter, σ 1–3 | **0.661** | 0.173 |
| morphological, top-hat r6 + open 15 px | 0.611 | 0.143 |
| morphological, open 25 px | 0.602 | 0.138 |
| morphological, open 41 px | 0.588 | 0.120 |
| frangi, σ 1–3 | 0.423 | 0.159 |

AUC 0.66 is close to useless. The reason is physical: badlands are **full of
natural linear structure** — gully edges, erosion rills, stratigraphic banding —
that is spectrally and geometrically indistinguishable from a dirt track to any
single ridge filter.

### A learned combination does work

OSM supplies labels, so `roadnet.py train` fits a classifier over 13 features
(grayscale, high-pass, multi-scale sato, local std at two scales, gradient
magnitude, **structure-tensor coherence at two scales**, top-hat, black-hat,
directional opening).

Scored on a **spatially disjoint** half of the window — left half trains, right
half tests. A random pixel split would leak, because adjacent pixels are
near-duplicates, and would report a fantasy score.

| model | AUC | TPR at FPR ≤ 5% |
|---|---|---|
| logistic regression | **0.859** | 0.437 |
| random forest | 0.848 | **0.516** |

Deployed: **random forest at threshold 0.744**. Selected on TPR at the
false-positive budget, not AUC — that budget is the operating point actually
deployed, and logreg wins on AUC while being worse exactly where we threshold.

Top features by importance: `coherence9` (0.224), `gray` (0.188),
`coherence3` (0.119), `std15` (0.113). Structure-tensor coherence carrying the
model is the interesting result: a track is locally *oriented* texture, a gully
is rough. That is the discriminator, and no single ridge filter expresses it.

### Higher resolution made it worse

z18 (0.45 m/px) over the same ground scored **AUC 0.703** against z16's 0.859.

Not because finer imagery holds less information — because the features are
defined in **pixel** units. `coherence9` spans 16 m of ground at 1.8 m/px and
only 4 m at 0.45 m/px, so at z18 it measures gravel texture instead of track
structure. A fair resolution comparison would scale every kernel by 4×; that
experiment was not run. As it stands, z16 is the sweet spot for these kernels.

### Full-park result

| | |
|---|---|
| detected | **562 segments, 57.7 km** |
| confirmed by OSM (≥50% overlap) | 279 (49.6%) |
| partial (15–50%) | 18 (3.2%) |
| not in OSM | 265 (47.2%) |
| OSM reference in park | 193 lines, 246.7 km |
| OSM lines recovered at ≥50% length | 31 (16.1%) |

Mean detected fraction by OSM class: `residential` 0.917 (n=2, village streets),
`track` 0.220 (n=134), `unclassified` 0.183 (n=35), `path` 0.024 (n=18),
`footway` 0.011 (n=4). Footpaths are essentially invisible at 1.8 m/px, as
expected.

**How to read "not in OSM".** The negative training class is a ring 30–70 m from
mapped roads *inside a park that genuinely contains unmapped tracks*, so some
"negatives" are real roads and every metric here is a **lower bound**. An orange
line on the map means "no OSM road within 30 m" — which mixes genuinely unmapped
tracks with gully edges the detector mistook for tracks. Each needs visual
confirmation; the published site has a per-segment verdict control for exactly
that.

An earlier validation run reported 0% recall. That was a bug, not a result:
it compared park-masked detections against all 1,493 OSM lines in the bbox,
87% of which lie in farmland outside the park. The reference set is now
clipped to the park.

## 3. Cross-referencing

OSM was the only reference used for the numbers above, and OSM is demonstrably
incomplete here. Two workflows ran against internet sources:

- **Site research** — eight independent angles (official protected-area
  sources, named landmarks, geology/mud volcanoes, ecology, tourism routes,
  gazetteers/Wikidata, history/archaeology, hydrology), each returning
  structured site records, then adversarial verification in batches.
- **Findings cross-reference** — five angles against the analysis outputs
  themselves: do the unmapped candidates match any known route; is there an
  independent road dataset to validate against; do the detected water bodies
  match known hydrology; are the land-cover areas plausible against published
  figures; and confirmation of the site names and descriptions.

Results merge into the site database rather than the page source, so the
published map picks them up without a republish.

## 4. The GIS site

Published as a private Claude artifact. Satellite basemap, roads, clickable
pins, backed by the artifact database.

Two constraints shaped it:

- **The artifact CSP blocks runtime image loads from external hosts**, so the
  page cannot fetch Esri tiles live. The imagery ships *inside* the artifact.
- **A publish allows at most 255 files**, and z16 alone needs 352 tiles of
  256 px for this park.

Solution: **1024 px supertiles**. With Leaflet's `tileSize: 1024,
zoomOffset: -2`, a tile requested at zoom Z covers the ground of 4×4 native
256 px tiles at Z+2. Shipping Z 8–13 gives native detail to 3.6 m/px in 146
files, 19.6 MB. Written as **WebP with alpha** — no-data areas outside the
mosaic are transparent, so the page shows its own map ground instead of the
black rectangle JPEG produced.

Layers: site pins, mapped OSM roads, detected tracks (coloured by OSM-match
status), detected water, dense vegetation, the 7-class land-cover overlay,
park boundary. Clicking a pin opens its record — Georgian and English names,
coordinates, evidence chips showing whether OSM / research / imagery back it,
sources, and a field-notes box. Clicking a detected segment offers a
real-track / not-a-track verdict. Notes and verdicts persist to the database.

English names are flagged `name_en_src`: `osm` where OSM supplied one,
`transliteration` where it is ours and therefore unverified. The map never
passes a transliteration off as an official name.

## Files

| script | what |
|---|---|
| `fetch_vashlovani.py` | imagery/DEM/boundary downloader (see NOTES.md) |
| `fetch_osm.py` | OSM roads/features via the main API, adaptive bbox split |
| `fetch_tiles.py`, `fetch_window.py` | threaded Esri tile mosaics |
| `analyze_features.py` | land cover, water, vegetation, overlay PNG |
| `sweep_params.py` | the nine-filter calibration experiment |
| `roadnet.py` | `train` / `apply` the supervised track detector |
| `analyze_roads.py` | the earlier morphological-only detector, kept for the record |
| `make_tiles.py` | WebP supertile pyramid for the page |
| `prepare_web.py`, `emit_data.py`, `build_page.py` | web payloads and page assembly |
| `make_dbdocs.py` | site records as database documents |
| `page.template.html` | the GIS page (Leaflet CSS inlined at build) |
| `crossref.workflow.js` | the cross-reference workflow |
| `check.mjs` | headless verification of the built page |
