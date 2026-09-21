#!/usr/bin/env python3
"""Turn web/sites.json into one JSON file per site, for ArtifactData batch
writes (each batch entry can point at a file instead of inlining the body),
plus a meta document holding the analysis provenance and metrics.

Prints the batch entries as JSON so they can be pasted into the tool call.
"""
from __future__ import annotations

import json
import pathlib

OUT = pathlib.Path(__file__).parent
DOCS = OUT / "dbdocs"
SITES = DOCS / "sites"


def main() -> None:
    SITES.mkdir(parents=True, exist_ok=True)
    for f in SITES.glob("*.json"):
        f.unlink()

    sites = json.loads((OUT / "web" / "sites.json").read_text(encoding="utf-8"))
    entries = []
    for s in sites:
        doc = dict(s)
        doc["id"] = s["id"]
        p = SITES / f"{s['id']}.json"
        p.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
        entries.append({"op": "set", "collection": "sites", "doc_id": s["id"],
                        "file_path": str(p)})

    meta = json.loads((OUT / "web" / "meta.json").read_text(encoding="utf-8"))
    mp = DOCS / "analysis.json"
    mp.write_text(json.dumps({
        "kind": "analysis_provenance",
        "park": "Vashlovani National Park, Dedoplistsqaro, Kakheti, Georgia",
        "bbox_4326": [46.27756, 41.09400, 46.73632, 41.35038],
        "imagery_basemap": "Esri World Imagery, z16 (1.8 m/px), shipped as "
                           "146 WebP supertiles, native detail to 3.6 m/px",
        "imagery_analysis": "Sentinel-2 L2A 2025-08-30, tiles 38TNL+38TPL "
                            "mosaicked, 0.04% cloud",
        "reflectance_scaling": "DN*1e-4, no additive offset (the advertised "
                               "-0.1 offset drives vegetation red reflectance "
                               "negative; verified against SCL classes)",
        "vectors": "OpenStreetMap via api.openstreetmap.org (ODbL)",
        "detector": meta.get("roads", {}).get("detector", ""),
        "detector_metrics": meta.get("detector_z16", {}).get("models", {}),
        "road_validation": meta.get("roads", {}),
        "landcover": meta.get("features", {}).get("clusters", {}),
        "filter_sweep_best_auc": max(
            [r.get("auc", 0) for r in
             meta.get("filter_sweep", {}).get("results", {}).values()] or [0]),
        "known_limitations": [
            "OSM is incomplete in this park, so detector 'false positives' "
            "partly mean 'not in OSM' rather than 'not a road'.",
            "The detector's negative training class is a ring 30-70 m from "
            "mapped roads inside a park containing unmapped tracks, so its "
            "reported metrics are a lower bound.",
            "Land-cover areas come from one late-August date, when annual "
            "grasses are senesced; real steppe can fall into a bare class.",
            "Detected water extent is date-specific; these channels are "
            "seasonal.",
        ],
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    entries.append({"op": "set", "collection": "meta", "doc_id": "analysis",
                    "file_path": str(mp)})

    print(f"{len(sites)} site docs + 1 meta doc in {DOCS}")
    chunks = [entries[i:i + 50] for i in range(0, len(entries), 50)]
    for i, c in enumerate(chunks, 1):
        p = DOCS / f"batch{i}.json"
        p.write_text(json.dumps(c, indent=1))
        print(f"  batch{i}.json: {len(c)} writes -> {p}")


if __name__ == "__main__":
    main()
