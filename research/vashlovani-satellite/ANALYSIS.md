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

**Extent bug, found by cross-referencing and fixed.** The first version
computed class areas over the whole Sentinel-2 window — a
1133.93 km² rectangle of which only 21.8% is inside the
park. Every class area was inflated 3–5×, and the largest "land-cover class of
the park" was actually the Shiraki Plain cereal belt to the north, which is
farmland outside it. The analyzer now rasterises the boundary polygon and
clusters only in-park pixels. Park area on the analysis grid:
**246.68 km²** (official: 24,598 ha = 245.98 km²).

Classes are labelled **by rank within the scene**, not by absolute NDVI cutoffs.
Cutoffs tuned on temperate imagery mislabel a semi-desert, where NDVI 0.32 is
respectable grass cover.

| class | km² | NDVI | BSI | brightness |
|---|---|---|---|---|
| dense_vegetation | 9.04 | +0.72 | -0.14 | 0.040 |
| woodland_scrub | 33.01 | +0.50 | +0.04 | 0.057 |
| steppe_grass | 65.18 | +0.34 | +0.14 | 0.080 |
| dry_steppe | 44.74 | +0.22 | +0.15 | 0.115 |
| sparse_bare | 62.82 | +0.21 | +0.21 | 0.106 |
| badlands_bright_bare | 30.69 | +0.11 | +0.16 | 0.170 |
| water | 1.2 | +0.08 | -0.01 | 0.071 |

Water: MNDWI > 0.05 or SCL = water, and NDVI < 0.2 →
**1.3864 km² across the window, 0.5232 km²
inside the park**, 136 polygons. Displayed beyond the boundary on purpose: the
Alazani *is* the park's eastern edge, and clipping it away would hide the
single most important hydrological feature. Cross-referencing established that
90.5% of detected water area lies within 60 m of the Alazani and that 11 of the
15 bodies ≥2 ha are in Azerbaijan — this is one river, not a set of park pools.
The Iori has no length inside the polygon, so its absence is correct.

**Season is not a footnote here.** Comparing the cloud-free 2025-05-09 scene
with this one over the park: median NDVI falls 0.574 → 0.260, and the area above
NDVI 0.30 falls from 210 km² (85%) to 96 km² (39%). Annual grasses are senesced
by late August, so real steppe is pushed into the bare classes. A May scene
would give a materially different split.

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

OSM was the only reference behind the numbers above, and OSM is demonstrably
incomplete here. Two workflows ran against internet sources.

**Site research** — eight independent angles (official protected-area sources,
named landmarks, geology, ecology, tourism routes, gazetteers/Wikidata,
history, hydrology). 564 raw records → 483 unique → 40 confirmed, 35 with
usable coordinates.

**Findings cross-reference** — five angles aimed at the analysis output itself:
139 claims, 22 held under adversarial check, 8 refuted, 36 contradicting the
analysis.

**Both runs were cut short by an account spend limit** — 89 of 105 research
agents and 16 of 26 cross-reference agents failed partway through the
verification stage. So most claims carry the researcher's own confidence
rather than an independent second check, and each pin on the map shows its
own status.

### What it changed

- **Land-cover extent bug** (section 1). The single most valuable catch:
  every class area was the area of a rectangle, not of the park.
- **Water identity.** 11 of 15 detected bodies ≥2 ha reverse-geocode to Qakh
  District, Azerbaijan — irrigation and fish ponds beyond the Alazani, not
  semi-desert pools. 90.5% of all detected water area is within 60 m of the
  Alazani centreline.
- **28 site names corrected.** Two OSM nodes tagged "visitor center" are not
  one — the real centre is in Dedoplistsqaro, ~40 km outside the frame. They
  are the Central Bungalows ("Visitors Village") and the Mijniskure bungalow
  complex, both ranger stations. OSM `name:en` typos *Pantishira*,
  *Pantissara* and *Vashlivani* were corrected rather than propagated.
- **27 new sites added** with sourced coordinates: ranger protection stations,
  the goitered-gazelle enclosure, the Alazani Floodplain Natural Monument, the
  official numbered routes.

### Independent references found

The useful answer to "is there a second reference besides OSM":

| source | verdict |
|---|---|
| **NAPR `RoadL`, Dedoplistskaro** (Georgian National Agency of Public Registry) | **Usable.** Digitised from national orthophoto, no OSM lineage. 107.3 km inside the park, 16.4 km of it absent from OSM. Shapefile/WMS/WFS, CC BY-NC 4.0. Needs a browser User-Agent and an `nsdi.gov.ge` Referer or it returns an "Access Denied" stub. |
| **OSM public GPS traces** | **Usable.** 54,927 field trackpoints inside the park — independent of OSM *map geometry*. Gave the only hard positive GPS confirmations: four detected segments. |
| **NAPR orthophoto WMS** | **Usable.** ~0.3 m GSD, two epochs 22 years apart — enough to separate active from abandoned track. |
| Microsoft RoadDetections | **Marginal.** Covers the area (374 lines / 150 km in the bbox) and is 81% precise against OSM, but recovers only ~3–12% of in-park OSM tracks and **0%** of the named 4×4 routes. A hit is strong evidence; a miss says nothing. |
| Official 1:55,000 trekking map | **Not positional.** Georeferenced from its printed UTM grid; singly-drawn routes land within ~10 m of OSM roads, but bundled routes are drawn as parallel offset lines and sit 75–137 m off. Cannot confirm a route better than ±150 m. |

None of these were folded into the detector's validation numbers — they are
the obvious next step, and NAPR in particular would give a second reference
that does not share OSM's gaps.

Results merged into the site database rather than the page source, so the
published map picked them up without a republish.

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
