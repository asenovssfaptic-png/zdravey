#!/usr/bin/env python3
"""Fetch Esri World Imagery for one bbox at one zoom -> GeoTIFF.

Usage: fetch_window.py <zoom> <W> <S> <E> <N> <out.tif>
"""
from __future__ import annotations

import io
import math
import sys
from concurrent.futures import ThreadPoolExecutor
from threading import local

import numpy as np
import rasterio
import requests
from PIL import Image

URL = ("https://services.arcgisonline.com/ArcGIS/rest/services"
       "/World_Imagery/MapServer/tile/{z}/{y}/{x}")
R = 20037508.342789244
WORKERS = 10
_tl = local()


def deg2tile(lat, lon, z):
    n = 2 ** z
    r = math.radians(lat)
    return (int((lon + 180.0) / 360.0 * n),
            int((1.0 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2.0 * n))


def main() -> None:
    z = int(sys.argv[1])
    w, s, e, n = (float(v) for v in sys.argv[2:6])
    out = sys.argv[6]
    x0, y0 = deg2tile(n, w, z)
    x1, y1 = deg2tile(s, e, z)
    cols, rows = x1 - x0 + 1, y1 - y0 + 1
    mpp = 156543.03392 * math.cos(math.radians((s + n) / 2)) / 2 ** z
    print(f"z{z}: {cols}x{rows} = {cols*rows} tiles, {mpp:.2f} m/px")

    canvas = np.zeros((rows * 256, cols * 256, 3), dtype=np.uint8)
    state = {"ok": 0, "miss": 0}

    def grab(job):
        tx, ty = job
        sess = getattr(_tl, "s", None)
        if sess is None:
            sess = _tl.s = requests.Session()
        for _ in range(3):
            try:
                r = sess.get(URL.format(z=z, x=tx, y=ty), timeout=30)
            except requests.RequestException:
                continue
            if r.status_code == 200 and r.content:
                try:
                    img = Image.open(io.BytesIO(r.content)).convert("RGB")
                except Exception:
                    continue
                canvas[(ty - y0) * 256:(ty - y0 + 1) * 256,
                       (tx - x0) * 256:(tx - x0 + 1) * 256] = np.asarray(img)
                state["ok"] += 1
                if state["ok"] % 200 == 0:
                    print(f"  {state['ok']}/{cols*rows}", flush=True)
                return
        state["miss"] += 1

    jobs = [(tx, ty) for ty in range(y0, y1 + 1) for tx in range(x0, x1 + 1)]
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(pool.map(grab, jobs))
    print(f"fetched {state['ok']}, missing {state['miss']}")

    span = 2 * R / 2 ** z
    tf = rasterio.transform.from_origin(-R + x0 * span, R - y0 * span,
                                        span / 256, span / 256)
    arr = np.transpose(canvas, (2, 0, 1))
    with rasterio.open(out, "w", driver="GTiff", dtype="uint8", count=3,
                       height=arr.shape[1], width=arr.shape[2],
                       crs="EPSG:3857", transform=tf, compress="deflate",
                       predictor=2, tiled=True, blockxsize=512,
                       blockysize=512, BIGTIFF="IF_SAFER") as dst:
        dst.write(arr)
    print(f"wrote {out} {arr.shape}")


if __name__ == "__main__":
    main()
