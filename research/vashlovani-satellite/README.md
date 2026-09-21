# Vashlovani satellite imagery — research

Unrelated to the Zdravey! app. Parked here because the session container is
ephemeral and the findings were worth keeping.

- `NOTES.md` — what works, what doesn't, costs, gotchas, open questions.
- `fetch_vashlovani.py` — reusable downloader (Sentinel-2 / Esri / DEM).
- `vashlovani_boundary.geojson` — park boundary (OpenStreetMap, ODbL).
- `preview_*.png` — visual sanity checks.

GeoTIFFs are not committed (too large, cheap to regenerate):
`pip install rasterio pillow requests && python3 fetch_vashlovani.py bands --date 2025-08-30`
