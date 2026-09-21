#!/usr/bin/env python3
"""Supervised track detector for Vashlovani.

Hand-tuned linear filters top out at AUC 0.661 here (see detector_sweep.json):
on badlands, natural erosion lineaments look like dirt tracks to any single
ridge filter. But OSM gives us labels, so we can learn the combination
instead of guessing it.

  train  <raster.tif>   fit a classifier on OSM labels, report honest metrics
  apply  <raster.tif>   run the fitted model over the park, vectorize, and
                        cross-reference the result against OSM

Two methodological points that decide whether the numbers mean anything:

1. SPATIAL SPLIT. Adjacent pixels are near-duplicates, so a random
   train/test split leaks and reports a fantasy AUC. We split by geography
   -- left half trains, right half tests -- so the test set is genuinely
   unseen ground.

2. CONTAMINATED NEGATIVES. The negative class is a ring 30-70 m from mapped
   roads, inside a park that genuinely contains unmapped tracks. Some
   "negatives" are real roads. Every metric here is therefore a LOWER bound,
   and "false positive" partly means "not in OSM", not "not a road".
"""
from __future__ import annotations

import json
import math
import pathlib
import pickle
import sys

import cv2
import numpy as np
import rasterio
from rasterio.features import geometry_mask, rasterize
from rasterio.warp import transform_geom
from scipy import ndimage
from shapely.geometry import LineString, mapping, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree
from skimage.filters import sato
from skimage.morphology import remove_small_objects, skeletonize

OUT = pathlib.Path(__file__).parent
POS_M, NEG_LO, NEG_HI = 8.0, 30.0, 70.0
LAT_CORR = math.cos(math.radians(41.22))
FPR_BUDGET = 0.05
MODEL_PATH = OUT / "roadnet_model.pkl"

FEATURE_NAMES = [
    "gray", "highpass", "sato1", "sato2", "sato3", "std5", "std15",
    "grad_mag", "coherence3", "coherence9", "tophat", "blackhat", "dir_open",
]


def line_kernel(length, theta):
    k = np.zeros((length, length), np.uint8)
    c = length // 2
    dx, dy = math.cos(theta) * length / 2, math.sin(theta) * length / 2
    cv2.line(k, (int(c - dx), int(c - dy)), (int(c + dx), int(c + dy)), 1, 1)
    return k


def local_std(g, k):
    m = cv2.blur(g, (k, k))
    m2 = cv2.blur(g * g, (k, k))
    return np.sqrt(np.maximum(m2 - m * m, 0))


def coherence(g, sigma):
    """Structure-tensor anisotropy: 1 where the local texture is strongly
    oriented (a line), 0 where it is isotropic (noise, rough ground)."""
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    jxx = cv2.GaussianBlur(gx * gx, (0, 0), sigma)
    jyy = cv2.GaussianBlur(gy * gy, (0, 0), sigma)
    jxy = cv2.GaussianBlur(gx * gy, (0, 0), sigma)
    tmp = np.sqrt(np.maximum((jxx - jyy) ** 2 + 4 * jxy * jxy, 0))
    num, den = tmp, jxx + jyy + 1e-6
    return (num / den).astype("f4")


def features(rgb):
    """HxWxF float32 feature stack from an RGB block."""
    gray8 = cv2.cvtColor(np.transpose(rgb, (1, 2, 0)), cv2.COLOR_RGB2GRAY)
    g = gray8.astype("f4") / 255.0
    feats = [g]
    feats.append(g - cv2.GaussianBlur(g, (0, 0), 8))           # highpass
    for s in (1, 2, 3):
        a = np.nan_to_num(sato(g, sigmas=[s], black_ridges=False))
        b = np.nan_to_num(sato(g, sigmas=[s], black_ridges=True))
        feats.append(np.maximum(a, b).astype("f4"))
    feats.append(local_std(g, 5))
    feats.append(local_std(g, 15))
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    feats.append(np.sqrt(gx * gx + gy * gy))
    feats.append(coherence(g, 3))
    feats.append(coherence(g, 9))
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    feats.append(cv2.morphologyEx(gray8, cv2.MORPH_TOPHAT, disk).astype("f4") / 255.0)
    feats.append(cv2.morphologyEx(gray8, cv2.MORPH_BLACKHAT, disk).astype("f4") / 255.0)
    th = np.maximum(cv2.morphologyEx(gray8, cv2.MORPH_TOPHAT, disk),
                    cv2.morphologyEx(gray8, cv2.MORPH_BLACKHAT, disk))
    dmax = np.zeros_like(th)
    for i in range(12):
        t = math.pi * i / 12
        np.maximum(dmax, cv2.morphologyEx(th, cv2.MORPH_OPEN, line_kernel(25, t)),
                   out=dmax)
    feats.append(dmax.astype("f4") / 255.0)
    return np.dstack(feats)


