#!/usr/bin/env python3
"""Merge the two research workflows' output into the site records.

Inputs (workflow result JSON, as saved by the task runner):
  TASKS/weo4e1apf.output   cross-reference of the analysis findings
  TASKS/w5vp0hwpn.output   multi-angle site research

Writes an updated web/sites.json and one JSON document per site under
dbdocs/, ready for ArtifactData batch writes.

Name overrides below are the corrections the cross-reference established
against official sources (Agency of Protected Areas, Council of Europe
European Diploma appraisal, nationalparks.ge). Several are OSM typos that
should not be propagated: "Pantishira"/"Pantissara" for Pantishara,
"Vashlivani" for Vashlovani. Two OSM nodes named "visitor center" are not
visitor centres at all -- the real one is in Dedoplistsqaro, 40 km away.
"""
from __future__ import annotations

import json
import pathlib
import re

OUT = pathlib.Path(__file__).parent
TASKS = pathlib.Path("/tmp/claude-0/-home-user-zdravey/"
                     "a9f0e018-ace3-5082-8ade-d7673f0a235e/tasks")
DOCS = OUT / "dbdocs"
SITES_DIR = DOCS / "sites"

# site id -> corrected English name (from sourced findings)
NAME_FIX = {
    "vashlovani-visitor-center-43": "Central Bungalows (Visitors Village) & ranger station",
    "visitor-center-23": "Mijniskure Bungalows & Ranger Station",
    "border-checkpoint-42": "Mijniskure border-guard checkpoint",
    "rangers-post-19": "Shavi Mta (Black Mountain) Ranger Station",
    "cross-on-the-former-monastery-site-30": "Cross on the Black Mountain convent ruins",
    "footpath-to-the-cross-29": "Footpath to the cross (Black Mountain)",
    "parking-and-picnic-area-31": "Shavi Mta car park & picnic area",
    "pantishira-canyon-7": "Pantishara Canyon",
    "pantissara-valley-4": "Pantishara Valley",
    "vashlivani-nature-reserve-25": "Vashlovani State Nature Reserve",
    "bear-canyon-8": "Datviskhevi (Bear Gorge)",
    "bear-ravine-3": "Datviskhevi (Bear Gorge)",
    "usakhelo-mta-15": "Usakhelo Mta (Nameless Mountain)",
    "city-of-swallows-2": "City of Swallows (Mertskhlebis Kalaki)",
    "khoranta-ruined-town-10": "Khoranta ruined town (City of Khoranta)",
    "end-of-car-way-1": "End of vehicle track",
    "border-alazani-river-27": "Alazani border-river viewpoint",
    "alazani-qan-x-45": "Alazani (Qanıx)",
    "qan-x-39": "Alazani (Qanıx)",
    "yri-ay-46": "Əyriçay (Ayrichay) — Azerbaijan",
    "l-l-li-34": "Lələli (Lalali), Qakh District, Azerbaijan",
    "q-birstanl-q-47": "Cemetery, Lələli (Azerbaijan)",
    "zilcha-32": "Zilcha — Shavi Mta summit ridge",
    "mijniskure-24": "Mijniskure information board",
    "takhistskali-22": "Takhistskali",
    "alesilebi-viewpoint-badlands-9": "Alesilebi viewpoint (razor-sharp badlands)",
    "lekis-mlashe-tskali-salt-water-12": "Lekistskali / Mlashetskali",
    "mlashetskali-40": "Mlashetskali (Lekistskali)",
    "pikalebis-khevi-shale-gorge-13": "Pikalebis Khevi (Shale Gorge)",
    "areuli-khevi-41": "Areuli Khevi (Tangled Gorge)",
    "patara-shiraki-37": "Patara Shiraki (Little Shiraki)",
    "iron-smelting-workshop-ruins-11": "Iron-smelting workshop (ruins)",
}

# sites the research showed are outside Georgia / outside the park
OUTSIDE = {"yri-ay-46", "l-l-li-34", "q-birstanl-q-47"}

STATUS_RE = re.compile(
    r"^(NAME CORRECTION|SPELLING CORRECTION|SPELLING CONFIRMED|NAME CONFIRMED|"
    r"TRANSLATION CONFIRMED|CONFIRMED|IDENTIFIED|MEANING SOURCED|"
    r"CROSS-CHECK RESULT|Translation CONFIRMED)[.,:]?\s*", re.I)


def load_result(name):
    p = TASKS / name
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    r = d.get("result")
    if isinstance(r, str):
        r = json.loads(r)
    return r


