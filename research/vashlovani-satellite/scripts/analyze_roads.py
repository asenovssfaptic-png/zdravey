#!/usr/bin/env python3
"""Track/road detector for Vashlovani, from Esri World Imagery at z16 (1.8 m/px).

Pipeline
--------
1. Response: thin-structure top-hat of EITHER polarity (tracks here are
   sometimes pale compacted soil on darker steppe, sometimes darker ruts on
   pale badlands), then a directional closing->opening at N orientations to
   bridge along-track gaps and suppress anything that is not elongated.

2. Threshold CALIBRATED against OSM, not guessed. OSM tracks inside the park
   are the positive class (within POS_M of a mapped highway); a ring
   NEG_LO..NEG_HI m away is the negative class. We sweep the threshold, pick
   the one maximising Youden's J, and report the ROC AUC so the detector's
   real separability is on the record.

3. Vectorize: skeletonize, keep connected components whose TOTAL length is
   substantial (a track network is one component; filtering individual
   inter-junction segments by length throws away real roads that happen to
   be cut into short pieces by junctions), then trace segments.

4. Cross-reference against OSM -- restricted to roads INSIDE the park, since
   detection is masked to the park. Comparing park detections against all
   1493 bbox lines (87% of which are in farmland outside) would be nonsense.

Outputs detected_roads.geojson, unmapped_candidates.geojson,
road_validation.json.
"""
from __future__ import annotations

import json
import math
import pathlib

import cv2
import numpy as np
import rasterio
from rasterio.features import geometry_mask, rasterize
from rasterio.warp import transform_geom
from scipy import ndimage
from shapely.geometry import LineString, mapping, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree
from skimage.morphology import remove_small_objects, skeletonize

OUT = pathlib.Path(__file__).parent
Z = 16
BLOCK = 2048
PAD = 64

TOPHAT_R = 6          # px, ~11 m: wider than a track, so the disk removes it
N_ORIENT = 16
CLOSE_LEN = 9         # px, bridge along-track gaps
OPEN_LEN = 15         # px, ~27 m of straightness required

POS_M = 8.0           # ground truth: within this of an OSM highway = road
NEG_LO, NEG_HI = 30.0, 70.0   # ring used as the negative class

MIN_COMPONENT_M = 200.0   # a track network component must total this
MIN_SEG_M = 40.0          # emit segments at least this long
MATCH_TOL_M = 30.0
SAMPLE_M = 20.0
METRIC = "EPSG:32638"     # UTM 38N, for honest metre distances
LAT_CORR = math.cos(math.radians(41.22))   # EPSG:3857 -> ground scale


def line_kernel(length, theta):
    k = np.zeros((length, length), np.uint8)
    c = length // 2
    dx, dy = math.cos(theta) * length / 2, math.sin(theta) * length / 2
    cv2.line(k, (int(c - dx), int(c - dy)), (int(c + dx), int(c + dy)), 1, 1)
    return k


def build_kernels():
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * TOPHAT_R + 1,) * 2)
    thetas = [math.pi * i / N_ORIENT for i in range(N_ORIENT)]
    return disk, [(line_kernel(CLOSE_LEN, t), line_kernel(OPEN_LEN, t)) for t in thetas]


def response(gray, disk, lines):
    """Thin, elongated, either-polarity structure response (uint8)."""
    bright = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, disk)
    dark = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, disk)
    feat = np.maximum(bright, dark)
    out = np.zeros_like(feat)
    for kc, ko in lines:
        bridged = cv2.morphologyEx(feat, cv2.MORPH_CLOSE, kc)
        np.maximum(out, cv2.morphologyEx(bridged, cv2.MORPH_OPEN, ko), out=out)
    return out


