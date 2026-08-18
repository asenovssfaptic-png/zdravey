#!/usr/bin/env python3
"""Generate the bundled Georgian TTS clips for the Gamarjoba! app.

Usage:
    pip install edge-tts
    python3 scripts/generate-gamarjoba-audio.py [ITEMS_JSON] [--force] [--only PREFIX]

ITEMS_JSON (optional): path to a JSON array of {"id": ..., "text": ...}
records appended to the manifest (after the data.js scan, overriding it
on id clashes). Use it to feed extra/new course clips to the generator.

Behavior:
  * Output dir: gamarjoba/audio/ka/ (created if missing).
  * Builds a manifest {audioId: georgian_text} from three sources:
      1. gamarjoba/data.js — every `{ id: "...", ka: "..." }` record
         (vocab items, reading syllables/extras, praise phrases).
      2. The 33 Mkhedruli letters (hardcoded below, canonical alphabet
         order) -> audio ids letter-<translit> matching data.js
         `audioIds.letters` (ejective apostrophe sanitized to "x").
         The spoken text is the letter's Georgian NAME (ani, bani, ...)
         because names start with the letter's sound and are far more
         TTS-reliable than bare phonemes.
      3. (Praise ids come from data.js via the regex too.)
      4. gamarjoba/data.js `audioIds.examples` — letter example words
         that match no vocab/extras item, mapped to example-<translit>
         ids. The spoken text is the example word itself (the map key).
  * Skips any .mp3 that already exists, so hand-made recordings and
    previous runs survive. --force regenerates everything. --only PREFIX
    filters ids by prefix (e.g. --only letter-).
  * Rewrites gamarjoba/audio-map.js (window.AUDIO_FILES) listing every id
    that has an mp3 on disk after the run.
"""

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

VOICE = "ka-GE-EkaNeural"  # alt female/male: "ka-GE-GiorgiNeural"
RATE = "-15%"              # a little slower — these are for learners

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_DIR = REPO_ROOT / "gamarjoba"
OUT_DIR = APP_DIR / "audio" / "ka"
DATA_JS = APP_DIR / "data.js"
MAP_JS = APP_DIR / "audio-map.js"

# The 33 Mkhedruli letters in canonical alphabet order (matches the order
# and audio ids in data.js `audioIds.letters`). Text spoken = letter name.
LETTERS = [
    ("ა", "letter-a",   "ანი"),
    ("ბ", "letter-b",   "ბანი"),
    ("გ", "letter-g",   "განი"),
    ("დ", "letter-d",   "დონი"),
    ("ე", "letter-e",   "ენი"),
    ("ვ", "letter-v",   "ვინი"),
    ("ზ", "letter-z",   "ზენი"),
    ("თ", "letter-t",   "თანი"),
    ("ი", "letter-i",   "ინი"),
    ("კ", "letter-kx",  "კანი"),
    ("ლ", "letter-l",   "ლასი"),
    ("მ", "letter-m",   "მანი"),
    ("ნ", "letter-n",   "ნარი"),
    ("ო", "letter-o",   "ონი"),
    ("პ", "letter-px",  "პარი"),
    ("ჟ", "letter-zh",  "ჟანი"),
    ("რ", "letter-r",   "რაე"),
    ("ს", "letter-s",   "სანი"),
    ("ტ", "letter-tx",  "ტარი"),
    ("უ", "letter-u",   "უნი"),
    ("ფ", "letter-p",   "ფარი"),
    ("ქ", "letter-k",   "ქანი"),
    ("ღ", "letter-gh",  "ღანი"),
    ("ყ", "letter-qx",  "ყარი"),
    ("შ", "letter-sh",  "შინი"),
    ("ჩ", "letter-ch",  "ჩინი"),
    ("ც", "letter-ts",  "ცანი"),
    ("ძ", "letter-dz",  "ძილი"),
    ("წ", "letter-tsx", "წილი"),
    ("ჭ", "letter-chx", "ჭარი"),
    ("ხ", "letter-kh",  "ხანი"),
    ("ჯ", "letter-j",   "ჯანი"),
    ("ჰ", "letter-h",   "ჰაე"),
]


def build_manifest(items_json=None):
    """Return an ordered {audioId: georgian_text} dict."""
    manifest = {}
    # letters first (canonical order)
    for _ka, audio_id, name in LETTERS:
        manifest[audio_id] = name
    # everything with an id + ka in data.js: vocab, syllables, extras, praise
    src = DATA_JS.read_text(encoding="utf-8")
    for item_id, ka in re.findall(r'id:\s*"([\w-]+)",\s*ka:\s*"([^"]+)"', src):
        manifest[item_id] = ka
    # letter example words with dedicated clips (audioIds.examples entries
    # pointing at example-* ids; the others reuse vocab/extras clips that
    # are already in the manifest). Spoken text = the Georgian key.
    for ka, audio_id in re.findall(r'"([^"]+)":\s*"(example-[\w-]+)"', src):
        manifest[audio_id] = ka
    # extra items from an optional JSON file: [{"id": ..., "text": ...}]
    if items_json:
        items = json.loads(Path(items_json).read_text(encoding="utf-8"))
        for item in items:
            manifest[item["id"]] = item["text"]
    return manifest


def write_audio_map(ids):
    lines = [
        "/* Gamarjoba! — generated audio manifest.",
        " * Plain (non-module) script: assigns window.AUDIO_FILES.",
        " * Regenerate with: python3 scripts/generate-gamarjoba-audio.py",
        " * Each id maps to audio/ka/<id>.mp3 (relative to the app root).",
        " */",
        "",
        "window.AUDIO_FILES = [",
    ]
    lines += ['  "%s",' % i for i in ids]
    lines += ["];", ""]
    MAP_JS.write_text("\n".join(lines), encoding="utf-8")


async def synth(text, path):
    import edge_tts
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("items_json", nargs="?", default=None,
                        help="optional JSON array of {id, text} extra items")
    parser.add_argument("--force", action="store_true",
                        help="regenerate clips even if the mp3 already exists")
    parser.add_argument("--only", metavar="PREFIX", default=None,
                        help="only process audio ids starting with PREFIX")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = build_manifest(args.items_json)

    todo = []
    skipped = 0
    for audio_id, text in manifest.items():
        if args.only and not audio_id.startswith(args.only):
            continue
        path = OUT_DIR / (audio_id + ".mp3")
        if path.exists() and not args.force:
            skipped += 1
            continue
        todo.append((audio_id, text, path))

    if todo:
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            print("edge-tts is not installed. Run: pip install edge-tts",
                  file=sys.stderr)
            sys.exit(1)

        async def run_all():
            done = 0
            for audio_id, text, path in todo:
                await synth(text, path)
                done += 1
                print("  [%d/%d] %s.mp3  <- %s" % (done, len(todo), audio_id, text))
        asyncio.run(run_all())

    # manifest lists every id that actually has a clip on disk
    on_disk = [i for i in manifest if (OUT_DIR / (i + ".mp3")).exists()]
    write_audio_map(on_disk)

    print("Done: %d generated, %d skipped (already present), %d ids in %s"
          % (len(todo), skipped, len(on_disk), MAP_JS.relative_to(REPO_ROOT)))


if __name__ == "__main__":
    main()
