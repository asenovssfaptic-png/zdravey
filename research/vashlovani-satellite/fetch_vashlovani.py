#!/usr/bin/env python3
"""
Download satellite imagery for Vashlovani National Park, Kakheti, Georgia.

Free, no account required. Two independent routes:

  bands   Sentinel-2 L2A analysis-ready reflectance (10-20 m) from the AWS
          public COG mirror, searched via the Earth Search STAC API. Windowed
          COG reads, so only the park's pixels are transferred -- not the
          ~1 GB full scenes. This is the route for analysis (NDVI, indices,
          change detection, classification).

  basemap Esri World Imagery XYZ tiles (~0.5 m/px) stitched into a GeoTIFF.
          Pretty-picture / visual-interpretation route. Not radiometrically
          calibrated, mixed acquisition dates. Check Esri's terms of use
          before any redistribution.

Also fetches the park boundary (OpenStreetMap via Nominatim, ODbL) and
optionally a DEM.

Usage:
    python3 fetch_vashlovani.py boundary
    python3 fetch_vashlovani.py search --start 2025-05-01 --end 2025-10-15
    python3 fetch_vashlovani.py bands --date 2025-05-09
    python3 fetch_vashlovani.py bands --date 2025-05-09 --bands red,green,blue,nir
    python3 fetch_vashlovani.py basemap --zoom 16
    python3 fetch_vashlovani.py dem

Requires: rasterio, pillow, requests  (pip install rasterio pillow requests)
"""
from __future__ import annotations

import argparse
import collections
import io
import json
import math
import os
import pathlib
import sys

# Keep GDAL from listing remote directories and let it cache COG blocks.
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif")
os.environ.setdefault("GDAL_HTTP_MULTIPLEX", "YES")
os.environ.setdefault("VSI_CACHE", "TRUE")
os.environ.setdefault("VSI_CACHE_SIZE", "100000000")

import requests  # noqa: E402
import rasterio  # noqa: E402
from rasterio.enums import Resampling  # noqa: E402
from rasterio.merge import merge  # noqa: E402
from rasterio.warp import transform_bounds  # noqa: E402

OUT = pathlib.Path(__file__).parent

# Authoritative park extent, from the OSM relation (see `boundary`).
# W, S, E, N in EPSG:4326.
BBOX = (46.27756, 41.09400, 46.73632, 41.35038)

STAC = "https://earth-search.aws.element84.com/v1/search"
COLLECTION = "sentinel-2-l2a"
ESRI = ("https://services.arcgisonline.com/ArcGIS/rest/services"
        "/World_Imagery/MapServer/tile/{z}/{y}/{x}")
# GLO-30 has no tile for N41/E046 (licensing gap along the Azerbaijan
# border), so the 90 m product is the Copernicus DEM that actually covers
# this park.
DEM90 = ("https://copernicus-dem-90m.s3.eu-central-1.amazonaws.com"
         "/Copernicus_DSM_COG_30_{ns}_00_{ew}_00_DEM"
         "/Copernicus_DSM_COG_30_{ns}_00_{ew}_00_DEM.tif")


def _write(path: pathlib.Path, arr, profile) -> None:
    profile = dict(profile)
    profile.update(compress="deflate", predictor=2, tiled=True,
                   blockxsize=512, blockysize=512, BIGTIFF="IF_SAFER")
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(arr)
    print(f"wrote {path.name}  {arr.shape}  {path.stat().st_size / 1e6:.1f} MB")


def cmd_boundary(args) -> None:
    """Park boundary polygon from OpenStreetMap (ODbL)."""
    r = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": "Vashlovani National Park", "format": "json",
                "polygon_geojson": 1, "limit": 1},
        headers={"User-Agent": "vashlovani-research/1.0"},
        timeout=60,
    )
    r.raise_for_status()
    hit = r.json()[0]
    fc = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"name": hit["display_name"],
                           "osm_type": hit.get("osm_type"),
                           "osm_id": hit.get("osm_id"),
                           "source": "OpenStreetMap via Nominatim",
                           "license": "ODbL"},
            "geometry": hit["geojson"],
        }],
    }
    path = OUT / "vashlovani_boundary.geojson"
    path.write_text(json.dumps(fc))
    s, n, w, e = (float(v) for v in hit["boundingbox"])
    print(f"wrote {path.name}")
    print(f"bbox W,S,E,N = {w}, {s}, {e}, {n}")