def compute_response(src, park_mask):
    h, w = src.height, src.width
    disk, lines = build_kernels()
    resp = np.zeros((h, w), dtype=np.uint8)
    nb = math.ceil(h / BLOCK) * math.ceil(w / BLOCK)
    done = 0
    for y0 in range(0, h, BLOCK):
        for x0 in range(0, w, BLOCK):
            ry0, rx0 = max(0, y0 - PAD), max(0, x0 - PAD)
            ry1, rx1 = min(h, y0 + BLOCK + PAD), min(w, x0 + BLOCK + PAD)
            done += 1
            if not park_mask[ry0:ry1, rx0:rx1].any():
                continue
            rgb = src.read(window=rasterio.windows.Window(rx0, ry0, rx1 - rx0, ry1 - ry0))
            gray = cv2.cvtColor(np.transpose(rgb, (1, 2, 0)), cv2.COLOR_RGB2GRAY)
            if gray.max() == 0:
                continue
            r = response(gray, disk, lines)
            yy, xx = y0 - ry0, x0 - rx0
            hh, ww = min(BLOCK, h - y0), min(BLOCK, w - x0)
            resp[y0:y0 + hh, x0:x0 + ww] = r[yy:yy + hh, xx:xx + ww]
            if done % 20 == 0:
                print(f"  block {done}/{nb}", flush=True)
    resp[~park_mask] = 0
    return resp


def calibrate(resp, pos, neg):
    """Sweep the threshold against OSM ground truth; return (thr, stats)."""
    pv, nv = resp[pos], resp[neg]
    pv, nv = pv[pv >= 0], nv[nv >= 0]
    print(f"  calibration pixels: {pv.size} positive, {nv.size} negative")
    print(f"  positive response: med {np.median(pv):.1f} p75 {np.percentile(pv,75):.1f} "
          f"p90 {np.percentile(pv,90):.1f}")
    print(f"  negative response: med {np.median(nv):.1f} p75 {np.percentile(nv,75):.1f} "
          f"p90 {np.percentile(nv,90):.1f}")
    ph = np.bincount(pv, minlength=256).astype(float)
    nh = np.bincount(nv, minlength=256).astype(float)
    # survival functions: fraction of each class with value > t
    p_sf = 1.0 - np.cumsum(ph) / max(1.0, ph.sum())
    n_sf = 1.0 - np.cumsum(nh) / max(1.0, nh.sum())
    j = p_sf - n_sf
    thr = int(np.argmax(j))
    trapz = getattr(np, "trapezoid", None) or np.trapz
    auc = float(trapz(p_sf[::-1], n_sf[::-1]))
    stats = {"threshold": thr, "tpr_at_thr": round(float(p_sf[thr]), 4),
             "fpr_at_thr": round(float(n_sf[thr]), 4),
             "youden_j": round(float(j[thr]), 4), "roc_auc": round(abs(auc), 4),
             "pos_px": int(pv.size), "neg_px": int(nv.size)}
    print(f"  chosen threshold {thr}: TPR {stats['tpr_at_thr']:.3f} "
          f"FPR {stats['fpr_at_thr']:.3f}  J {stats['youden_j']:.3f}  "
          f"AUC {stats['roc_auc']:.3f}")
    return thr, stats


def trace_components(skel, px_m):
    """Keep substantial components, then trace their segments."""
    lab, n = ndimage.label(skel, structure=np.ones((3, 3)))
    print(f"  {n} skeleton components")
    sizes = np.bincount(lab.ravel())
    keep = {i for i in range(1, n + 1) if sizes[i] * px_m >= MIN_COMPONENT_M}
    print(f"  {len(keep)} components >= {MIN_COMPONENT_M:.0f} m total length")
    if not keep:
        return []
    skel = np.isin(lab, list(keep))

    nb8 = np.array([[1, 1, 1], [1, 0, 1], [1, 1, 1]], np.uint8)
    deg = ndimage.convolve(skel.astype(np.uint8), nb8, mode="constant")
    deg[~skel] = 0
    nodes = skel & (deg != 2)
    H, W = skel.shape
    visited = np.zeros_like(skel)
    paths = []

    def nbrs(y, x):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and skel[ny, nx]:
                        yield ny, nx

    ys, xs = np.nonzero(nodes)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        for ny, nx in nbrs(sy, sx):
            if visited[ny, nx]:
                continue
            path, prev, cy, cx = [(sy, sx)], (sy, sx), ny, nx
            while True:
                path.append((cy, cx))
                visited[cy, cx] = True
                if nodes[cy, cx]:
                    break
                nxt = [p for p in nbrs(cy, cx) if p != prev and not visited[p]]
                if not nxt:
                    break
                prev, (cy, cx) = (cy, cx), nxt[0]
            if len(path) >= 3:
                paths.append(path)

    loops = skel & ~visited & ~nodes
    llab, ln = ndimage.label(loops, structure=np.ones((3, 3)))
    for i in range(1, ln + 1):
        py, pxs = np.nonzero(llab == i)
        if len(py) >= 8:
            paths.append(list(zip(py.tolist(), pxs.tolist())))
    return paths