def main() -> None:
    cross = load_result("weo4e1apf.output") or {}
    research = load_result("w5vp0hwpn.output") or {}
    sites = json.loads((OUT / "web" / "sites.json").read_text(encoding="utf-8"))
    by_id = {s["id"]: s for s in sites}

    # ---- apply cross-reference claims keyed by site id -------------------
    applied = 0
    for c in cross.get("claims", []):
        sid = str(c.get("subject", "")).strip()
        s = by_id.get(sid)
        if not s:
            continue
        finding = (c.get("finding") or "").strip()
        m = STATUS_RE.match(finding)
        status = m.group(1).upper() if m else "RESEARCHED"
        body = STATUS_RE.sub("", finding, count=1).strip()
        s["description"] = body[:900]
        s["research_status"] = status
        s["confidence"] = c.get("confidence", s.get("confidence", "medium"))
        s.setdefault("evidence", {})["research"] = True
        s["sources"] = sorted(set((s.get("sources") or []) + (c.get("sources") or [])))[:12]
        if c.get("verified") is True:
            s["verified"] = True
        applied += 1
    print(f"cross-reference: applied to {applied} site records")

    # ---- name corrections -----------------------------------------------
    fixed = 0
    for sid, nm in NAME_FIX.items():
        s = by_id.get(sid)
        if not s:
            continue
        if s.get("name_en") != nm:
            s["name_en_prev"] = s.get("name_en", "")
            s["name_en"] = nm
            s["name_en_src"] = "sourced"
            fixed += 1
    for sid in OUTSIDE:
        if sid in by_id:
            by_id[sid]["in_park"] = False
            by_id[sid]["country"] = "Azerbaijan"
    print(f"name corrections: {fixed}")

    # ---- detected water: most of it is not in the park ------------------
    wp = OUT / "detected_water_points.geojson"
    az = {1, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15}   # reverse-geocoded to Qakh, Azerbaijan
    if wp.exists():
        feats = json.loads(wp.read_text())["features"]
        for i, f in enumerate(feats, 1):
            sid = f"detected-water-{i}"
            s = by_id.get(sid)
            if not s:
                continue
            in_park = bool(f["properties"].get("in_park"))
            s["in_park"] = in_park
            s["evidence"]["research"] = True
            s["research_status"] = "CROSS-CHECKED"
            where = ("Qakh District, Azerbaijan — beyond the Alazani, in the "
                     "irrigated lowland, so almost certainly an irrigation or "
                     "fish pond rather than a semi-desert pool"
                     if i in az else
                     "Dedoplistsqaro Municipality, Georgia")
            s["description"] = (
                f"{f['properties']['area_ha']} ha of open water detected in "
                "Sentinel-2 imagery of 2025-08-30 (MNDWI consensus). "
                f"Reverse-geocodes to {where}. Cross-referencing showed 11 of "
                "the 15 detected bodies lie in Azerbaijan and that 90.5% of all "
                "detected water area sits within 60 m of the Alazani — this is "
                "one river, not a set of park pools. Extent is date-specific.")
            s["confidence"] = "medium"
            if i in az:
                s["country"] = "Azerbaijan"
    print("water pins annotated")

    # ---- add confirmed, located sites the research found -----------------
    def slug(t):
        return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:48] or "site"

    added = 0
    for r in research.get("sites", []):
        if r.get("verified_exists") is not True:
            continue
        if r.get("lat") is None or r.get("lon") is None:
            continue
        lat, lon = float(r["lat"]), float(r["lon"])
        if not (41.05 <= lat <= 41.40 and 46.2 <= lon <= 46.80):
            continue        # outside the map's frame
        sid = "res-" + slug(r.get("name_en") or "site")
        if sid in by_id:
            continue
        by_id[sid] = {
            "id": sid,
            "name_en": r.get("name_en", ""),
            "name_ka": r.get("name_ka", ""),
            "name_en_src": "sourced",
            "name_local": r.get("name_ka", ""),
            "category": r.get("category", "other"),
            "lat": round(lat, 6), "lon": round(lon, 6),
            "in_park": bool(r.get("verified_in_park")),
            "description": (r.get("description") or "")[:900],
            "osm_tags": "",
            "sources": (r.get("sources") or [])[:12],
            "evidence": {"osm": False, "research": True, "imagery": False},
            "confidence": r.get("confidence", "medium"),
            "research_status": "RESEARCH-CONFIRMED",
            "verified": True,
        }
        added += 1
    print(f"added {added} research-confirmed sites with coordinates")

    merged = sorted(by_id.values(),
                    key=lambda s: (s["category"], s.get("name_en") or s["id"]))
    (OUT / "web" / "sites.json").write_text(
        json.dumps(merged, ensure_ascii=False), encoding="utf-8")
    print(f"web/sites.json: {len(merged)} records")

    SITES_DIR.mkdir(parents=True, exist_ok=True)
    for f in SITES_DIR.glob("*.json"):
        f.unlink()
    entries = []
    for s in merged:
        p = SITES_DIR / f"{s['id']}.json"
        p.write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
        entries.append({"op": "set", "collection": "sites", "doc_id": s["id"],
                        "file_path": str(p)})
    for i in range(0, len(entries), 50):
        chunk = entries[i:i + 50]
        (DOCS / f"batch{i // 50 + 1}.json").write_text(json.dumps(chunk, indent=1))
        print(f"  batch{i // 50 + 1}.json: {len(chunk)} writes")

    n_res = sum(1 for s in merged if s.get("evidence", {}).get("research"))
    print(f"\n{n_res}/{len(merged)} records now carry research evidence")


if __name__ == "__main__":
    main()