def _search(start: str, end: str, max_cloud: float) -> list[dict]:
    r = requests.post(STAC, timeout=90, json={
        "collections": [COLLECTION],
        "bbox": list(BBOX),
        "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
        "query": {"eo:cloud_cover": {"lt": max_cloud}},
        "limit": 100,
    })
    r.raise_for_status()
    return r.json()["features"]


def cmd_search(args) -> None:
    """List dates where BOTH MGRS tiles covering the park are clear.

    The park straddles 38TNL and 38TPL, so a seamless full-park image needs
    the same date on both.
    """
    feats = _search(args.start, args.end, args.max_cloud)
    by_date: dict[str, dict] = collections.defaultdict(dict)
    for f in feats:
        p = f["properties"]
        by_date[p["datetime"][:10]][p["grid:code"]] = (f["id"], p["eo:cloud_cover"])

    complete = {d: v for d, v in by_date.items() if len(v) == 2}
    print(f"{len(feats)} scenes; {len(complete)} dates cover the whole park "
          f"at <{args.max_cloud}% cloud\n")
    for d in sorted(complete):
        worst = max(c for _, c in complete[d].values())
        tiles = " ".join(sorted(complete[d]))
        print(f"  {d}  max_cloud={worst:5.2f}%  {tiles}")
    if complete:
        best = min(complete, key=lambda d: max(c for _, c in complete[d].values()))
        print(f"\nclearest: {best}  ->  --date {best}")


def cmd_bands(args) -> None:
    """Clip Sentinel-2 bands to the park and mosaic the two tiles."""
    wanted = [b.strip() for b in args.bands.split(",") if b.strip()]
    feats = _search(args.date, args.date, 100.0)
    if not feats:
        sys.exit(f"no scenes on {args.date}; try `search` first")

    # One scene per MGRS tile, lowest cloud wins.
    per_tile: dict[str, dict] = {}
    for f in feats:
        code = f["properties"]["grid:code"]
        cur = per_tile.get(code)
        if cur is None or f["properties"]["eo:cloud_cover"] < cur["properties"]["eo:cloud_cover"]:
            per_tile[code] = f
    print(f"{args.date}: tiles {sorted(per_tile)}")

    for band in wanted:
        hrefs = []
        for f in per_tile.values():
            asset = f["assets"].get(band)
            if asset is None:
                sys.exit(f"band {band!r} not in assets: "
                         f"{sorted(f['assets'])[:25]}")
            hrefs.append(asset["href"])

        srcs = [rasterio.open(h) for h in hrefs]
        try:
            left, bottom, right, top = transform_bounds(
                "EPSG:4326", srcs[0].crs, *BBOX)
            res = srcs[0].res[0]
            arr, transform = merge(srcs, bounds=(left, bottom, right, top),
                                   res=res, resampling=Resampling.nearest)
            profile = srcs[0].profile.copy()
            profile.update(height=arr.shape[1], width=arr.shape[2],
                           count=arr.shape[0], transform=transform)
            tag = args.date.replace("-", "")
            _write(OUT / f"vashlovani_S2_{band}_{tag}_{int(res)}m.tif",
                   arr, profile)
            print(f"  {band}: {res:g} m/px, data coverage "
                  f"{arr.any(axis=0).mean():.4f}")
        finally:
            for s in srcs:
                s.close()


