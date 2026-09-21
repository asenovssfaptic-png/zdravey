#!/usr/bin/env python3
"""Build compact web/database payloads for the Vashlovani GIS site.

Produces:
  web/roads_osm.json      mapped roads inside the park, grouped by route name
  web/roads_detected.json detector output with its OSM-match status
  web/water.json          detected water polygons
  web/vegetation.json     detected dense-vegetation polygons
  web/boundary.json       park boundary
  web/sites.json          the pin database: one record per site, with the
                          evidence behind it (OSM / internet research /
                          imagery) so a viewer can see WHY a pin is there
  web/meta.json           layer stats and detector metrics for the UI

Georgian names are kept verbatim; the English field is a transliteration
where OSM gives no English name, flagged as such (`name_en_src`) so the map
never passes a guess off as an official name.
"""
from __future__ import annotations

import json
import math
import pathlib
import re

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

OUT = pathlib.Path(__file__).parent
WEB = OUT / "web"
WEB.mkdir(exist_ok=True)

# Transliterations / glosses for Georgian OSM names with no English tag.
# These are transliterations, not authoritative English names.
KA_EN = {
    "რეინჯერსთა საგუშაგო": "Rangers' post",
    "ვიზიტორთა ცენტრი (Visitor Center)": "Visitor Center",
    "ვიზიტორთა ცენტრი Central Bungalows": "Visitor Center — Central Bungalows",
    "პანტიშარას კანიონი": "Pantishara Canyon",
    "პანტიშარას ხეობა": "Pantishara Gorge",
    "პანტიშარას  ველი": "Pantishara Valley",
    "დათვის ხევი": "Datvis Khevi (Bear Gorge)",
    "დათვისხევი": "Datvis Khevi (Bear Gorge)",
    "ალესილების ხედი": "Alesilebi Viewpoint (badlands)",
    "ხორანთის ნაქალაქარი": "Khoranta ruined town",
    "რკინის სადნობი სახელოსნო": "Iron-smelting workshop (ruins)",
    "ექოს გადასახედი": "Echo Viewpoint",
    "დევების გადასახედი": "Giants' Viewpoint",
    "მიჯნის ყურე": "Mijniskure",
    "მიჯნისყურე": "Mijniskure",
    "მიჯნისყურის გზა": "Mijniskure road",
    "ტახის წყალი": "Takhis Tskali",
    "უსახელო-მთა": "Usakhelo Mta (Nameless Mountain)",
    "ბუღა მოედანი": "Bugha Moedani",
    "ზილჩა": "Zilcha",
    "მერცხლების ქალაქი": "City of Swallows (swallow colony)",
    "ფიქალების ხევი": "Pikalebis Khevi (Shale Gorge)",
    "ლეკის (მლაშე) წყალი": "Lekis (Mlashe) Tskali — salt water",
    "მლაშეწყალი": "Mlashe Tskali (Salty Water)",
    "ღორისწყალი": "Goristskali",
    "არეული ხევი": "Areuli Khevi",
    "იატაგი ძორი": "Iatagi Dzori",
    "ავტოგზის დასასრული": "End of the vehicle road",
    "ჯვარი ნამონასტრალზე": "Cross on the former monastery site",
    "საფეხმავლო ბილიკი ჯვრისკენ": "Footpath to the cross",
    "ვაშლოვანის სახელმწიფო ნაკრძალი": "Vashlovani Strict Nature Reserve",
    "მანქანის გასაჩერებელი  და საპიკნიკე": "Parking and picnic area",
    "ფშაველისყურე": "Pshavelis Kure",
    "ბუღდალუ": "Bughdalu",
    "პატარა შირაქი": "Patara Shiraki (Little Shiraki)",
    "კასრისწყალი": "Kasristskali",
    "კუმრა": "Kumra",
    "სასაზღვრო მდინარე ალაზანი": "Alazani border river",
    "ნამარხი სპილოს ძვლების პოვნის ადგილი": "Fossil elephant bone find site",
    "შირაქის ხელოვნური ტბა": "Shiraki artificial lake",
    "შირაქის სამხედრო აეროდრომი": "Shiraki military aerodrome",
    "კარისწყალი-მიჯნისყურე": "Kasristskali — Mijniskure",
    "საბათლო": "Sabatlo",
    "ივრისპირის შუა საუკუნეების ნაქალაქარი": "Ivrispiri medieval town site",
    "კაკლის ყურე": "Kaklis Kure (Walnut Bay)",
    "ყოფილი სსრკ საბჭოთა არმიის ყოფილი სამხედრო ობიექტის ნანგრევები":
        "Ruins of a former Soviet army military facility",
    "წნორი-დედოფლისწყარო-ქვემო ქედი": "Tsnori — Dedoplistsqaro — Kvemo Kedi",
    "ტახის წყალი-შავი მთა": "Takhis Tskali — Shavi Mta (Black Mountain)",
    "სამუხის ველი": "Samukhis Veli",
    "ალესილების ხედი ": "Alesilebi Viewpoint",
    "კასრისწყალის გამგეობა (Kasristskali Town hall)": "Kasristskali town hall",
    "კასრისწყალის საჯარო სკოლა (Kasristskali Public School)":
        "Kasristskali public school",
    "ალაზანი - Qanıx": "Alazani (Qanıx)",
    "სემი-დესერტი": "Semi-desert",
}