def match_frac(geom, tree, tol=MATCH_TOL_M):
    if tree is None or len(tree.geometries) == 0:
        return 0.0
    n = max(2, int(geom.length / SAMPLE_M))
    hits = 0
    for i in range(n + 1):
        pt = geom.interpolate(i / n, normalized=True)
        cand = tree.query(pt.buffer(tol))
        if len(cand) and any(tree.geometries[c].distance(pt) <= tol for c in cand):
            hits += 1
    return hits / (n + 1)


def main() -> None:
    src = rasterio.open(OUT / f"vashlovani_esri_z{Z}.tif")
    print(f"raster {src.width}x{src.height} {src.crs}  "
          f"{src.transform.a*LAT_CORR:.2f} m/px ground")

    park = json.loads((OUT / "vashlovani_boundary.geojson").read_text())
    park_4326 = unary_union([shape(f["geometry"]) for f in park["features"]])
    geoms_3857 = [transform_geom("EPSG:4326", src.crs.to_string(), f["geometry"])
                  for f in park["features"]]
    park_mask = ~geometry_mask(geoms_3857, out_shape=(src.height, src.width),
                               transform=src.transform, invert=False)
    print(f"park covers {park_mask.mean()*100:.1f}% of the raster")

    # ---- OSM reference, restricted to the park ---------------------------
    osm = json.loads((OUT / "osm_roads.geojson").read_text())
    ref_4326, ref_props = [], []
    for f in osm["features"]:
        if f["geometry"]["type"] != "LineString" or "highway" not in f["properties"]:
            continue
        g = shape(f["geometry"])
        if not g.intersects(park_4326):
            continue
        ref_4326.append(f["geometry"])
        ref_props.append(f["properties"])
    ref_metric = [shape(transform_geom("EPSG:4326", METRIC, g)) for g in ref_4326]
    ref_metric = [g for g in ref_metric if g.length >= 1]
    ref_km = sum(g.length for g in ref_metric) / 1000
    print(f"OSM reference INSIDE park: {len(ref_metric)} lines, {ref_km:.1f} km "
          f"(of {len(osm['features'])} in the bbox)")

    print("computing response...")
    resp = compute_response(src, park_mask)
    print(f"response: nonzero {(resp>0).mean()*100:.2f}%, max {resp.max()}")

    # ---- ground-truth masks for calibration ------------------------------
    print("calibrating threshold against OSM...")
    ref_3857 = [transform_geom("EPSG:4326", src.crs.to_string(), g) for g in ref_4326]
    px_3857 = src.transform.a                      # 3857 units per px
    def buf_mask(dist_m):
        d = dist_m / LAT_CORR                      # ground m -> 3857 units
        shapes_ = [(shape(g).buffer(d), 1) for g in ref_3857]
        return rasterize(shapes_, out_shape=(src.height, src.width),
                         transform=src.transform, fill=0, dtype="u1").astype(bool)
    pos = buf_mask(POS_M) & park_mask
    ring = (buf_mask(NEG_HI) & ~buf_mask(NEG_LO)) & park_mask
    thr, cal = calibrate(resp, pos, ring)

    mask = (resp > thr) & park_mask
    print(f"thresholded mask: {mask.sum()} px ({mask.mean()*100:.3f}%)")

    mask = remove_small_objects(mask, 30)
    mask = ndimage.binary_closing(mask, np.ones((3, 3)))
    mask = remove_small_objects(mask, 50)
    print(f"cleaned: {mask.sum()} px")

    print("skeletonizing...")
    skel = skeletonize(mask)
    px_m = src.transform.a * LAT_CORR
    print(f"skeleton {skel.sum()} px = {skel.sum()*px_m/1000:.1f} km raw")

    paths = trace_components(skel, px_m)
    print(f"traced {len(paths)} segments")

    lines_3857 = []
    for p in paths:
        pts = [rasterio.transform.xy(src.transform, y, x) for y, x in p]
        if len(pts) < 2:
            continue
        ls = LineString(pts)
        if ls.length * LAT_CORR < MIN_SEG_M:
            continue
        lines_3857.append(ls.simplify(px_3857 * 1.5))
    print(f"{len(lines_3857)} segments >= {MIN_SEG_M:.0f} m")

    det_metric = [shape(transform_geom(src.crs.to_string(), METRIC, mapping(l)))
                  for l in lines_3857]
    ref_tree = STRtree(ref_metric) if ref_metric else None

    feats, counts = [], {"confirmed_by_osm": 0, "partial": 0, "unmapped_candidate": 0}
    for i, (gm, g3) in enumerate(zip(det_metric, lines_3857)):
        frac = match_frac(gm, ref_tree)
        status = ("confirmed_by_osm" if frac >= 0.5
                  else "partial" if frac >= 0.15 else "unmapped_candidate")
        counts[status] += 1
        feats.append({"type": "Feature",
                      "geometry": transform_geom(src.crs.to_string(), "EPSG:4326",
                                                 mapping(g3)),
                      "properties": {"id": f"det{i}", "length_m": round(gm.length, 1),
                                     "osm_match_frac": round(frac, 3),
                                     "status": status}})
    det_km = sum(f["properties"]["length_m"] for f in feats) / 1000
    (OUT / "detected_roads.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}))
    print(f"\ndetected {len(feats)} segments, {det_km:.1f} km")
    for k, v in counts.items():
        print(f"  {k:20s} {v:5d}  ({v*100/max(1,len(feats)):.1f}%)")

    det_tree = STRtree(det_metric) if det_metric else None
    by_type, found = {}, 0
    for g, p in zip(ref_metric, ref_props):
        fr = match_frac(g, det_tree)
        if fr >= 0.5:
            found += 1
        by_type.setdefault(p.get("highway"), []).append(fr)
    print(f"\nOSM recall (in-park only): {found}/{len(ref_metric)} lines >=50% "
          f"detected ({found*100/max(1,len(ref_metric)):.1f}%)")
    for t, v in sorted(by_type.items(), key=lambda kv: -len(kv[1])):
        print(f"    {str(t):14s} n={len(v):4d}  mean detected_frac {sum(v)/len(v):.3f}")

    (OUT / "road_validation.json").write_text(json.dumps({
        "imagery": f"Esri World Imagery z{Z}, {px_m:.2f} m/px ground",
        "detector": ("either-polarity top-hat (disk r%d) then directional "
                     "close(%d)->open(%d) at %d orientations"
                     % (TOPHAT_R, CLOSE_LEN, OPEN_LEN, N_ORIENT)),
        "calibration": {**cal, "positive_within_m": POS_M,
                        "negative_ring_m": [NEG_LO, NEG_HI],
                        "method": "Youden J over OSM in-park tracks"},
        "detected": {"segments": len(feats), "km": round(det_km, 1), **counts},
        "osm_reference_in_park": {
            "lines": len(ref_metric), "km": round(ref_km, 1),
            "lines_detected_50pct": found,
            "recall_pct": round(found * 100 / max(1, len(ref_metric)), 1)},
        "recall_by_type": {str(t): {"n": len(v),
                                    "mean_detected_frac": round(sum(v) / len(v), 3)}
                           for t, v in by_type.items()},
        "caveat": ("OSM reference is itself incomplete, so 'unmapped_candidate' "
                   "mixes genuinely unmapped tracks with detector false "
                   "positives (gully edges, erosion scarps, field boundaries). "
                   "Each needs visual confirmation."),
    }, indent=1))
    print("wrote road_validation.json")

    cands = sorted([f for f in feats
                    if f["properties"]["status"] == "unmapped_candidate"],
                   key=lambda f: -f["properties"]["length_m"])[:40]
    for f in cands:
        c = shape(f["geometry"]).centroid
        f["properties"]["centroid"] = [round(c.x, 5), round(c.y, 5)]
    (OUT / "unmapped_candidates.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": cands}))
    print(f"wrote unmapped_candidates.geojson: top {len(cands)}")
    src.close()


if __name__ == "__main__":
    main()
