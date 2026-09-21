# Satellite imagery for Vashlovani National Park, Georgia — research notes

Target: **Vashlovani National Park** (ვაშლოვანის ეროვნული პარკი), Dedoplistsqaro
municipality, Kakheti, eastern Georgia — semi-desert badlands on the Azerbaijan
border. 442.51 km², established 1935.

Everything below was tested end to end from this container. No account or API
key was needed for any of it.

## Park extent — get this right first

Published centroid figures (41°12′N 46°23′E) are misleading for defining a
download window. The authoritative extent comes from the OSM relation:

```
bbox  W 46.27756  S 41.09400  E 46.73632  N 41.35038   (EPSG:4326)
```

That's **0.46° × 0.26°**, ~38 km × 28 km. The boundary is a 7-part MultiPolygon
(4659 vertices) — the park is not a single blob, which matters if you intend to
mask or compute per-park statistics. Saved as `vashlovani_boundary.geojson`
(OpenStreetMap, ODbL).

A first attempt with a guessed bbox (46.15–46.65 E) silently cut off the eastern
third of the park. Fetch the boundary before the imagery.

## Route 1 — Sentinel-2 L2A (the analysis route) ✅ recommended

Free, no login, 10 m, multispectral, atmospherically corrected, ~5-day revisit,
full archive back to 2015.

- **Catalog:** Earth Search STAC API, `https://earth-search.aws.element84.com/v1`,
  collection `sentinel-2-l2a`. Open POST /search, no key.
- **Pixels:** AWS public COG mirror `s3://sentinel-cogs` (open HTTPS, not
  requester-pays). Cloud-Optimized GeoTIFF + HTTP range requests, so a windowed
  read transfers only the park's pixels instead of the 258 MB full band.
  Verified: `Accept-Ranges: bytes`, range GET returns 206.

**Key gotcha: the park straddles two MGRS tiles, 38TNL and 38TPL.** A single
scene will not cover it. The tiles are both UTM zone 38N (EPSG:32638), so they
mosaic without reprojection, but you need the *same acquisition date* on both or
you get a visible seam with different illumination. The `search` subcommand
filters for dates where both tiles are clear.

Cloud-free dates (<3% on both tiles), May–Oct 2025: **17 available**. Clearest
is **2025-08-30** (0.04% max). Also good: 2025-05-09, 2025-06-01, 2025-07-14,
2025-10-06.

Cost of a full-park grab: ~6 s and ~15–24 MB per band, ~18 s for three bands.

### Reflectance scaling — RESOLVED

The STAC metadata advertises `scale: 0.0001, offset: -0.1` (baseline 05.11).
**Do not apply the offset.** Measured against the scene-classification band on
2025-08-30:

| class | median red DN | red reflectance, no offset | with offset |
|---|---|---|---|
| vegetation (SCL 4) | 576 | 0.058 | **-0.042** |
| water (SCL 6), NIR | 715 | 0.072 | **-0.029** |
| bare (SCL 5) | 1370 | 0.137 | 0.037 |

Negative reflectance is physically impossible, and applying the offset also
put 27% of NDVI pixels outside [-1, 1]. The Element84 COGs are already
rescaled. Correct scaling is **`DN x 1e-4`, no additive offset**, which gives
median NDVI 0.20 over the park in late August -- consistent with dry
semi-desert.

## Route 2 — Esri World Imagery (the visual route) ✅ works

High-resolution aerial/satellite basemap as XYZ tiles, no key:
`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`

**Native detail over this park tops out at z18 (~0.45 m/px).** Probed z12–z19:
tiles return HTTP 200 at every level, but z19 comes back near-uniform
(detail std 5.4 vs 48–59 at z16–z18) — i.e. an empty/placeholder tile, not
imagery. Don't assume 200 means data.

Full-park mosaic cost:

| zoom | m/px | tiles | est. time @15 req/s |
|---|---|---|---|
| z14 | 7.19 | 374 | <1 min |
| z16 | 1.80 | 5,355 | ~6 min |
| z17 | 0.90 | 21,000 | ~23 min |
| z18 | 0.45 | 83,415 | ~93 min, ~16 GB of pixels |

z16 is the sensible default; z18 only for small AOIs. Tiles are Web Mercator
(EPSG:3857) — reproject to UTM 38N before measuring anything.