# OSM tag -> pin category. Order matters: first match wins.
CATEGORY_RULES = [
    (("tourism", "hostel"), "accommodation"),
    (("tourism", "guest_house"), "accommodation"),
    (("tourism", "chalet"), "accommodation"),
    (("tourism", "camp_site"), "campsite"),
    (("tourism", "picnic_site"), "picnic"),
    (("tourism", "viewpoint"), "viewpoint"),
    (("tourism", "attraction"), "attraction"),
    (("tourism", "information"), "information"),
    (("amenity", "police"), "checkpoint"),
    (("amenity", "place_of_worship"), "religious"),
    (("amenity", "drinking_water"), "water_point"),
    (("amenity", "toilets"), "facility"),
    (("amenity", "shelter"), "shelter"),
    (("amenity", "school"), "settlement"),
    (("historic", None), "historic"),
    (("natural", "peak"), "peak"),
    (("natural", "spring"), "spring"),
    (("natural", "valley"), "valley"),
    (("natural", "plateau"), "plateau"),
    (("natural", "cliff"), "cliff"),
    (("natural", "water"), "water"),
    (("place", "village"), "settlement"),
    (("place", "hamlet"), "settlement"),
    (("place", "locality"), "locality"),
    (("man_made", None), "infrastructure"),
    (("waterway", None), "watercourse"),
]

ROUTE_HINT = re.compile(r"[-—–]|to |road", re.I)


def categorise(p):
    for (k, v), cat in CATEGORY_RULES:
        if k in p and (v is None or p[k] == v):
            return cat
    return "other"


def english(p):
    for key in ("name:en", "int_name"):
        if p.get(key):
            return p[key], "osm"
    nm = p.get("name", "")
    if not nm:
        return "", "none"
    if KA_EN.get(nm):
        return KA_EN[nm], "transliteration"
    if KA_EN.get(nm.strip()):
        return KA_EN[nm.strip()], "transliteration"
    # already Latin/Azerbaijani script -> use as-is
    if not re.search(r"[Ⴀ-ჿ]", nm):
        return nm, "osm"
    return "", "none"


def simplify_fc(features, tol, props_fn):
    out = []
    for f in features:
        g = shape(f["geometry"]).simplify(tol, preserve_topology=True)
        if g.is_empty:
            continue
        out.append({"type": "Feature", "geometry": mapping(g),
                    "properties": props_fn(f)})
    return {"type": "FeatureCollection", "features": out}


def round_coords(obj, nd=5):
    if isinstance(obj, float):
        return round(obj, nd)
    if isinstance(obj, list):
        return [round_coords(v, nd) for v in obj]
    if isinstance(obj, dict):
        return {k: (round_coords(v, nd) if k == "coordinates" else v)
                for k, v in obj.items()}
    return obj


