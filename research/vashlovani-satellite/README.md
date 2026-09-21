# Vashlovani satellite analysis

Unrelated to the Zdravey! app. Parked here because the session container is
ephemeral and the work was worth keeping.

- `NOTES.md` — how to download the imagery: what works, what doesn't, gotchas.
- `ANALYSIS.md` — the analyzers, measured performance, and the GIS site.
- `scripts/` — the whole pipeline, runnable end to end.
- `data/` — vector output: park boundary, OSM roads, detected tracks, water,
  vegetation, site records (small, web-simplified).
- `metrics/` — detector calibration and validation numbers.

Not committed: the GeoTIFF rasters (hundreds of MB, cheap to regenerate) and
the 146 WebP basemap tiles (derived from Esri World Imagery — check Esri's
terms before redistributing).

Rebuild:
```
pip install rasterio pillow requests scikit-image opencv-python-headless scipy shapely scikit-learn
python3 scripts/fetch_vashlovani.py boundary
python3 scripts/fetch_vashlovani.py bands --date 2025-08-30 --bands visual,blue,green,red,nir,swir16,scl
python3 scripts/fetch_osm.py
python3 scripts/fetch_tiles.py 16
python3 scripts/analyze_features.py
python3 scripts/roadnet.py train vashlovani_esri_z16.tif
python3 scripts/roadnet.py apply vashlovani_esri_z16.tif
python3 scripts/make_tiles.py && python3 scripts/prepare_web.py
python3 scripts/emit_data.py && python3 scripts/build_page.py
```
