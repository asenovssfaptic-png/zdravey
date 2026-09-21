#!/usr/bin/env python3
"""Land-cover / feature analyzer for Vashlovani from Sentinel-2 L2A.

Computes spectral indices, runs an unsupervised k-means classification,
labels each cluster by rank within the scene, and emits:
  detected_water.geojson        water polygons (index consensus)
  detected_vegetation.geojson   dense-vegetation polygons
  detected_water_points.geojson water bodies >= 2 ha, as pins
  landcover_3857.png + .json    land-cover overlay for the web map
  feature_stats.json            areas and index statistics

Reflectance scaling: DN * 1e-4 with NO additive offset. The STAC metadata
advertises offset -0.1, but applying it drives vegetation red reflectance
to -0.042 and water NIR to -0.029 -- both physically impossible. The
Element84 COGs are already rescaled; verified against SCL classes.

Labels are RANK-based, not absolute-threshold based: k-means finds the
scene's own strata and we name them by where they sit relative to each
other. Absolute NDVI cutoffs tuned on temperate imagery mislabel a
semi-desert, where NDVI 0.32 is respectable grass cover.
"""
from __future__ import annotations

import json
import pathlib

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.features import shapes
from rasterio.warp import calculate_default_transform, reproject, transform_bounds, transform_geom
from scipy import ndimage
from shapely.geometry import mapping, shape

OUT = pathlib.Path(__file__).parent
DATE = "20250830"
SCALE = 1e-4
K = 7

SCL_NAMES = {0: "nodata", 1: "saturated", 2: "dark", 3: "shadow", 4: "vegetation",
             5: "bare", 6: "water", 7: "unclassified", 8: "cloud_medium",
             9: "cloud_high", 10: "thin_cirrus", 11: "snow"}

# label -> display colour (RGB), used for the overlay PNG and the map legend
PALETTE = {
    "water":                  (49, 130, 189),
    "dense_vegetation":       (27, 94, 32),
    "woodland_scrub":         (85, 139, 47),
    "steppe_grass":           (156, 175, 96),
    "dry_steppe":             (198, 185, 120),
    "sparse_bare":            (205, 170, 125),
    "badlands_bright_bare":   (232, 214, 183),
    "shadowed_or_dark_soil":  (120, 100, 85),
}


def load_grid():
    with rasterio.open(OUT / f"vashlovani_S2_scl_{DATE}_20m.tif") as s:
        scl = s.read(1)
        crs, transform, prof = s.crs, s.transform, s.profile.copy()
    h, w = scl.shape

    def band(name, res):
        with rasterio.open(OUT / f"vashlovani_S2_{name}_{DATE}_{res}.tif") as src:
            a = src.read(1, out_shape=(1, h, w), resampling=Resampling.average)
        return a.reshape(h, w).astype("f4") * SCALE

    bands = {n: band(n, "10m") for n in ("blue", "green", "red", "nir")}
    bands["swir16"] = band("swir16", "20m")
    return bands, scl, crs, transform, prof


def indices(b):
    eps = 1e-6
    return {
        "ndvi":  (b["nir"] - b["red"]) / (b["nir"] + b["red"] + eps),
        "ndwi":  (b["green"] - b["nir"]) / (b["green"] + b["nir"] + eps),
        "mndwi": (b["green"] - b["swir16"]) / (b["green"] + b["swir16"] + eps),
        "ndmi":  (b["nir"] - b["swir16"]) / (b["nir"] + b["swir16"] + eps),
        "bsi":   (((b["swir16"] + b["red"]) - (b["nir"] + b["blue"])) /
                  ((b["swir16"] + b["red"]) + (b["nir"] + b["blue"]) + eps)),
        "brightness": (b["blue"] + b["green"] + b["red"]) / 3.0,
    }