def main() -> None:
    park_fc = json.loads((OUT / "vashlovani_boundary.geojson").read_text())
    park = unary_union([shape(f["geometry"]) for f in park_fc["features"]])
    near = park.buffer(0.012)

    # ---- boundary -------------------------------------------------------
    bfc = simplify_fc(park_fc["features"], 0.0006, lambda f: {"name": "Vashlovani NP"})
    (WEB / "boundary.json").write_text(json.dumps(round_coords(bfc)))

    # ---- OSM roads inside the park --------------------------------------
    osm_roads = json.loads((OUT / "osm_roads.geojson").read_text())
    keep = []
    for f in osm_roads["features"]:
        p = f["properties"]
        if "highway" not in p or f["geometry"]["type"] != "LineString":
            continue
        g = shape(f["geometry"])
        if not g.intersects(park):
            continue
        keep.append(f)

    def road_props(f):
        p = f["properties"]
        en, src = english(p)
        return {"hw": p["highway"], "name": p.get("name", ""),
                "name_en": en, "name_en_src": src,
                "surface": p.get("surface", ""),
                "smoothness": p.get("smoothness", ""),
                "tracktype": p.get("tracktype", ""),
                "osm_id": p.get("osm_id", "")}

    rfc = simplify_fc(keep, 0.00012, road_props)
    (WEB / "roads_osm.json").write_text(json.dumps(round_coords(rfc)))
    routes = {}
    for f in rfc["features"]:
        nm = f["properties"]["name_en"] or f["properties"]["name"]
        if nm:
            routes[nm] = routes.get(nm, 0) + 1
    print(f"roads_osm.json: {len(rfc['features'])} lines, "
          f"{len(routes)} named routes")

    # ---- detector output -------------------------------------------------
    det_path = OUT / "detected_roads.geojson"
    if det_path.exists():
        det = json.loads(det_path.read_text())
        dfc = simplify_fc(det["features"], 0.00012, lambda f: {
            "id": f["properties"]["id"],
            "len": round(f["properties"]["length_m"]),
            "match": f["properties"]["osm_match_frac"],
            "status": f["properties"]["status"]})
        (WEB / "roads_detected.json").write_text(json.dumps(round_coords(dfc)))
        print(f"roads_detected.json: {len(dfc['features'])} segments")
    else:
        print("roads_detected.geojson not ready yet - rerun after `roadnet apply`")

    # ---- water + vegetation ---------------------------------------------
    for src_name, dst_name, tol in (("detected_water.geojson", "water.json", 0.0002),
                                    ("detected_vegetation.geojson",
                                     "vegetation.json", 0.0004)):
        sp = OUT / src_name
        if not sp.exists():
            continue
        d = json.loads(sp.read_text())
        fc = simplify_fc(d["features"], tol, lambda f: {
            "layer": f["properties"]["layer"],
            "area_km2": f["properties"]["area_km2"]})
        (WEB / dst_name).write_text(json.dumps(round_coords(fc)))
        print(f"{dst_name}: {len(fc['features'])} polygons "
              f"({(WEB/dst_name).stat().st_size/1024:.0f} KB)")

    # ---- site pins from OSM ---------------------------------------------
    sites = {}

    def add(key, rec):
        if key in sites:
            prev = sites[key]
            prev["sources"] = sorted(set(prev["sources"] + rec["sources"]))
            if len(rec.get("description", "")) > len(prev.get("description", "")):
                prev["description"] = rec["description"]
            return
        sites[key] = rec

    def slug(s, n):
        base = re.sub(r"[^a-z0-9]+", "-", (s or "site").lower()).strip("-")[:40]
        return f"{base or 'site'}-{n}"

    for fn in ("osm_points.geojson", "osm_features.geojson", "osm_roads.geojson"):
        d = json.loads((OUT / fn).read_text())
        for f in d["features"]:
            p = f["properties"]
            nm = p.get("name", "").strip()
            if not nm:
                continue
            g = shape(f["geometry"])
            if not g.intersects(near):
                continue
            cat = categorise(p)
            if cat in ("watercourse", "other") and fn == "osm_roads.geojson":
                continue
            if "highway" in p:
                continue          # routes are lines, not pins
            if g.geom_type == "Point":
                pt = g
            else:
                clipped = g.intersection(near)
                if clipped.is_empty:
                    continue
                pt = clipped.representative_point()
            if not near.contains(pt):
                continue
            en, ensrc = english(p)
            tagstr = ", ".join(f"{k}={v}" for k, v in p.items()
                               if k in ("tourism", "natural", "historic", "amenity",
                                        "man_made", "place", "waterway", "landuse",
                                        "leisure", "military"))
            key = (nm, cat)
            n = len(sites) + 1
            add(key, {
                "id": slug(en or nm, n),
                "name_en": en, "name_ka": nm if re.search(r"[Ⴀ-ჿ]", nm) else "",
                "name_en_src": ensrc,
                "name_local": nm,
                "category": cat,
                "lat": round(pt.y, 6), "lon": round(pt.x, 6),
                "in_park": bool(g.intersects(park)),
                "description": p.get("description", ""),
                "osm_tags": tagstr,
                "sources": [f"osm:{p.get('osm_id', '?')}"],
                "evidence": {"osm": True, "research": False, "imagery": False},
                "confidence": "high",
            })

    # ---- detected water bodies as imagery-evidence pins ------------------
    wp = OUT / "detected_water_points.geojson"
    if wp.exists():
        for i, f in enumerate(json.loads(wp.read_text())["features"], 1):
            lon, lat = f["geometry"]["coordinates"]
            p = shape(f["geometry"])
            sites[(f"water-body-{i}", "detected_water")] = {
                "id": f"detected-water-{i}",
                "name_en": f"Detected water body {i}",
                "name_ka": "", "name_en_src": "derived", "name_local": "",
                "category": "detected_water",
                "lat": lat, "lon": lon,
                "in_park": bool(p.intersects(park)),
                "description": (f"{f['properties']['area_ha']} ha of open water "
                                "detected in Sentinel-2 imagery of 2025-08-30 "
                                "(MNDWI index consensus). Semi-desert water "
                                "bodies here are seasonal, so extent is "
                                "date-specific."),
                "osm_tags": "",
                "sources": ["sentinel2:2025-08-30"],
                "evidence": {"osm": False, "research": False, "imagery": True},
                "confidence": "medium",
            }

    site_list = sorted(sites.values(), key=lambda s: (s["category"],
                                                      s["name_en"] or s["name_local"]))
    # unique ids
    seen = {}
    for s in site_list:
        base = s["id"]
        seen[base] = seen.get(base, 0) + 1
        if seen[base] > 1:
            s["id"] = f"{base}-{seen[base]}"
    (WEB / "sites.json").write_text(json.dumps(site_list, ensure_ascii=False))
    cats = {}
    for s in site_list:
        cats[s["category"]] = cats.get(s["category"], 0) + 1
    print(f"\nsites.json: {len(site_list)} pins")
    for c, n in sorted(cats.items(), key=lambda kv: -kv[1]):
        print(f"   {c:18s} {n}")

    # ---- meta -----------------------------------------------------------
    meta = {"routes": dict(sorted(routes.items(), key=lambda kv: -kv[1]))}
    for name, key in (("feature_stats.json", "features"),
                      ("road_validation.json", "roads"),
                      ("roadnet_metrics_z16.json", "detector_z16"),
                      ("roadnet_metrics_z18.json", "detector_z18"),
                      ("detector_sweep.json", "filter_sweep"),
                      ("landcover_3857.json", "landcover")):
        p = OUT / name
        if p.exists():
            meta[key] = json.loads(p.read_text())
    (WEB / "meta.json").write_text(json.dumps(meta))
    print(f"\nmeta.json {(WEB/'meta.json').stat().st_size/1024:.0f} KB")
    total = sum(f.stat().st_size for f in WEB.iterdir() if f.is_file())
    print(f"web/ total {total/1024:.0f} KB")
    for f in sorted(WEB.iterdir()):
        print(f"   {f.name:24s} {f.stat().st_size/1024:8.1f} KB")


if __name__ == "__main__":
    main()