Caveats: not radiometrically calibrated, mosaicked from mixed acquisition dates
with no per-pixel date, unusable for time series or index maths. **Check Esri's
terms of use before redistributing.** Fine for visual interpretation and as a
detail reference alongside Sentinel-2.

## Route 3 — DEM (terrain context) ✅ works, with a catch

**Copernicus DEM GLO-30 does not cover this park.** The N41/E046 cell is absent
from `s3://copernicus-dem-30m` (404 on the tile, zero keys under the prefix) —
consistent with the known GLO-30 licensing gaps along the Armenia/Azerbaijan
border, and Vashlovani sits right on that border.

Working alternatives:
- **Copernicus DEM GLO-90** — `s3://copernicus-dem-90m`, cell
  `Copernicus_DSM_COG_30_N41_00_E046_00_DEM`. Verified, 5.1 MB.
  Clipped to the park: elevation **78–858 m**.
- **AWS terrain tiles** (`s3://elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`) —
  verified 200, useful for quick hillshade.
- NASADEM / SRTM 30 m via NASA Earthdata, or OpenTopography's `COP30` API — both
  need a free account (OpenTopography returned **401** without a key).

## Routes checked and rejected / blocked

- **Copernicus Data Space Ecosystem** (`catalogue.dataspace.copernicus.eu/stac`) —
  catalog browses fine without login (200), but product download needs a free
  CDSE account. It's the authoritative source and worth registering for if you
  need L1C, Sentinel-1 SAR, or the openEO/Sentinel Hub processing APIs. For
  plain L2A optical, the AWS mirror is the same data with less friction.
- **Overpass API** — blocked from this container. Both `overpass-api.de`
  (connection reset) and `overpass.kumi.systems` (timeout) failed. Nominatim
  worked, which is why the boundary came from there. If you need richer OSM
  data (tracks, waterways, the park's internal zoning), expect to work around
  this.
- **Commercial sub-metre** (Maxar, Planet, Airbus) — paid. Planet's NICFI
  programme offers free ~4.7 m basemaps for research but Georgia is outside the
  tropical coverage area. Not pursued.

## Reproducing

`fetch_vashlovani.py` (needs `pip install rasterio pillow requests`):

```bash
python3 fetch_vashlovani.py boundary                 # park polygon + exact bbox
python3 fetch_vashlovani.py search                   # dates clear on BOTH tiles
python3 fetch_vashlovani.py bands --date 2025-08-30 --bands visual,red,nir
python3 fetch_vashlovani.py basemap --zoom 16        # Esri mosaic, ~6 min
python3 fetch_vashlovani.py dem                      # GLO-90
```

Useful `--bands` asset keys: `visual` (8-bit RGB), `blue green red` (10 m),
`nir` (B08, 10 m), `rededge1..3 nir08 swir16 swir22` (20 m), `scl` (scene
classification — use it to mask cloud/shadow before any index).

## Artifacts produced (ephemeral — container gets reclaimed)

| file | what |
|---|---|
| `vashlovani_boundary.geojson` | park polygon, 7 parts |
| `vashlovani_S2_visual_20250830_10m.tif` | true-colour, 2913×3895, 100% coverage |
| `vashlovani_S2_red_20250830_10m.tif` | B04 reflectance |
| `vashlovani_S2_nir_20250830_10m.tif` | B08 reflectance |
| `vashlovani_S2_ndvi_20250830_10m.tif` | NDVI — **scaling suspect, see above** |
| `vashlovani_esri_z13.tif` | Esri mosaic, stitcher validation |
| `vashlovani_copernicus_dem_90m.tif` | GLO-90, 78–858 m |
| `preview_s2_park.png`, `preview_esri_z13.png` | visual checks |

Only the script, notes, boundary and previews are committed; the GeoTIFFs are
too large for git and are cheap to regenerate.

## Recommendation for the analysis phase

Start from Sentinel-2 L2A on **2025-08-30**, bands `red,green,blue,nir,swir16`
plus `scl` for masking. Settle the offset question first. Pull a second date from
a different season (2025-05-09 is clear) if you want phenology or change
detection — the archive back to 2015 makes multi-year comparison cheap. Use the
Esri z16/z17 mosaic only as a visual detail reference, and GLO-90 for terrain.
