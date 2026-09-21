#!/usr/bin/env python3
"""Calibration experiment: which track-detector feature actually separates
mapped tracks from the badlands' natural linear structure?

Evaluated on a window chosen for maximum in-park OSM track coverage.
Positive class = within POS_M of a mapped highway; negative = a ring
NEG_LO..NEG_HI m away. Metric = ROC AUC plus the TPR available at a
precision-oriented FPR budget, which is the operating point we actually
want (few false lines beats many).

Caveat that applies to every number here: the negative ring sits inside a
park with genuinely unmapped tracks, so some "negative" pixels are real
roads. AUC is therefore a LOWER bound on true separability.
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
from shapely.geometry import shape
from shapely.ops import unary_union
from skimage.filters import frangi, sato

OUT = pathlib.Path(__file__).parent
Z = 16
WIN = 4096
POS_M, NEG_LO, NEG_HI = 8.0, 30.0, 70.0
LAT_CORR = math.cos(math.radians(41.22))
FPR_BUDGET = 0.05


def line_kernel(length, theta):
    k = np.zeros((length, length), np.uint8)
    c = length // 2
    dx, dy = math.cos(theta) * length / 2, math.sin(theta) * length / 2
    cv2.line(k, (int(c - dx), int(c - dy)), (int(c + dx), int(c + dy)), 1, 1)
    return k


def morph_response(gray, tophat_r, close_len, open_len, n_orient):
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * tophat_r + 1,) * 2)
    feat = np.maximum(cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, disk),
                      cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, disk))
    out = np.zeros_like(feat)
    for i in range(n_orient):
        t = math.pi * i / n_orient
        x = feat
        if close_len:
            x = cv2.morphologyEx(x, cv2.MORPH_CLOSE, line_kernel(close_len, t))
        x = cv2.morphologyEx(x, cv2.MORPH_OPEN, line_kernel(open_len, t))
        np.maximum(out, x, out=out)
    return out


def ridge_response(gray, kind, sigmas):
    g = gray.astype("f4") / 255.0
    best = None
    for black in (False, True):
        f = (sato(g, sigmas=sigmas, black_ridges=black) if kind == "sato"
             else frangi(g, sigmas=sigmas, black_ridges=black))
        f = np.nan_to_num(f)
        best = f if best is None else np.maximum(best, f)
    # to uint8 on a robust scale
    hi = np.percentile(best, 99.9) or 1.0
    return np.clip(best / hi * 255, 0, 255).astype(np.uint8)


def roc(resp, pos, neg):
    pv, nv = resp[pos].astype(int), resp[neg].astype(int)
    if pv.size < 500 or nv.size < 500:
        return None
    ph = np.bincount(pv, minlength=256).astype(float)
    nh = np.bincount(nv, minlength=256).astype(float)
    p_sf = 1.0 - np.cumsum(ph) / ph.sum()
    n_sf = 1.0 - np.cumsum(nh) / nh.sum()
    trapz = getattr(np, "trapezoid", None) or np.trapz
    auc = abs(float(trapz(p_sf[::-1], n_sf[::-1])))
    j = p_sf - n_sf
    thr_j = int(np.argmax(j))
    ok = np.nonzero(n_sf <= FPR_BUDGET)[0]
    thr_p = int(ok[0]) if ok.size else 255
    return {"auc": round(auc, 4), "thr_youden": thr_j,
            "tpr_youden": round(float(p_sf[thr_j]), 3),
            "fpr_youden": round(float(n_sf[thr_j]), 3),
            "thr_prec": thr_p, "tpr_at_budget": round(float(p_sf[thr_p]), 3),
            "fpr_at_budget": round(float(n_sf[thr_p]), 4)}


def main() -> None:
    src = rasterio.open(OUT / f"vashlovani_esri_z{Z}.tif")
    park = json.loads((OUT / "vashlovani_boundary.geojson").read_text())
    park_4326 = unary_union([shape(f["geometry"]) for f in park["features"]])
    osm = json.loads((OUT / "osm_roads.geojson").read_text())
    ref = [f["geometry"] for f in osm["features"]
           if f["geometry"]["type"] == "LineString"
           and "highway" in f["properties"]
           and shape(f["geometry"]).intersects(park_4326)]
    ref_3857 = [transform_geom("EPSG:4326", src.crs.to_string(), g) for g in ref]
    print(f"{len(ref_3857)} in-park OSM highway lines")

    # pick the window with the most in-park OSM road
    road_full = rasterize([(shape(g).buffer(POS_M / LAT_CORR), 1) for g in ref_3857],
                          out_shape=(src.height, src.width),
                          transform=src.transform, fill=0, dtype="u1").astype(bool)
    park_full = ~geometry_mask(
        [transform_geom("EPSG:4326", src.crs.to_string(), f["geometry"])
         for f in park["features"]],
        out_shape=(src.height, src.width), transform=src.transform, invert=False)
    best, bxy = -1, (0, 0)
    for y in range(0, src.height - WIN, WIN // 2):
        for x in range(0, src.width - WIN, WIN // 2):
            s = road_full[y:y + WIN, x:x + WIN].sum()
            if s > best:
                best, bxy = s, (y, x)
    y0, x0 = bxy
    print(f"window at row {y0} col {x0}: {best} road px, "
          f"{park_full[y0:y0+WIN, x0:x0+WIN].mean()*100:.0f}% in park")

    w = rasterio.windows.Window(x0, y0, WIN, WIN)
    rgb = src.read(window=w)
    gray = cv2.cvtColor(np.transpose(rgb, (1, 2, 0)), cv2.COLOR_RGB2GRAY)
    tf = src.window_transform(w)

    def bm(d):
        return rasterize([(shape(g).buffer(d / LAT_CORR), 1) for g in ref_3857],
                         out_shape=(WIN, WIN), transform=tf, fill=0,
                         dtype="u1").astype(bool)
    parkw = park_full[y0:y0 + WIN, x0:x0 + WIN]
    pos = bm(POS_M) & parkw
    neg = (bm(NEG_HI) & ~bm(NEG_LO)) & parkw
    print(f"pos {pos.sum()} px, neg {neg.sum()} px\n")

    configs = []
    for open_len in (15, 25, 41, 61):
        configs.append((f"morph tophat6 close9 open{open_len} n16",
                        lambda g, o=open_len: morph_response(g, 6, 9, o, 16)))
    configs += [
        ("morph tophat4 close9 open41 n16", lambda g: morph_response(g, 4, 9, 41, 16)),
        ("morph tophat9 close9 open41 n16", lambda g: morph_response(g, 9, 9, 41, 16)),
        ("morph tophat6 close17 open61 n24", lambda g: morph_response(g, 6, 17, 61, 24)),
        ("sato sigmas 1-3", lambda g: ridge_response(g, "sato", [1, 2, 3])),
        ("frangi sigmas 1-3", lambda g: ridge_response(g, "frangi", [1, 2, 3])),
    ]

    rows = []
    for name, fn in configs:
        r = roc(fn(gray), pos, neg)
        if r is None:
            print(f"{name:38s} insufficient pixels")
            continue
        rows.append((name, r))
        print(f"{name:38s} AUC {r['auc']:.3f} | Youden thr{r['thr_youden']:3d} "
              f"TPR {r['tpr_youden']:.3f} FPR {r['fpr_youden']:.3f} | "
              f"@FPR<={FPR_BUDGET} thr{r['thr_prec']:3d} TPR {r['tpr_at_budget']:.3f}")

    rows.sort(key=lambda t: -t[1]["auc"])
    print(f"\nbest by AUC: {rows[0][0]}  ({rows[0][1]['auc']:.3f})")
    (OUT / "detector_sweep.json").write_text(json.dumps(
        {"window": {"row": y0, "col": x0, "size": WIN},
         "pos_px": int(pos.sum()), "neg_px": int(neg.sum()),
         "fpr_budget": FPR_BUDGET,
         "caveat": ("the negative ring lies inside a park containing genuinely "
                    "unmapped tracks, so AUC is a lower bound"),
         "results": {n: r for n, r in rows}}, indent=1))
    print("wrote detector_sweep.json")
    src.close()


if __name__ == "__main__":
    main()
