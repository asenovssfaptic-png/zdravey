#!/usr/bin/env python3
"""Threaded Esri World Imagery tile fetcher -> single Web Mercator GeoTIFF.

Native detail over Vashlovani tops out at z18 (~0.45 m/px); z19 returns
HTTP 200 but blank tiles. z16 (~1.8 m/px) is the working resolution for
track detection over the whole park.
"""
from __future__ import annotations

import io
import math
import os
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import rasterio
import requests
from PIL import Image

OUT = pathlib.Path(__file__).parent
BBOX = (46.27756, 41.09400, 46.73632, 41.35038)
URL = ("https://services.arcgisonline.com/ArcGIS/rest/services"
       "/World_Imagery/MapServer/tile/{z}/{y}/{x}")
R = 20037508.342789244
WORKERS = 8


def deg2tile(lat, lon, z):
    n = 2 ** z
    lat_r = math.radians(lat)
    return (int((lon + 180.0) / 360.0 * n),
            int((1.0 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2.0 * n))


def main() -> None:
    z = int(sys.argv[1]) if len(sys.argv) > 1 else 16
    w, s, e, n = BBOX
    x0, y0 = deg2tile(n, w, z)
    x1, y1 = deg2tile(s, e, z)
    cols, rows = x1 - x0 + 1, y1 - y0 + 1
    mpp = 156543.03392 * math.cos(math.radians(41.2)) / 2 ** z
    print(f"z{z}: {cols}x{rows} = {cols*rows} tiles, {mpp:.2f} m/px, "
          f"canvas {cols*256}x{rows*256}")

    canvas = np.zeros((rows * 256, cols * 256, 3), dtype=np.uint8)
    missing, done = [], [0]
    session_local = {}

    def grab(job):
        tx, ty = job
        tid = os.getpid(), id(job) % WORKERS
        sess = session_local.setdefault(tid, requests.Session())
        for attempt in range(3):
            try:
                r = sess.get(URL.format(z=z, x=tx, y=ty), timeout=30)
            except requests.RequestException:
                continue
            if r.status_code == 200 and r.content:
                try:
                    img = Image.open(io.BytesIO(r.content)).convert("RGB")
                except Exception:
                    continue
                iy, ix = (ty - y0) * 256, (tx - x0) * 256
                canvas[iy:iy + 256, ix:ix + 256] = np.asarray(img)
                done[0] += 1
                if done[0] % 250 == 0:
                    print(f"  {done[0]}/{cols*rows}", flush=True)
                return
        missing.append(job)

    jobs = [(tx, ty) for ty in range(y0, y1 + 1) for tx in range(x0, x1 + 1)]
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(pool.map(grab, jobs))
    print(f"fetched {done[0]}, missing {len(missing)}")

    span = 2 * R / 2 ** z
    transform = rasterio.transform.from_origin(
        -R + x0 * span, R - y0 * span, span / 256, span / 256)
    arr = np.transpose(canvas, (2, 0, 1))
    path = OUT / f"vashlovani_esri_z{z}.tif"
    with rasterio.open(path, "w", driver="GTiff", dtype="uint8", count=3,
                       height=arr.shape[1], width=arr.shape[2],
                       crs="EPSG:3857", transform=transform,
                       compress="deflate", predictor=2, tiled=True,
                       blockxsize=512, blockysize=512, BIGTIFF="IF_SAFER") as dst:
        dst.write(arr)
    print(f"wrote {path.name} {arr.shape} {path.stat().st_size/1e6:.0f} MB")


if __name__ == "__main__":
    main()
