#!/usr/bin/env python3
"""Build a self-contained satellite tile pyramid for the published page.

The artifact CSP blocks runtime image loads from any external host, so the
page cannot pull Esri tiles live -- the imagery has to ship as the
artifact's own files. A publish allows at most 255 files, which rules out
256 px tiles (z16 alone needs 352 of them for this park).

So: 1024 px "supertiles". With Leaflet's `tileSize: 1024, zoomOffset: -2`,
a tile requested at zoom Z covers exactly the ground of 4x4 native 256 px
tiles at zoom Z+2. Shipping Z = 11, 12, 13 therefore gives native detail up
to map zoom 15 (3.6 m/px) in ~138 files.

Each supertile is resampled directly from the z16 mosaic by geographic
bounds, so nothing depends on the mosaic's pixel origin lining up with the
tile grid.
"""
from __future__ import annotations

import io
import json
import math
import pathlib

import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import from_bounds

OUT = pathlib.Path(__file__).parent
TILES = OUT / "tiles"
SUPER = 1024
R = 20037508.342789244
ZOOMS = [8, 9, 10, 11, 12, 13]  # supertile zooms -> native 10..15
# Z9/Z10 exist so the whole 38 km park fits on a phone screen; Z13 gives
# 3.6 m/px, enough to see a dirt track.
WEBP_Q = 74
BBOX = (46.27756, 41.09400, 46.73632, 41.35038)


def lonlat_to_merc(lon, lat):
    x = lon * R / 180.0
    y = math.log(math.tan((90 + lat) * math.pi / 360.0)) / (math.pi / 180.0) * R / 180.0
    return x, y


def main() -> None:
    TILES.mkdir(exist_ok=True)
    src = rasterio.open(OUT / "vashlovani_esri_z16.tif")
    print(f"source {src.width}x{src.height} {src.crs}")

    w, s, e, n = BBOX
    x_min, y_min = lonlat_to_merc(w, s)
    x_max, y_max = lonlat_to_merc(e, n)

    manifest = {"tileSize": SUPER, "zoomOffset": -2, "zooms": {},
                "bounds_4326": list(BBOX),
                "format": "webp", "attribution": "Imagery: Esri World Imagery"}
    total_files = total_bytes = 0

    for Z in ZOOMS:
        # a supertile at zoom Z spans the world in 2^Z steps
        span = 2 * R / (2 ** Z)
        x0 = int((x_min + R) / span)
        x1 = int((x_max + R) / span)
        y0 = int((R - y_max) / span)
        y1 = int((R - y_min) / span)
        zdir = TILES / str(Z)
        zdir.mkdir(exist_ok=True)
        made = 0
        for X in range(x0, x1 + 1):
            for Y in range(y0, y1 + 1):
                left = -R + X * span
                top = R - Y * span
                right, bottom = left + span, top - span
                try:
                    win = from_bounds(left, bottom, right, top, src.transform)
                except Exception:
                    continue
                arr = src.read(out_shape=(3, SUPER, SUPER), window=win,
                               boundless=True, fill_value=0,
                               resampling=rasterio.enums.Resampling.average)
                if arr.max() == 0:
                    continue          # entirely outside the mosaic
                # Alpha 0 where the mosaic has no data, so the page shows its
                # own map ground there instead of a black rectangle. WebP
                # carries alpha and is smaller than PNG for photographic data;
                # JPEG cannot do this at all.
                rgb = np.transpose(arr, (1, 2, 0))
                alpha = (rgb.max(axis=2) > 0).astype(np.uint8) * 255
                img = Image.fromarray(np.dstack([rgb, alpha]), "RGBA")
                buf = io.BytesIO()
                img.save(buf, "WEBP", quality=WEBP_Q, method=4)
                p = zdir / f"{X}_{Y}.webp"
                p.write_bytes(buf.getvalue())
                made += 1
                total_bytes += p.stat().st_size
        manifest["zooms"][str(Z)] = {"x": [x0, x1], "y": [y0, y1], "files": made}
        total_files += made
        native = Z + 2
        mpp = 156543.03392 * math.cos(math.radians(41.22)) / 2 ** native
        print(f"  Z{Z} (native z{native}, {mpp:.2f} m/px): "
              f"X {x0}..{x1} Y {y0}..{y1} -> {made} tiles")

    manifest["minZoom"] = ZOOMS[0] + 2
    manifest["maxNativeZoom"] = ZOOMS[-1] + 2
    (TILES / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"\n{total_files} tiles, {total_bytes/1e6:.1f} MB total "
          f"(limits: 255 files, 64 MB per publish)")
    if total_files > 240:
        print("  WARNING over the practical file budget - drop a zoom level")
    src.close()


if __name__ == "__main__":
    main()