# ---------------------------------------------------------------- geometry

def load_reference(src):
    park = json.loads((OUT / "vashlovani_boundary.geojson").read_text())
    park_4326 = unary_union([shape(f["geometry"]) for f in park["features"]])
    park_mask = ~geometry_mask(
        [transform_geom("EPSG:4326", src.crs.to_string(), f["geometry"])
         for f in park["features"]],
        out_shape=(src.height, src.width), transform=src.transform, invert=False)
    osm = json.loads((OUT / "osm_roads.geojson").read_text())
    ref, props = [], []
    for f in osm["features"]:
        if f["geometry"]["type"] != "LineString" or "highway" not in f["properties"]:
            continue
        if not shape(f["geometry"]).intersects(park_4326):
            continue
        ref.append(transform_geom("EPSG:4326", src.crs.to_string(), f["geometry"]))
        props.append(f["properties"])
    return park_mask, ref, props


def label_masks(ref_3857, transform, shape_hw):
    def bm(d):
        if not ref_3857:
            return np.zeros(shape_hw, bool)
        return rasterize([(shape(g).buffer(d / LAT_CORR), 1) for g in ref_3857],
                         out_shape=shape_hw, transform=transform, fill=0,
                         dtype="u1").astype(bool)
    return bm(POS_M), (bm(NEG_HI) & ~bm(NEG_LO))


def roc_stats(prob, pos, neg, nbins=512):
    pv = np.clip((prob[pos] * (nbins - 1)).astype(int), 0, nbins - 1)
    nv = np.clip((prob[neg] * (nbins - 1)).astype(int), 0, nbins - 1)
    if pv.size < 200 or nv.size < 200:
        return None
    ph = np.bincount(pv, minlength=nbins).astype(float)
    nh = np.bincount(nv, minlength=nbins).astype(float)
    p_sf = 1.0 - np.cumsum(ph) / ph.sum()
    n_sf = 1.0 - np.cumsum(nh) / nh.sum()
    trapz = getattr(np, "trapezoid", None) or np.trapz
    auc = abs(float(trapz(p_sf[::-1], n_sf[::-1])))
    j = p_sf - n_sf
    tj = int(np.argmax(j))
    ok = np.nonzero(n_sf <= FPR_BUDGET)[0]
    tp = int(ok[0]) if ok.size else nbins - 1
    return {"auc": round(auc, 4),
            "thr_youden": round(tj / (nbins - 1), 4),
            "tpr_youden": round(float(p_sf[tj]), 3),
            "fpr_youden": round(float(n_sf[tj]), 3),
            "thr_precision": round(tp / (nbins - 1), 4),
            "tpr_at_budget": round(float(p_sf[tp]), 3),
            "fpr_at_budget": round(float(n_sf[tp]), 4)}


# ------------------------------------------------------------------- train