def kmeans(feats, k=K, iters=60):
    """Plain k-means, deterministic init (no RNG - scripts must be reproducible)."""
    x = np.stack([f.ravel() for f in feats], axis=1)
    good = np.isfinite(x).all(axis=1)
    xs = x[good]
    mu, sd = xs.mean(axis=0), xs.std(axis=0) + 1e-9
    xn = (xs - mu) / sd
    samp = xn[::max(1, xn.shape[0] // 40000)]
    cent = samp[np.linspace(0, len(samp) - 1, k).astype(int)].copy()
    lab = None
    for it in range(iters):
        d = ((xn[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2)
        lab = d.argmin(axis=1)
        new = np.stack([xn[lab == j].mean(axis=0) if (lab == j).any() else cent[j]
                        for j in range(k)])
        shift = np.abs(new - cent).max()
        cent = new
        if shift < 1e-5:
            print(f"  k-means converged at iteration {it}")
            break
    out = np.full(x.shape[0], -1, dtype="i2")
    out[good] = lab
    return out.reshape(feats[0].shape), cent * sd + mu


def label_clusters(cent, names):
    """Name clusters by rank, brightest/greenest relative to this scene."""
    i = {n: k for k, n in enumerate(names)}
    info = {j: {"ndvi": float(c[i["ndvi"]]), "mndwi": float(c[i["mndwi"]]),
                "bsi": float(c[i["bsi"]]), "brightness": float(c[i["brightness"]]),
                "ndmi": float(c[i["ndmi"]])}
            for j, c in enumerate(cent)}

    # water first, on signature not rank
    labels = {}
    remaining = []
    for j, v in info.items():
        if v["mndwi"] > 0.05:
            labels[j] = "water"
        else:
            remaining.append(j)

    # vegetated tiers by descending NDVI
    by_ndvi = sorted(remaining, key=lambda j: -info[j]["ndvi"])
    veg_tiers = ["dense_vegetation", "woodland_scrub", "steppe_grass", "dry_steppe"]
    n_veg = min(len(veg_tiers), max(0, len(by_ndvi) - 2))
    for rank, j in enumerate(by_ndvi[:n_veg]):
        labels[j] = veg_tiers[rank]

    # the least-vegetated clusters split by brightness: badlands are the bright ones
    bare = by_ndvi[n_veg:]
    by_bright = sorted(bare, key=lambda j: -info[j]["brightness"])
    for rank, j in enumerate(by_bright):
        if rank == 0:
            labels[j] = "badlands_bright_bare"
        elif rank == len(by_bright) - 1 and len(by_bright) > 1:
            labels[j] = "shadowed_or_dark_soil"
        else:
            labels[j] = "sparse_bare"

    # uniquify
    seen = {}
    for j in sorted(labels, key=lambda j: -info[j]["brightness"]):
        base = labels[j]
        seen[base] = seen.get(base, 0) + 1
        if seen[base] > 1:
            labels[j] = f"{base}_{seen[base]}"
    for j in info:
        info[j]["label"] = labels[j]
    return info


def vectorize(mask, transform, crs, min_px, simplify_m):
    lab, n = ndimage.label(mask)
    if n == 0:
        return []
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= min_px]
    if not keep:
        return []
    cleaned = np.isin(lab, keep)
    out = []
    for geom, _ in shapes(cleaned.astype("u1"), mask=cleaned, transform=transform):
        g = shape(geom).buffer(0)
        if g.is_empty:
            continue
        area = g.area
        g = g.simplify(simplify_m)
        if g.is_empty:
            continue
        out.append((area, transform_geom(crs.to_string(), "EPSG:4326", mapping(g))))
    out.sort(key=lambda t: -t[0])
    return out


def write_overlay(cls, info, crs, transform, h, w):
    """Warp the class raster to EPSG:3857 and write a PNG for Leaflet.

    Leaflet's imageOverlay stretches an image linearly in Web Mercator, so
    the PNG must be on a 3857 grid -- a 4326 grid would shear vertically at
    this latitude.
    """
    from PIL import Image

    rgb = np.zeros((3, h, w), dtype="u1")
    alpha = np.zeros((h, w), dtype="u1")
    for j, v in info.items():
        base = v["label"].rstrip("_23456789")
        col = PALETTE.get(v["label"]) or PALETTE.get(base) or (128, 128, 128)
        m = cls == j
        for b in range(3):
            rgb[b][m] = col[b]
        alpha[m] = 255

    dst_crs = "EPSG:3857"
    dtf, dw, dh = calculate_default_transform(crs, dst_crs, w, h,
                                              *rasterio.transform.array_bounds(h, w, transform))
    out_rgb = np.zeros((3, dh, dw), dtype="u1")
    out_a = np.zeros((dh, dw), dtype="u1")
    for b in range(3):
        reproject(rgb[b], out_rgb[b], src_transform=transform, src_crs=crs,
                  dst_transform=dtf, dst_crs=dst_crs, resampling=Resampling.nearest)
    reproject(alpha, out_a, src_transform=transform, src_crs=crs,
              dst_transform=dtf, dst_crs=dst_crs, resampling=Resampling.nearest)

    img = np.dstack([np.transpose(out_rgb, (1, 2, 0)), out_a])
    Image.fromarray(img, mode="RGBA").save(OUT / "landcover_3857.png", optimize=True)
    west, south, east, north = rasterio.transform.array_bounds(dh, dw, dtf)
    ll = transform_bounds(dst_crs, "EPSG:4326", west, south, east, north)
    legend = {}
    for j, v in info.items():
        base = v["label"].rstrip("_23456789")
        col = PALETTE.get(v["label"]) or PALETTE.get(base) or (128, 128, 128)
        legend[v["label"]] = {"color": "#%02x%02x%02x" % col,
                              "ndvi": round(v["ndvi"], 3), "bsi": round(v["bsi"], 3),
                              "brightness": round(v["brightness"], 3)}
    (OUT / "landcover_3857.json").write_text(json.dumps(
        {"bounds_4326": [round(v, 6) for v in ll], "size": [dw, dh],
         "legend": legend}, indent=1))
    print(f"wrote landcover_3857.png {dw}x{dh} + landcover_3857.json")


def main() -> None:
    bands, scl, crs, transform, prof = load_grid()
    idx = indices(bands)
    h, w = scl.shape
    print(f"grid {h}x{w} @20 m, CRS {crs}")

    scl_u, scl_c = np.unique(scl, return_counts=True)
    print("SCL:", {SCL_NAMES.get(int(k), int(k)): f"{v*100/scl.size:.2f}%"
                   for k, v in zip(scl_u, scl_c)})
    for n, a in idx.items():
        print(f"  {n:11s} p5 {np.percentile(a,5):+.3f}  med {np.median(a):+.3f}  "
              f"p95 {np.percentile(a,95):+.3f}")

    valid = ~np.isin(scl, [0, 1, 8, 9, 10])
    print(f"valid (non-cloud) pixels: {valid.mean()*100:.2f}%")

    names = ["ndvi", "mndwi", "bsi", "ndmi", "brightness"]
    feats = [np.where(valid, idx[n], np.nan) for n in names]
    cls, cent = kmeans(feats)
    info = label_clusters(cent, names)
    print("\nclusters (rank-labelled):")
    for j in sorted(info, key=lambda j: -info[j]["ndvi"]):
        v, px = info[j], int((cls == j).sum())
        print(f"  {j} {v['label']:24s} {px*400/1e6:7.2f} km2  ndvi{v['ndvi']:+.2f} "
              f"mndwi{v['mndwi']:+.2f} bsi{v['bsi']:+.2f} bright{v['brightness']:.3f}")

    # ---- water: require index consensus, not a single cluster -----------
    water = ((idx["mndwi"] > 0.05) | (scl == 6)) & (idx["ndvi"] < 0.2) & valid
    water = ndimage.binary_opening(water, np.ones((2, 2)))
    wpolys = vectorize(water, transform, crs, min_px=6, simplify_m=25.0)
    print(f"\nwater: {water.sum()*400/1e6:.3f} km2, {len(wpolys)} polygons")

    fc_w = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": g,
         "properties": {"layer": "water", "area_km2": round(a / 1e6, 4),
                        "detector": "MNDWI>0.05 or SCL=water, and NDVI<0.2",
                        "date": "2025-08-30"}}
        for a, g in wpolys]}
    (OUT / "detected_water.geojson").write_text(json.dumps(fc_w))
    print(f"wrote detected_water.geojson: {len(fc_w['features'])}")

    # ---- dense vegetation ------------------------------------------------
    veg_j = [j for j, v in info.items() if v["label"].startswith("dense_vegetation")]
    vmask = np.isin(cls, veg_j) & valid
    vmask = ndimage.binary_opening(vmask, np.ones((2, 2)))
    vpolys = vectorize(vmask, transform, crs, min_px=25, simplify_m=40.0)
    KEEP_V = 300
    if len(vpolys) > KEEP_V:
        print(f"  NOTE capping dense-vegetation polygons at {KEEP_V} of {len(vpolys)} "
              f"(dropped {len(vpolys)-KEEP_V} smallest, all < "
              f"{vpolys[KEEP_V][0]/1e4:.2f} ha)")
    fc_v = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": g,
         "properties": {"layer": "dense_vegetation", "area_km2": round(a / 1e6, 4),
                        "detector": "Sentinel-2 k-means, highest-NDVI stratum",
                        "date": "2025-08-30"}}
        for a, g in vpolys[:KEEP_V]]}
    (OUT / "detected_vegetation.geojson").write_text(json.dumps(fc_v))
    print(f"wrote detected_vegetation.geojson: {len(fc_v['features'])} "
          f"({vmask.sum()*400/1e6:.2f} km2 total)")

    # ---- water bodies as pins -------------------------------------------
    pts = []
    for a, g in wpolys:
        if a < 20000:
            continue
        rp = shape(g).representative_point()
        pts.append({"type": "Feature",
                    "properties": {"kind": "water_body", "area_ha": round(a / 1e4, 2),
                                   "detector": "MNDWI consensus, Sentinel-2 2025-08-30"},
                    "geometry": {"type": "Point",
                                 "coordinates": [round(rp.x, 6), round(rp.y, 6)]}})
    (OUT / "detected_water_points.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": pts}))
    print(f"wrote detected_water_points.geojson: {len(pts)} bodies >= 2 ha")

    write_overlay(cls, info, crs, transform, h, w)

    (OUT / "feature_stats.json").write_text(json.dumps({
        "date": "2025-08-30", "grid_m": 20,
        "reflectance_scaling": "DN*1e-4, no additive offset (verified via SCL classes)",
        "scl_pct": {SCL_NAMES.get(int(k), int(k)): round(float(v) * 100 / scl.size, 3)
                    for k, v in zip(scl_u, scl_c)},
        "clusters": {info[j]["label"]: {**{k: round(v, 4) for k, v in info[j].items()
                                          if k != "label"},
                                        "km2": round(float((cls == j).sum()) * 400 / 1e6, 2)}
                     for j in info},
        "water_km2": round(float(water.sum()) * 400 / 1e6, 4),
        "water_polygons": len(wpolys),
        "dense_vegetation_km2": round(float(vmask.sum()) * 400 / 1e6, 2),
        "index_stats": {n: {"p5": round(float(np.percentile(a, 5)), 4),
                            "median": round(float(np.median(a)), 4),
                            "p95": round(float(np.percentile(a, 95)), 4)}
                        for n, a in idx.items()},
    }, indent=1))
    print("wrote feature_stats.json")


if __name__ == "__main__":
    main()