def _deg2tile(lat: float, lon: float, z: int) -> tuple[int, int]:
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    lat_r = math.radians(lat)
    y = (1.0 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2.0 * n
    return int(x), int(y)


def cmd_basemap(args) -> None:
    """Stitch Esri World Imagery tiles over the park into a GeoTIFF.

    Native detail over this park tops out around z18 (~0.45 m/px); z19 is
    empty here. z16 (~1.8 m/px) is a good size/detail compromise.
    """
    from PIL import Image
    import numpy as np

    z = args.zoom
    w, s, e, n = BBOX
    x0, y0 = _deg2tile(n, w, z)   # north-west tile
    x1, y1 = _deg2tile(s, e, z)   # south-east tile
    cols, rows = x1 - x0 + 1, y1 - y0 + 1
    total = cols * rows
    print(f"z{z}: {cols}x{rows} = {total} tiles "
          f"({156543.03392 * math.cos(math.radians(41.2)) / 2 ** z:.2f} m/px)")
    if total > args.max_tiles:
        sys.exit(f"{total} tiles exceeds --max-tiles {args.max_tiles}; "
                 f"lower --zoom or raise the cap")

    canvas = Image.new("RGB", (cols * 256, rows * 256))
    session = requests.Session()
    missing = 0
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            r = session.get(ESRI.format(z=z, x=tx, y=ty), timeout=30)
            if r.status_code != 200:
                missing += 1
                continue
            canvas.paste(Image.open(io.BytesIO(r.content)).convert("RGB"),
                         ((tx - x0) * 256, (ty - y0) * 256))
        print(f"  row {ty - y0 + 1}/{rows}", end="\r", flush=True)
    print()
    if missing:
        print(f"  warning: {missing} tiles missing")

    # Georeference in Web Mercator (EPSG:3857), the tiles' native CRS.
    def merc(lon, lat):
        k = 20037508.342789244
        return (lon * k / 180.0,
                math.log(math.tan((90 + lat) * math.pi / 360.0)) / (math.pi / 180.0) * k / 180.0)

    span = 2 * 20037508.342789244 / 2 ** z
    left = -20037508.342789244 + x0 * span
    top = 20037508.342789244 - y0 * span
    transform = rasterio.transform.from_origin(left, top, span / 256, span / 256)

    arr = np.transpose(np.asarray(canvas), (2, 0, 1))
    profile = dict(driver="GTiff", dtype="uint8", count=3,
                   height=arr.shape[1], width=arr.shape[2],
                   crs="EPSG:3857", transform=transform)
    _write(OUT / f"vashlovani_esri_z{z}.tif", arr, profile)


def cmd_dem(args) -> None:
    """Copernicus DEM GLO-90 over the park (GLO-30 lacks this cell)."""
    urls = [DEM90.format(ns="N41", ew=f"E{int(lon):03d}") for lon in (46,)]
    srcs = [rasterio.open(u) for u in urls]
    try:
        arr, transform = merge(srcs, bounds=BBOX)
        profile = srcs[0].profile.copy()
        profile.update(height=arr.shape[1], width=arr.shape[2],
                       transform=transform)
        _write(OUT / "vashlovani_copernicus_dem_90m.tif", arr, profile)
        valid = arr[arr > -1000]
        print(f"  elevation {valid.min():.0f}-{valid.max():.0f} m")
    finally:
        for s in srcs:
            s.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("boundary").set_defaults(func=cmd_boundary)

    p = sub.add_parser("search")
    p.add_argument("--start", default="2025-05-01")
    p.add_argument("--end", default="2025-10-15")
    p.add_argument("--max-cloud", type=float, default=3.0)
    p.set_defaults(func=cmd_search)

    p = sub.add_parser("bands")
    p.add_argument("--date", required=True, help="YYYY-MM-DD from `search`")
    p.add_argument("--bands", default="visual",
                   help="comma-separated STAC asset keys: visual (RGB), "
                        "red, green, blue, nir, nir08, rededge1..3, swir16, "
                        "swir22, scl, ...")
    p.set_defaults(func=cmd_bands)

    p = sub.add_parser("basemap")
    p.add_argument("--zoom", type=int, default=16)
    p.add_argument("--max-tiles", type=int, default=4000)
    p.set_defaults(func=cmd_basemap)

    sub.add_parser("dem").set_defaults(func=cmd_dem)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