def cmd_train(path):
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    src = rasterio.open(path)
    print(f"{pathlib.Path(path).name}: {src.width}x{src.height}, "
          f"{src.transform.a*LAT_CORR:.2f} m/px ground")
    park_mask, ref, _ = load_reference(src)

    # work on the sub-window with the most mapped road, so labels are dense
    road_full = rasterize([(shape(g).buffer(POS_M / LAT_CORR), 1) for g in ref],
                          out_shape=(src.height, src.width),
                          transform=src.transform, fill=0, dtype="u1").astype(bool)
    WIN = min(4096, src.height, src.width)
    best, bxy = -1, (0, 0)
    step = max(256, WIN // 2)
    for y in range(0, max(1, src.height - WIN + 1), step):
        for x in range(0, max(1, src.width - WIN + 1), step):
            s = road_full[y:y + WIN, x:x + WIN].sum()
            if s > best:
                best, bxy = s, (y, x)
    y0, x0 = bxy
    print(f"training window row {y0} col {x0} size {WIN}: {best} labelled road px")

    w = rasterio.windows.Window(x0, y0, WIN, WIN)
    rgb = src.read(window=w)
    tf = src.window_transform(w)
    print("computing features...")
    F = features(rgb)
    pos, neg = label_masks(ref, tf, (WIN, WIN))
    pmask = park_mask[y0:y0 + WIN, x0:x0 + WIN]
    pos &= pmask
    neg &= pmask
    print(f"labels: {pos.sum()} positive, {neg.sum()} negative px")
    if pos.sum() < 2000:
        sys.exit("not enough labelled road pixels in this raster")

    # spatially disjoint split: left half trains, right half tests
    half = WIN // 2
    col = np.zeros((WIN, WIN), bool)
    col[:, :half] = True
    splits = {}
    for name, sel in (("train", col), ("test", ~col)):
        p = pos & sel
        n = neg & sel
        # subsample negatives to at most 3x positives, strided (no RNG)
        pi = np.flatnonzero(p.ravel())
        ni = np.flatnonzero(n.ravel())
        cap = max(1, len(pi) * 3)
        if len(ni) > cap:
            ni = ni[:: max(1, len(ni) // cap)][:cap]
        X = F.reshape(-1, F.shape[2])[np.concatenate([pi, ni])]
        y = np.concatenate([np.ones(len(pi), "i1"), np.zeros(len(ni), "i1")])
        splits[name] = (X, y, p, n)
        print(f"  {name}: {len(pi)} pos / {len(ni)} neg sampled")

    Xtr, ytr, _, _ = splits["train"]
    _, _, ptest, ntest = splits["test"]

    models = {
        "logreg": make_pipeline(StandardScaler(),
                                LogisticRegression(max_iter=2000,
                                                   class_weight="balanced")),
        "rf": RandomForestClassifier(n_estimators=120, max_depth=14,
                                     min_samples_leaf=8, n_jobs=-1,
                                     class_weight="balanced", random_state=0),
    }
    flat = F.reshape(-1, F.shape[2])
    results, fitted = {}, {}
    for name, m in models.items():
        print(f"fitting {name} on {len(ytr)} samples...")
        m.fit(Xtr, ytr)
        prob = m.predict_proba(flat)[:, 1].reshape(WIN, WIN)
        st = roc_stats(prob, ptest, ntest)
        results[name] = st
        fitted[name] = m
        print(f"  {name} TEST (spatially held out): AUC {st['auc']:.3f} | "
              f"Youden TPR {st['tpr_youden']:.3f} FPR {st['fpr_youden']:.3f} | "
              f"@FPR<={FPR_BUDGET} TPR {st['tpr_at_budget']:.3f}")

    rf = fitted["rf"]
    imp = sorted(zip(FEATURE_NAMES, rf.feature_importances_), key=lambda t: -t[1])
    print("\nRF feature importance:")
    for n, v in imp:
        print(f"  {n:11s} {v:.4f}")

    # Select on TPR at the precision budget, not AUC: that budget IS the
    # operating point we deploy, and a model can win on AUC while being
    # worse exactly where we threshold it (logreg vs rf at z16 does this).
    best_name = max(results, key=lambda k: results[k]["tpr_at_budget"])
    print(f"\nbest at FPR<={FPR_BUDGET}: {best_name} "
          f"(TPR {results[best_name]['tpr_at_budget']:.3f}, "
          f"AUC {results[best_name]['auc']:.3f})")
    with open(MODEL_PATH, "wb") as fh:
        pickle.dump({"model": fitted[best_name], "name": best_name,
                     "features": FEATURE_NAMES,
                     "thr": results[best_name]["thr_precision"],
                     "metrics": results[best_name]}, fh)
    (OUT / "roadnet_metrics.json").write_text(json.dumps({
        "raster": pathlib.Path(path).name,
        "ground_m_per_px": round(src.transform.a * LAT_CORR, 3),
        "window": {"row": y0, "col": x0, "size": WIN},
        "split": "left half train / right half test (spatially disjoint)",
        "labels": {"positive_within_m": POS_M, "negative_ring_m": [NEG_LO, NEG_HI],
                   "pos_px": int(pos.sum()), "neg_px": int(neg.sum())},
        "models": results, "best": best_name,
        "rf_feature_importance": {n: round(float(v), 4) for n, v in imp},
        "caveats": [
            "negative ring lies inside a park with genuinely unmapped tracks, "
            "so these metrics are a lower bound",
            "OSM itself is incomplete here; 'false positive' partly means "
            "'not in OSM' rather than 'not a road'",
        ],
    }, indent=1))
    print(f"wrote {MODEL_PATH.name} + roadnet_metrics.json")
    src.close()


# ------------------------------------------------------------------- apply

def cmd_apply(path):
    src = rasterio.open(path)
    with open(MODEL_PATH, "rb") as fh:
        bundle = pickle.load(fh)
    model, thr = bundle["model"], bundle["thr"]
    print(f"model {bundle['name']}, threshold {thr:.3f} "
          f"(test AUC {bundle['metrics']['auc']:.3f})")
    park_mask, ref, props = load_reference(src)
    h, w = src.height, src.width
    BLK, PAD = 1536, 64
    mask = np.zeros((h, w), bool)
    nb = math.ceil(h / BLK) * math.ceil(w / BLK)
    done = 0
    for y0 in range(0, h, BLK):
        for x0 in range(0, w, BLK):
            done += 1
            ry0, rx0 = max(0, y0 - PAD), max(0, x0 - PAD)
            ry1, rx1 = min(h, y0 + BLK + PAD), min(w, x0 + BLK + PAD)
            if not park_mask[ry0:ry1, rx0:rx1].any():
                continue
            rgb = src.read(window=rasterio.windows.Window(rx0, ry0,
                                                          rx1 - rx0, ry1 - ry0))
            if rgb.max() == 0:
                continue
            F = features(rgb)
            prob = model.predict_proba(F.reshape(-1, F.shape[2]))[:, 1]
            prob = prob.reshape(F.shape[0], F.shape[1])
            yy, xx = y0 - ry0, x0 - rx0
            hh, ww = min(BLK, h - y0), min(BLK, w - x0)
            mask[y0:y0 + hh, x0:x0 + ww] = prob[yy:yy + hh, xx:xx + ww] > thr
            if done % 10 == 0:
                print(f"  block {done}/{nb}", flush=True)
    mask &= park_mask
    print(f"mask: {mask.sum()} px ({mask.mean()*100:.3f}%)")

    mask = remove_small_objects(mask, 40)
    mask = ndimage.binary_closing(mask, np.ones((5, 5)))
    mask = remove_small_objects(mask, 120)
    print(f"cleaned: {mask.sum()} px")

    skel = skeletonize(mask)
    px_m = src.transform.a * LAT_CORR
    print(f"skeleton {skel.sum()} px = {skel.sum()*px_m/1000:.1f} km")

    lab, n = ndimage.label(skel, structure=np.ones((3, 3)))
    sizes = np.bincount(lab.ravel())
    keep = [i for i in range(1, n + 1) if sizes[i] * px_m >= 300.0]
    print(f"{len(keep)} of {n} components >= 300 m")
    skel = np.isin(lab, keep)

    paths = trace(skel)
    print(f"traced {len(paths)} segments")

    ref_metric = [shape(transform_geom(src.crs.to_string(), "EPSG:32638", g))
                  for g in ref]
    ref_metric = [g for g in ref_metric if g.length >= 1]
    tree = STRtree(ref_metric) if ref_metric else None

    feats, counts = [], {"confirmed_by_osm": 0, "partial": 0,
                         "unmapped_candidate": 0}
    det_metric = []
    for i, p in enumerate(paths):
        pts = [rasterio.transform.xy(src.transform, y, x) for y, x in p]
        if len(pts) < 2:
            continue
        ls = LineString(pts).simplify(src.transform.a * 1.5)
        gm = shape(transform_geom(src.crs.to_string(), "EPSG:32638", mapping(ls)))
        if gm.length < 60:
            continue
        det_metric.append(gm)
        frac = match_frac(gm, tree)
        status = ("confirmed_by_osm" if frac >= 0.5
                  else "partial" if frac >= 0.15 else "unmapped_candidate")
        counts[status] += 1
        feats.append({"type": "Feature",
                      "geometry": transform_geom(src.crs.to_string(),
                                                 "EPSG:4326", mapping(ls)),
                      "properties": {"id": f"det{i}",
                                     "length_m": round(gm.length, 1),
                                     "osm_match_frac": round(frac, 3),
                                     "status": status}})
    det_km = sum(f["properties"]["length_m"] for f in feats) / 1000
    (OUT / "detected_roads.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}))
    print(f"\ndetected {len(feats)} segments, {det_km:.1f} km")
    for k, v in counts.items():
        print(f"  {k:20s} {v:5d} ({v*100/max(1,len(feats)):.1f}%)")

    dtree = STRtree(det_metric) if det_metric else None
    by_type, found = {}, 0
    for g, p in zip(ref_metric, props[:len(ref_metric)]):
        fr = match_frac(g, dtree)
        if fr >= 0.5:
            found += 1
        by_type.setdefault(p.get("highway"), []).append(fr)
    ref_km = sum(g.length for g in ref_metric) / 1000
    print(f"\nOSM recall (in-park): {found}/{len(ref_metric)} lines >=50% "
          f"detected ({found*100/max(1,len(ref_metric)):.1f}%)")
    for t, v in sorted(by_type.items(), key=lambda kv: -len(kv[1])):
        print(f"    {str(t):14s} n={len(v):4d} mean frac {sum(v)/len(v):.3f}")

    (OUT / "road_validation.json").write_text(json.dumps({
        "imagery": f"{pathlib.Path(path).name}, {px_m:.2f} m/px ground",
        "detector": f"{bundle['name']} on {len(FEATURE_NAMES)} features, "
                    f"threshold {thr:.3f} chosen at FPR<={FPR_BUDGET}",
        "held_out_metrics": bundle["metrics"],
        "detected": {"segments": len(feats), "km": round(det_km, 1), **counts},
        "osm_reference_in_park": {
            "lines": len(ref_metric), "km": round(ref_km, 1),
            "lines_detected_50pct": found,
            "recall_pct": round(found * 100 / max(1, len(ref_metric)), 1)},
        "recall_by_type": {str(t): {"n": len(v),
                                    "mean_detected_frac": round(sum(v)/len(v), 3)}
                           for t, v in by_type.items()},
        "caveat": "OSM is incomplete here, so 'unmapped_candidate' mixes real "
                  "unmapped tracks with detector false positives (gully edges, "
                  "erosion scarps). Each needs visual confirmation.",
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


def trace(skel):
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
                nxt = [q for q in nbrs(cy, cx) if q != prev and not visited[q]]
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


def match_frac(geom, tree, tol=30.0, step=20.0):
    if tree is None or len(tree.geometries) == 0:
        return 0.0
    n = max(2, int(geom.length / step))
    hits = 0
    for i in range(n + 1):
        pt = geom.interpolate(i / n, normalized=True)
        cand = tree.query(pt.buffer(tol))
        if len(cand) and any(tree.geometries[c].distance(pt) <= tol for c in cand):
            hits += 1
    return hits / (n + 1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    {"train": cmd_train, "apply": cmd_apply}[sys.argv[1]](sys.argv[2])
