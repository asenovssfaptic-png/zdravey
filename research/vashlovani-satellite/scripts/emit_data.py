#!/usr/bin/env python3
"""Emit web/ JSON as JS files that assign globals.

The page loads these with <script src="data/...js">. Assigning a global
sidesteps any question about whether a runtime fetch is permitted under the
artifact CSP -- a script tag is unambiguous.
"""
from __future__ import annotations

import json
import pathlib

OUT = pathlib.Path(__file__).parent
WEB = OUT / "web"
DATA = OUT / "webdist" / "data"
DATA.mkdir(parents=True, exist_ok=True)

MAP = {
    "boundary.json": "VASH_BOUNDARY",
    "roads_osm.json": "VASH_ROADS_OSM",
    "roads_detected.json": "VASH_ROADS_DET",
    "water.json": "VASH_WATER",
    "vegetation.json": "VASH_VEG",
    "sites.json": "VASH_SITES",
    "meta.json": "VASH_META",
}


def main() -> None:
    total = 0
    for src_name, global_name in MAP.items():
        p = WEB / src_name
        if not p.exists():
            print(f"  skip {src_name} (not built)")
            continue
        obj = json.loads(p.read_text())
        js = f"window.{global_name}={json.dumps(obj, ensure_ascii=False, separators=(',', ':'))};\n"
        out = DATA / (src_name.replace(".json", ".js"))
        out.write_text(js, encoding="utf-8")
        total += out.stat().st_size
        print(f"  {out.name:24s} {out.stat().st_size/1024:8.1f} KB  -> window.{global_name}")
    lc = OUT / "landcover_3857.json"
    if lc.exists():
        obj = json.loads(lc.read_text())
        out = DATA / "landcover.js"
        out.write_text(f"window.VASH_LANDCOVER={json.dumps(obj, separators=(',', ':'))};\n")
        total += out.stat().st_size
        print(f"  {out.name:24s} {out.stat().st_size/1024:8.1f} KB  -> window.VASH_LANDCOVER")
    print(f"total {total/1024:.0f} KB")


if __name__ == "__main__":
    main()
