#!/usr/bin/env python3
"""Assemble the publishable page: inline Leaflet's CSS into the template.

Leaflet's stylesheet has to be inlined because the artifact CSP admits
external stylesheets only from Google Fonts.
"""
from __future__ import annotations

import pathlib
import re
import sys

OUT = pathlib.Path(__file__).parent
DIST = OUT / "webdist"


def main() -> None:
    tpl = (OUT / "page.template.html").read_text(encoding="utf-8")
    css = (OUT / "leaflet.css").read_text(encoding="utf-8")
    if "__LEAFLET_CSS__" not in tpl:
        sys.exit("template placeholder missing")
    page = tpl.replace("__LEAFLET_CSS__", css)

    DIST.mkdir(exist_ok=True)
    dest = DIST / "index.html"
    dest.write_text(page, encoding="utf-8")

    # sanity checks
    problems = []
    if "<!doctype" in page.lower() or "<html" in page.lower():
        problems.append("page must not carry its own doctype/html wrapper")
    for host in re.findall(r'(?:src|href)="(https?://[^/"]+)', page):
        if host not in ("https://cdnjs.cloudflare.com",
                        "https://fonts.googleapis.com",
                        "https://fonts.gstatic.com"):
            problems.append(f"non-allowlisted external host: {host}")
    if page.count("<title>") != 1:
        problems.append("expected exactly one <title>")
    for need in ("data/sites.js", "data/roads_osm.js", "tiles/{z}/{x}_{y}.webp",
                 "landcover.png"):
        if need not in page:
            problems.append(f"missing reference: {need}")

    print(f"wrote {dest} — {dest.stat().st_size/1024:.0f} KB")
    if problems:
        print("PROBLEMS:")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("checks passed: no stray wrapper, hosts allowlisted, refs present")


if __name__ == "__main__":
    main()
