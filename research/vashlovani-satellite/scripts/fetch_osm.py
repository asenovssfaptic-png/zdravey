#!/usr/bin/env python3
"""Fetch OSM data for the Vashlovani bbox via the main OSM API.

Overpass is unreachable from this container and Geofabrik extracts are
blocked, so this uses api.openstreetmap.org/api/0.6/map, which caps a
request at 50000 nodes. The bbox is split recursively until each cell
fits, then ways are reassembled into GeoJSON.
"""
from __future__ import annotations

import json
import pathlib
import sys
import time
import xml.etree.ElementTree as ET

import requests

OUT = pathlib.Path(__file__).parent
BBOX = (46.27756, 41.09400, 46.73632, 41.35038)  # W,S,E,N
MARGIN = 0.02
API = "https://api.openstreetmap.org/api/0.6/map"
UA = {"User-Agent": "vashlovani-gis-research/1.0 (+one-off research fetch)"}

ROAD_KEYS = ("highway",)
KEEP_WAY_KEYS = ("highway", "waterway", "natural", "landuse", "boundary",
                 "tourism", "historic", "man_made", "barrier", "route",
                 "leisure", "protect_class", "place", "amenity", "power")
KEEP_NODE_KEYS = ("place", "natural", "tourism", "historic", "amenity",
                  "man_made", "mountain_pass", "ford", "barrier", "waterway",
                  "military", "landuse", "leisure")


def fetch(bbox, depth=0):
    """Return list of parsed XML roots, splitting the bbox as needed."""
    w, s, e, n = bbox
    if depth > 7:
        print(f"  !! giving up on {bbox} at depth {depth}", file=sys.stderr)
        return []
    for attempt in range(4):
        try:
            r = requests.get(API, params={"bbox": f"{w},{s},{e},{n}"},
                             headers=UA, timeout=300)
        except requests.RequestException as exc:
            print(f"  retry {attempt} on {bbox}: {exc}", file=sys.stderr)
            time.sleep(2 ** attempt)
            continue
        if r.status_code == 200:
            print(f"  ok  d{depth} {w:.4f},{s:.4f},{e:.4f},{n:.4f}  "
                  f"{len(r.content)/1e6:.1f} MB")
            return [ET.fromstring(r.content)]
        if r.status_code == 400 and b"too many nodes" in r.content.lower():
            break  # split
        if r.status_code in (429, 502, 503, 504):
            time.sleep(2 ** attempt * 2)
            continue
        print(f"  http {r.status_code} on {bbox}: {r.text[:120]}", file=sys.stderr)
        return []
    # too dense -> quarter it
    mx, my = (w + e) / 2, (s + n) / 2
    print(f"  split d{depth} {w:.4f},{s:.4f},{e:.4f},{n:.4f}")
    out = []
    for cell in ((w, s, mx, my), (mx, s, e, my), (w, my, mx, n), (mx, my, e, n)):
        out += fetch(cell, depth + 1)
    return out


def main() -> None:
    w, s, e, n = BBOX
    area = (w - MARGIN, s - MARGIN, e + MARGIN, n + MARGIN)
    # Pre-split into a 4x3 grid; the park is wide so this avoids deep recursion.
    cells = []
    for i in range(4):
        for j in range(3):
            cells.append((area[0] + (area[2] - area[0]) * i / 4,
                          area[1] + (area[3] - area[1]) * j / 3,
                          area[0] + (area[2] - area[0]) * (i + 1) / 4,
                          area[1] + (area[3] - area[1]) * (j + 1) / 3))
    roots = []
    for c in cells:
        roots += fetch(c)
        time.sleep(1)  # be polite to the OSM API

    nodes, ways = {}, {}
    for root in roots:
        for el in root.findall("node"):
            nodes[el.get("id")] = {
                "lat": float(el.get("lat")), "lon": float(el.get("lon")),
                "tags": {t.get("k"): t.get("v") for t in el.findall("tag")},
            }
        for el in root.findall("way"):
            ways[el.get("id")] = {
                "refs": [nd.get("ref") for nd in el.findall("nd")],
                "tags": {t.get("k"): t.get("v") for t in el.findall("tag")},
            }
    print(f"\nparsed {len(nodes)} nodes, {len(ways)} ways")

    def linestring(way):
        pts = [(nodes[r]["lon"], nodes[r]["lat"]) for r in way["refs"] if r in nodes]
        return pts if len(pts) >= 2 else None

    roads, features, points = [], [], []
    for wid, way in ways.items():
        tags = way["tags"]
        if not any(k in tags for k in KEEP_WAY_KEYS):
            continue
        pts = linestring(way)
        if pts is None:
            continue
        closed = pts[0] == pts[-1] and len(pts) >= 4
        geom = ({"type": "Polygon", "coordinates": [pts]}
                if closed and ("natural" in tags or "landuse" in tags or "leisure" in tags)
                else {"type": "LineString", "coordinates": pts})
        feat = {"type": "Feature", "id": f"way/{wid}",
                "properties": {**tags, "osm_id": f"way/{wid}"}, "geometry": geom}
        (roads if any(k in tags for k in ROAD_KEYS) else features).append(feat)

    for nid, node in nodes.items():
        tags = node["tags"]
        if not tags or not any(k in tags for k in KEEP_NODE_KEYS):
            continue
        points.append({"type": "Feature", "id": f"node/{nid}",
                       "properties": {**tags, "osm_id": f"node/{nid}"},
                       "geometry": {"type": "Point",
                                    "coordinates": [node["lon"], node["lat"]]}})

    for name, feats in (("osm_roads.geojson", roads),
                        ("osm_features.geojson", features),
                        ("osm_points.geojson", points)):
        path = OUT / name
        path.write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
        print(f"wrote {name}: {len(feats)} features ({path.stat().st_size/1e6:.1f} MB)")

    import collections
    print("\nhighway types:",
          dict(collections.Counter(f["properties"].get("highway")
                                   for f in roads).most_common()))
    named = sorted({f["properties"]["name"] for f in roads + features + points
                    if f["properties"].get("name")})
    print(f"\n{len(named)} named OSM features:")
    for nm in named:
        print("   ", nm)


if __name__ == "__main__":
    main()
