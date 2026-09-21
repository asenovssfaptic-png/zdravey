#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mining_pipeline.py -- Mine DAHP synthase and arogenate dehydrogenase transcripts
from AmarylOmicBase (Zenodo record 17307476).

AmarylOmicBase is an integrated transcriptome database for 29 Amaryllidoideae
species (30 assemblies -- Lycoris aurea has a PacBio and a Trinity-hybrid build).
This pipeline downloads the relevant archives, mines them for the two target
shikimate / aromatic-amino-acid-pathway enzymes using two independent strategies,
maps every hit to sample metadata and Kallisto TPM values, and writes a master
table plus curated FASTA files.

Targets
-------
1. DAHP synthase (3-deoxy-D-arabino-heptulosonate 7-phosphate synthase)
   EC 2.5.1.54 (current), EC 4.1.2.15 (historical/obsolete)
   Pfam: PF01474 DAHP_synth_2 (class II -- the plant/plastid enzyme),
         PF00793 DAHP_synth_1 (class I)
2. Arogenate dehydrogenase (NADP+) -- TyrAa / ADH / TyrA
   EC 1.3.1.78
   Pfam: PF02153 PDH_N (prephenate dehydrogenase, nucleotide-binding domain),
         PF20463 PDH_C (dimerisation domain), PF26213 TYRAAT1_C

Strategy
--------
STEP 1  Download + catalogue the Zenodo record (resumable, size-verified cache).
STEP 2  Dual-layer mining:
          Method A -- functional annotation filtering over the Trinotate reports,
                      the hmmscan/Pfam-A domain tables, the EggNOG-mapper tables
                      and the BLASTp-vs-Swiss-Prot tables.
          Method B -- sequence homology: pyhmmer (HMMER3 in-process) phmmer with
                      Swiss-Prot plant reference proteins as queries, plus
                      hmmsearch with the real Pfam HMMs, against every proteome.
        Hits are merged and de-duplicated per (species, peptide/transcript).
STEP 3  Expression + metadata mapping: Kallisto isoform/gene TPM matrices joined
        to ENA run/sample metadata (tissue, developmental stage, treatment).
STEP 4  Sequence extraction (cDNA unitig, CDS, peptide) and tabulation.

Everything streams out of the .tar.gz archives -- no archive is ever fully
extracted to disk.

Usage
-----
    python3 mining_pipeline.py --workdir ./amaryl_work --outdir ./results
    python3 mining_pipeline.py --offline            # use cached downloads only
    python3 mining_pipeline.py --species Narcissus_tazetta Lycoris_radiata

Requires: Python >= 3.9 and `pyhmmer` (pip install pyhmmer). Network access to
zenodo.org, rest.uniprot.org, www.ebi.ac.uk (InterPro + ENA).
"""

from __future__ import annotations

import argparse
import csv
import gzip
import html as _html
import io
import json
import os
import re
import shutil
import sys
import tarfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict, OrderedDict

# --------------------------------------------------------------------------- #
# Constants / configuration
# --------------------------------------------------------------------------- #

ZENODO_RECORD = "17307476"
ZENODO_API = "https://zenodo.org/api/records/{record}"
UNIPROT_SEARCH = "https://rest.uniprot.org/uniprotkb/search"
INTERPRO_HMM = "https://www.ebi.ac.uk/interpro/wwwapi/entry/pfam/{acc}/?annotation=hmm"
ENA_SEARCH = "https://www.ebi.ac.uk/ena/portal/api/search"
ENA_XML = "https://www.ebi.ac.uk/ena/browser/api/xml/{acc}"

USER_AGENT = "AmarylOmicBase-enzyme-mining/1.0 (python-urllib)"

# Archives the pipeline actually needs, in ascending size order so that the
# cheap ones are in place first if a run is interrupted.
NEEDED_ARCHIVES = [
    "Amaryllidoideae_blastp_uniprot.tar.gz",      # Method A: Swiss-Prot BLASTp
    "Amaryllidoideae_bed.tar.gz",                 # CDS coordinate cross-check
    "Amaryllidoideae_emapper_EggNOG.tar.gz",      # Method A: EggNOG EC / PFAMs
    "Amaryllidoideae_hmmscan_PfamA.tar.gz",       # Method A: Pfam domain tables
    "Amaryllidoideae_proteome.tar.gz",            # Method B + peptide sequences
    "Amaryllidoideae_transcriptome.tar.gz",       # cDNA / CDS sequences
    "Amaryllidoideae_expression.tar.gz",          # Kallisto TPM matrices
    "Amaryllidoideae_annotation_report.tar.gz",   # Method A: Trinotate reports
]

DAHP = "DAHP Synthase"
ADH = "Arogenate Dehydrogenase"
TARGETS = (DAHP, ADH)

TARGET_EC = {
    DAHP: ["2.5.1.54", "4.1.2.15"],
    ADH: ["1.3.1.78"],
}
# Closely related ECs recorded as supporting (not primary) evidence.
RELATED_EC = {
    DAHP: [],
    ADH: ["1.3.1.79", "1.3.1.12", "1.3.1.13", "1.3.1.43"],
}
TARGET_PFAM = {
    DAHP: {"PF01474": "DAHP_synth_2", "PF00793": "DAHP_synth_1"},
    ADH: {"PF02153": "PDH_N", "PF20463": "PDH_C", "PF26213": "TYRAAT1_C"},
}
# Pfam families used only for the homology sweep (Method B, hmmsearch).
PFAM_FOR_HMMSEARCH = {
    DAHP: ["PF01474", "PF00793"],
    ADH: ["PF02153", "PF20463", "PF26213"],
}

# Swiss-Prot entry-name prefixes for the target families (the AmarylOmicBase
# BLASTp tables report Swiss-Prot *entry names*, e.g. AROF_ARATH, not accessions).
TARGET_SPROT_ENTRY = {
    DAHP: re.compile(r"\bARO[FG][0-9]?_[A-Z0-9]+\b"),
    ADH: re.compile(r"\bTYRA[0-9]?_[A-Z0-9]+\b"),
}

# Free-text protein-name patterns. Deliberately strict: "prephenate dehydratase"
# (PF00800, EC 4.2.1.51) and "arogenate dehydratase" (EC 4.2.1.91) are different
# enzymes on the phenylalanine branch and must never match the ADH patterns.
TARGET_DESC = {
    DAHP: re.compile(
        r"(phospho-2-dehydro-3-deoxyheptonate\s+aldolase"
        r"|phospho-2-keto-3-deoxyheptonate\s+aldolase"
        r"|3-deoxy-d-arabino-heptulosonate[\s-]*7[\s-]*phosphate\s+synthase"
        r"|3-deoxy-d-arabino-heptulosonate"
        r"|\bdahp\s+synth)",
        re.I,
    ),
    ADH: re.compile(
        r"(arogenate\s+dehydrogenase"
        r"|prephenate\s+dehydrogenase"
        r"|\btyra[0-9]?\b(?!\w))",
        re.I,
    ),
}

# Pfam *name* patterns as they appear in hmmscan / Trinotate / EggNOG output.
# Pfam has renamed PF02153 over time (Prephenate_dh -> PDH_N), so both spellings
# are accepted.
TARGET_PFAM_NAME = {
    DAHP: re.compile(r"\bDAHP_synth(_[12])?\b", re.I),
    ADH: re.compile(r"\b(PDH_[NC]|Prephenate_dh(_N|_C)?|Arogenate_dh|TYRAAT1_C)\b", re.I),
}

# Disambiguation. PF00793 (DAHP_synth_1) is shared with KDSA / KdsA
# (2-dehydro-3-deoxyphosphooctonate aldolase, EC 2.5.1.55), which plants also
# encode. A PF00793-only hit that looks like KDSA is demoted, never silently kept.
DECOY_PATTERNS = {
    DAHP: re.compile(
        r"(2-dehydro-3-deoxyphosphooctonate\s+aldolase"
        r"|\bkdo\b.*\baldolase"
        r"|\bKDSA_[A-Z0-9]+\b"
        r"|\b2\.5\.1\.55\b)",
        re.I,
    ),
    ADH: re.compile(
        r"(prephenate\s+dehydratase"
        r"|arogenate\s+dehydratase"
        r"|homoserine\s+dehydrogenase"
        r"|\b4\.2\.1\.51\b|\b4\.2\.1\.91\b|\b1\.1\.1\.3\b)",
        re.I,
    ),
}

EC_RE = re.compile(r"\b\d+\.\d+\.\d+\.\d+\b")
PFAM_ACC_RE = re.compile(r"\bPF\d{5}\b")

# Fallback species-acronym table (parsed from the Zenodo description at runtime;
# this literal is the offline fallback and the cross-check).
ACRONYM_FALLBACK = {
    "Ambel": "Amaryllis belladonna",
    "Clmin": "Clivia miniata",
    "Crasi": "Crinum asiaticum",
    "Crpow": "Crinum x powellii",
    "Gaelw": "Galanthus elwesii",
    "Gasp": "Galanthus sp.",
    "Hisp": "Hippeastrum sp.",
    "Histr": "Hippeastrum striatum",
    "Hivit": "Hippeastrum vittatum",
    "Leaes": "Leucojum aestivum",
    "Lyaur": "Lycoris aurea",
    "Lychi": "Lycoris chinensis",
    "Lyinc": "Lycoris incarnata",
    "Lylon": "Lycoris longituba",
    "Lyrad": "Lycoris radiata",
    "Lyspr": "Lycoris sprengeri",
    "Naafps": "Narcissus aff. pseudonarcissus",
    "Napap": "Narcissus papyraceus",
    "Napse": "Narcissus pseudonarcissus",
    "NptatI": "Narcissus Tete-a-Tete",
    "Nataz": "Narcissus tazetta",
    "Navir": "Narcissus viridiflorus",
    "Phafcyr": "Phycella aff. cyrtanthoides",
    "Rhpra": "Rhodophiala pratensis",
    "Scmul": "Scadoxus multiflorus",
    "Trmod": "Traubia modesta",
    "Zecan": "Zephyranthes candida",
    "Zecar": "Zephyranthes carinata",
    "Zetre": "Zephyranthes treatiae",
}

# Ordered tissue vocabulary. First match wins, so the specific entries come
# before the generic ones.
TISSUE_PATTERNS = [
    # A pooled sample must not be reported as whichever organ happens to be
    # named first, so this rule is evaluated before the single-organ rules.
    # The '+' form must be anchored on organ words: growth-medium strings such
    # as "MS + 0.5 mg/L NAA" are not pooled tissue.
    ("Multiple/Pooled", r"\bmultiple\b|\bpooled\b|\bmixed\s+(tissue|organ)"
                       r"|\b(leaf|leaves|flowers?|bulbs?|roots?|stems?|tepals?"
                       r"|petals?|fruits?|seeds?|anthers?|scapes?|peels?)\s*\+\s*\w"
                       r"|\w\s*\+\s*(leaf|leaves|flowers?|bulbs?|roots?|stems?"
                       r"|tepals?|petals?|fruits?|seeds?|anthers?|scapes?)\b"
                       r"|\b(leaf|leaves|flowers?|bulbs?|roots?|stems?|tepals?|petals?)"
                       r"\s+and\s+(leaf|leaves|flower|bulb|root|stem|tepal|petal)"),
    ("Bulb meristem", r"\bbulb\s*(shoot\s*apical\s*)?meristem"),
    ("Bulb scale", r"\bbulb\s*scale|\bscale\s*leaf|\bscale[s]?\b(?=.*bulb)"),
    ("Basal plate", r"\bbasal\s*plate|\bstem\s*disc"),
    ("Meristem", r"\bmeristem|\bshoot\s*apical|\bapical\s*bud"),
    ("Bulb", r"\bbulb"),
    ("Root", r"\broot|\bradicle|\brhizome"),
    ("Leaf", r"\bleaf|\bleaves|\bleave\b|\bfoliage|\blamina"),
    ("Scape/Stem", r"\bscape|\bstem|\bstalk|\bpedicel|\bpeduncle|\bshoot"),
    ("Ovary/Pistil", r"\bovary|\bovaries|\bovule|\bcarpel|\bgynoeci|\bpistil"),
    ("Anther/Pollen", r"\banther|\bpollen|\bstamen|\bfilament|\bmicrospore"),
    ("Style/Stigma", r"\bstyle\b|\bstigma"),
    ("Tepal/Petal", r"\btepal|\bpetal|\bcorolla|\bperianth|\bcorona|\bsepal"),
    ("Flower", r"\bflower|\bfloral|\bbud\b|\binflor\w*|\bspathe|\bbract"),
    ("Fruit/Capsule", r"\bfruit|\bcapsule|\bberry|\bpericarp"),
    ("Seed", r"\bseeds?\b|\bembryo|\bendosperm"),
    ("Callus/Culture", r"\bcallus|\bcalli|\bin\s*vitro|\bcell\s*suspension|\bcell\s*culture|\bexplant"),
    ("Whole plant/Seedling", r"\bwhole\s*plant|\bseedling|\bwhole\s*organism|\bplantlet"),
]

# Ordered condition/treatment vocabulary.
CONDITION_PATTERNS = [
    ("Light quality", r"\bred\s*light|\bblue\s*light|\bfar[\s-]*red|\bwhite\s*light|\blight\s*(quality|spectrum|treatment)|\bLED\b|\bphotoperiod|\bdarkness|\bdark\s*treat"),
    ("Hormone/Elicitor", r"\bmeja\b|\bmj[\s-]?\d+\b|\bmethyl[\s-]?jasmonate|\bjasmon|\bsalicyl|\bSA\s*treat|\babscisic|\bABA\b|\bauxin|\bIAA\b|\bcytokinin|\bgibberell|\bGA3\b|\bethylene|\belicitor|\byeast\s*extract|\bhormone"),
    ("Wounding/Stress", r"\bwound|\bmechanical\s*damage|\bherbivor|\binfect|\bpathogen|\bfungal\s*challenge"),
    ("Abiotic stress", r"\bcold|\bchilling|\bfreez|\bheat\s*(stress|treat)|\bdrought|\bsalt\s*stress|\bsalin|\bosmotic|\bUV[\s-]?B?\b|\bwaterlog|\bflood"),
    ("Nutrient/Chemical", r"\bnitrogen|\bphosph(ate|orus)\s*(deficien|treat)|\bfertili|\bsucrose\s*treat|\bmedium\s*supplement"),
    ("Cultivar/Colour morph", r"\becotype\b|\bcolou?r\s*(morph|variant)|\bmorph\b"
                              r"|\b(white|red|pink|yellow|purple|orange|bicolou?r)\s*"
                              r"(flowered?|petals?|tepals?|line|variety|cultivar|\d+)\b"),
    ("Tissue culture", r"\btissue\s*culture|\bin\s*vitro\b|\bmicropropagat"),
    ("Developmental stage", r"\bstage\b|\bfull\s*bloom|\banthesis|\bblooming|\bdays?\s*after|\bDAP\b|\bDAF\b|\bdevelopment(al)?|\bmaturation|\bsenescen|\bdormanc|\bsprout|\bgermina|\bflowering\s*time|\bjuvenile|\badult|\bweek\s*\d|\bmonth\s*\d"),
    ("Time course", r"\b\d+\s*h(ours?)?\s*(post|after)|\btime\s*(course|point)|\b\d+\s*dpi\b"),
    ("Tissue survey", r"\btissue[\s-]*specific|\borgan[\s-]*specific|\btissue\s*atlas|\bdifferent\s*tissues|\bcomparative\s*transcriptom"),
    ("Control", r"\bcontrol\b|\buntreated|\bmock\b|\bwild[\s-]*type|\bCK\b"),
]

# Sample-attribute tags worth harvesting out of the ENA sample XML.
INTERESTING_TAGS = {
    "tissue", "tissue type", "organism part", "organ", "source_name", "source name",
    "developmental stage", "development stage", "dev_stage", "growth condition",
    "growth conditions", "treatment", "condition", "sample type", "sample_type",
    "cultivar", "genotype", "age", "time", "time point", "plant structure",
    "plant_structure", "isolation source", "description", "phenotype", "sex",
    "collection_date", "geo_loc_name", "light", "temperature",
}

_VERBOSE = True


def log(msg, *, level="INFO"):
    if _VERBOSE or level != "DEBUG":
        ts = time.strftime("%H:%M:%S")
        print("[{} {}] {}".format(ts, level, msg), flush=True)


# --------------------------------------------------------------------------- #
# Generic helpers
# --------------------------------------------------------------------------- #

def http_get(url, params=None, retries=5, timeout=180, binary=False, backoff=3.0):
    """GET with exponential backoff. Returns bytes/str, or None on hard failure."""
    if params:
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    last = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
            return data if binary else data.decode("utf-8", "replace")
        except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
            last = exc
            if attempt == retries:
                break
            wait = backoff * (2 ** (attempt - 1))
            log("GET failed ({}), retry {}/{} in {:.0f}s -- {}".format(
                type(exc).__name__, attempt, retries, wait, url[:120]), level="WARN")
            time.sleep(wait)
    log("GET gave up: {} -- {}".format(last, url[:160]), level="ERROR")
    return None


def download_with_resume(url, dest, expected_size=None, retries=6):
    """Resumable download. Returns True when `dest` is present and complete."""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in range(1, retries + 1):
        have = os.path.getsize(dest) if os.path.exists(dest) else 0
        if expected_size is not None and have == expected_size:
            return True
        if expected_size is not None and have > expected_size:
            log("cached {} is larger than expected -- refetching".format(
                os.path.basename(dest)), level="WARN")
            os.remove(dest)
            have = 0
        headers = {"User-Agent": USER_AGENT}
        if have:
            headers["Range"] = "bytes={}-".format(have)
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=300) as resp:
                mode = "ab" if (have and resp.status == 206) else "wb"
                if mode == "wb":
                    have = 0
                with open(dest, mode) as fh:
                    while True:
                        chunk = resp.read(1 << 20)
                        if not chunk:
                            break
                        fh.write(chunk)
        except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
            wait = 3.0 * (2 ** (attempt - 1))
            log("download error on {} ({}); retry {}/{} in {:.0f}s".format(
                os.path.basename(dest), type(exc).__name__, attempt, retries, wait),
                level="WARN")
            time.sleep(wait)
            continue
        have = os.path.getsize(dest) if os.path.exists(dest) else 0
        if expected_size is None or have == expected_size:
            return True
    final = os.path.getsize(dest) if os.path.exists(dest) else 0
    log("incomplete download: {} ({}/{} bytes)".format(
        os.path.basename(dest), final, expected_size), level="ERROR")
    return False


def iter_tar_members(path, want=None):
    """Stream a .tar.gz once, yielding (member_name, binary_file_object).

    Streaming mode ('r|gz') means the archive is decompressed exactly once and
    never materialised on disk. `want` is an optional predicate on the member
    name, evaluated before the member body is touched.
    """
    with tarfile.open(path, mode="r|gz") as tar:
        for member in tar:
            if not member.isfile():
                continue
            if want is not None and not want(member.name):
                continue
            fh = tar.extractfile(member)
            if fh is None:
                continue
            yield member.name, fh


def species_key_from_member(name):
    """Normalise an archive member path to a canonical species key."""
    base = os.path.basename(name)
    for suffix in (".tsv", ".fasta", ".fa", ".bed", ".out", ".gff3", ".txt",
                   ".emapper.annotations", ".domtblout"):
        if base.endswith(suffix):
            base = base[: -len(suffix)]
    # Kallisto matrices: Species_kallisto.isoform.TPM.not_cross_norm
    base = re.sub(r"_kallisto\..*$", "", base)
    base = re.sub(r"_nt97.*$", "", base)
    base = re.sub(r"\.(transdecoder|emapper).*$", "", base)
    return base.strip()


def fasta_stream(fh):
    """Yield (header, sequence) from a binary FASTA file object."""
    header, chunks = None, []
    for raw in fh:
        line = raw.decode("utf-8", "replace").rstrip("\n\r")
        if line.startswith(">"):
            if header is not None:
                yield header, "".join(chunks)
            header, chunks = line[1:], []
        elif line:
            chunks.append(line.strip())
    if header is not None:
        yield header, "".join(chunks)


_COMPLEMENT = str.maketrans("ACGTNacgtnRYKMSWBDHVrykmswbdhv",
                            "TGCANtgcanYRMKSWVHDByrmkswvhdb")


def revcomp(seq):
    return seq.translate(_COMPLEMENT)[::-1]


def wrap(seq, width=60):
    return "\n".join(seq[i:i + width] for i in range(0, len(seq), width))


def fmt_int(n):
    return "{:,}".format(n)


# --------------------------------------------------------------------------- #
# STEP 1 -- Zenodo catalogue + download
# --------------------------------------------------------------------------- #

def parse_acronym_table(description_html):
    """Species <-> acronym table from the Zenodo record description.

    Returns {acronym: [species name, ...]}. An acronym can legitimately map to
    more than one entry -- Lycoris aurea ships two assemblies (PB and TH) that
    share the prefix `Lyaur` -- so the value is a list and callers must not
    assume it is unambiguous.
    """
    cells = re.findall(r"<td[^>]*>(.*?)</td>", description_html or "", re.S | re.I)
    clean = []
    for cell in cells:
        txt = _html.unescape(re.sub(r"<[^>]+>", " ", cell))
        txt = txt.replace("\u00d7", "x").replace("\u00a0", " ")
        clean.append(re.sub(r"\s+", " ", txt).strip())
    mapping = OrderedDict()
    for i in range(0, len(clean) - 1, 2):
        species, acronym = clean[i], clean[i + 1]
        if not species or not acronym:
            continue
        if species.lower() == "species" or acronym.lower() == "acronym":
            continue
        if re.fullmatch(r"[A-Za-z]{2,8}[IVX]?", acronym) and " " not in acronym:
            mapping.setdefault(acronym, [])
            if species not in mapping[acronym]:
                mapping[acronym].append(species)
    return mapping


def _norm_name(text):
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def ascii_fold(text):
    """These names end up in FASTA headers, so strip the diacritics."""
    folded = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in folded if not unicodedata.combining(c))


class SpeciesIndex(object):
    """Resolves an archive species key to (binomial, assembly label)."""

    ASSEMBLY_SUFFIX = re.compile(r"\s+(PB|TH)$", re.I)

    def __init__(self, acronym_map):
        self.acronym_map = acronym_map or {}
        self.by_norm = {}
        for names in self.acronym_map.values():
            for name in names:
                self.by_norm.setdefault(_norm_name(name), name)
                # tolerate the hybrid marker: "Crinum x powellii" vs "Crinum_powellii"
                self.by_norm.setdefault(_norm_name(name.replace(" x ", " ")), name)

    def _tidy(self, name):
        name = ascii_fold(name).strip()
        name = re.sub(r"\baff\b\.?", "aff.", name)
        name = re.sub(r"\bsp\b\.?$", "sp.", name)
        return re.sub(r"\s+", " ", name)

    def resolve(self, key, acronym=None):
        """-> (binomial, assembly label). `key` is the archive member stem."""
        candidate = None
        # 1. exact match on the key itself -- this is what keeps the two Lycoris
        #    aurea assemblies apart, since they share an acronym.
        for probe in (_norm_name(key), _norm_name(key.replace("_", " "))):
            if probe in self.by_norm:
                candidate = self.by_norm[probe]
                break
        # 2. an unambiguous acronym
        if candidate is None and acronym:
            names = self.acronym_map.get(acronym) or []
            if len(names) == 1:
                candidate = names[0]
        # 3. fall back to the key itself
        if candidate is None:
            candidate = key.replace("_", " ")
        candidate = self._tidy(candidate)
        binomial = self._tidy(self.ASSEMBLY_SUFFIX.sub("", candidate))
        return binomial, key


def step1_catalogue_and_download(workdir, offline=False, record=ZENODO_RECORD,
                                 no_download=False):
    log("=" * 78)
    log("STEP 1 -- catalogue and download Zenodo record {}".format(record))
    log("=" * 78)
    cache_dir = os.path.join(workdir, "zenodo")
    os.makedirs(cache_dir, exist_ok=True)
    meta_path = os.path.join(workdir, "zenodo_record.json")

    payload = None
    if not offline:
        raw = http_get(ZENODO_API.format(record=record))
        if raw:
            try:
                payload = json.loads(raw)
                with open(meta_path, "w") as fh:
                    fh.write(raw)
            except json.JSONDecodeError:
                log("Zenodo API returned unparseable JSON", level="ERROR")
    if payload is None and os.path.exists(meta_path):
        log("using cached Zenodo record metadata", level="WARN")
        with open(meta_path) as fh:
            payload = json.load(fh)
    if payload is None:
        raise SystemExit("Cannot reach the Zenodo API and no cached metadata exists.")

    files = payload.get("files") or []
    log("record: {}".format(payload.get("title", "?")))
    log("doi   : {}".format(payload.get("doi", "?")))
    log("files : {} archives, {} bytes total".format(
        len(files), fmt_int(sum(f.get("size") or 0 for f in files))))

    acronyms = parse_acronym_table(
        (payload.get("metadata") or {}).get("description", "")) or OrderedDict()
    for k, v in ACRONYM_FALLBACK.items():
        acronyms.setdefault(k, [v])
    species_index = SpeciesIndex(acronyms)
    log("species index: {} acronyms, {} distinct species names".format(
        len(acronyms), len(set(n for ns in acronyms.values() for n in ns))))

    catalogue = OrderedDict()
    for entry in files:
        key = entry.get("key")
        catalogue[key] = {
            "key": key,
            "size": entry.get("size"),
            "checksum": entry.get("checksum"),
            "url": (entry.get("links") or {}).get("self")
                   or "https://zenodo.org/api/records/{}/files/{}/content".format(record, key),
            "local": os.path.join(cache_dir, key),
            "category": categorise_archive(key),
        }

    log("-" * 78)
    log("archive catalogue:")
    for key, info in catalogue.items():
        needed = "FETCH" if key in NEEDED_ARCHIVES else "skip "
        log("  [{}] {:48s} {:>14s} B  {}".format(
            needed, key, fmt_int(info["size"] or 0), info["category"]))
    log("-" * 78)

    for key in NEEDED_ARCHIVES:
        info = catalogue.get(key)
        if info is None:
            log("archive {} is not in this record -- skipping".format(key), level="WARN")
            continue
        dest, size = info["local"], info["size"]
        if os.path.exists(dest) and (size is None or os.path.getsize(dest) == size):
            log("cached   {} ({} B)".format(key, fmt_int(os.path.getsize(dest))))
            info["ok"] = True
            continue
        if offline or no_download:
            log("missing / incomplete, downloading disabled: {}".format(key),
                level="WARN")
            info["ok"] = False
            continue
        log("download {} ({} B) ...".format(key, fmt_int(size or 0)))
        info["ok"] = download_with_resume(info["url"], dest, size)
        if info["ok"]:
            log("done     {}".format(key))

    return catalogue, species_index


def categorise_archive(key):
    k = key.lower()
    if "transcriptome" in k or "assemblies" in k:
        return "nucleotide assembly FASTA"
    if "proteome" in k:
        return "predicted peptide FASTA (TransDecoder)"
    if "annotation_report" in k:
        return "functional annotation report (Trinotate)"
    if "emapper" in k or "eggnog" in k:
        return "functional annotation (EggNOG-mapper)"
    if "hmmscan" in k or "pfam" in k:
        return "domain annotation (hmmscan / Pfam-A)"
    if "blastp" in k:
        return "homology annotation (BLASTp vs Swiss-Prot)"
    if "expression" in k:
        return "expression matrices (Kallisto TPM / counts)"
    if "bed" in k:
        return "ORF coordinates (BED)"
    if "gff3" in k:
        return "ORF coordinates (GFF3)"
    if "signalp" in k:
        return "signal peptide predictions"
    if "tmhmm" in k:
        return "transmembrane predictions"
    if "infernal" in k:
        return "ncRNA predictions (Rfam)"
    return "other"


# --------------------------------------------------------------------------- #
# Candidate bookkeeping
# --------------------------------------------------------------------------- #

def transcript_from_prot(prot_id):
    """TransDecoder peptide id -> parent transcript id ('<tx>.p1' -> '<tx>')."""
    return re.sub(r"\.p\d+$", "", prot_id) if prot_id else ""


def gene_from_transcript(tx_id):
    """Trinity isoform id -> gene id; other assemblies have no isoform suffix."""
    if not tx_id:
        return ""
    m = re.match(r"^(.*_c\d+_g\d+)_i\d+$", tx_id)
    if m:
        return m.group(1)
    return tx_id


class CandidateStore(object):
    """Keyed by (species_key, transcript_id, prot_id)."""

    def __init__(self):
        self.rows = {}

    def add(self, species_key, transcript_id, prot_id, target, method, source,
            reasons, extra=None):
        key = (species_key, transcript_id or transcript_from_prot(prot_id), prot_id or "")
        rec = self.rows.get(key)
        if rec is None:
            rec = {
                "species_key": key[0],
                "transcript_id": key[1],
                "prot_id": key[2],
                "gene_id": "",
                "targets": defaultdict(list),   # target -> [evidence dicts]
                "decoys": defaultdict(list),
            }
            self.rows[key] = rec
        ev = {"method": method, "source": source,
              "reasons": ["{}:{}".format(k, v) for k, v in reasons]}
        if extra:
            ev.update(extra)
        rec["targets"][target].append(ev)
        return rec

    def add_decoy(self, species_key, transcript_id, prot_id, target, source, hit):
        key = (species_key, transcript_id or transcript_from_prot(prot_id), prot_id or "")
        rec = self.rows.get(key)
        if rec is not None:
            rec["decoys"][target].append("{}:{}".format(source, hit))

    def has_transcript(self, species_key, transcript_id):
        return any(k[0] == species_key and k[1] == transcript_id for k in self.rows)

    def transcripts_for(self, species_key):
        return {k[1] for k in self.rows if k[0] == species_key}

    def set_gene(self, species_key, transcript_id, prot_id, gene_id):
        key = (species_key, transcript_id or transcript_from_prot(prot_id), prot_id or "")
        if key in self.rows and gene_id:
            self.rows[key]["gene_id"] = gene_id

    def __len__(self):
        return len(self.rows)


def scan_annotation_text(text):
    """Match a blob of annotation text against every target. -> {target: [(kind, hit)]}"""
    out = {}
    if not text or text == ".":
        return out
    ecs = set(EC_RE.findall(text))
    pfams = set(PFAM_ACC_RE.findall(text))
    for target in TARGETS:
        reasons = []
        for ec in TARGET_EC[target]:
            if ec in ecs:
                reasons.append(("EC", ec))
        for ec in RELATED_EC[target]:
            if ec in ecs:
                reasons.append(("EC_related", ec))
        for acc, name in TARGET_PFAM[target].items():
            if acc in pfams:
                reasons.append(("Pfam", "{} ({})".format(acc, name)))
        m = TARGET_PFAM_NAME[target].search(text)
        if m:
            reasons.append(("PfamName", m.group(0)))
        m = TARGET_DESC[target].search(text)
        if m:
            reasons.append(("Description", m.group(0)[:80]))
        m = TARGET_SPROT_ENTRY[target].search(text)
        if m:
            reasons.append(("SwissProt", m.group(0)))
        if reasons:
            # de-duplicate while preserving order
            seen, uniq = set(), []
            for r in reasons:
                if r not in seen:
                    seen.add(r)
                    uniq.append(r)
            out[target] = uniq
    return out


def scan_decoys(text):
    out = {}
    if not text:
        return out
    for target in TARGETS:
        m = DECOY_PATTERNS[target].search(text)
        if m:
            out[target] = m.group(0)[:60]
    return out


# --------------------------------------------------------------------------- #
# STEP 2, Method A -- functional annotation filtering
# --------------------------------------------------------------------------- #

# Cheap byte-level pre-filter. Any line that can possibly satisfy
# scan_annotation_text() must contain at least one of these markers, so lines
# without one are skipped before the (expensive) decode + 60-way column split.
# This is a strict superset of the positive patterns -- widen it whenever a
# TARGET_* pattern is widened.
PREFILTER_MARKERS = tuple(m.encode() for m in (
    "dahp", "deoxyheptonate", "heptulosonate", "arogenate", "prephenate",
    "tyra", "arof", "arog", "pdh_n", "pdh_c",
    "pf01474", "pf00793", "pf02153", "pf20463", "pf26213",
    "2.5.1.54", "4.1.2.15", "1.3.1.78", "1.3.1.79", "1.3.1.12",
    "1.3.1.13", "1.3.1.43",
))


def prefilter(raw_line):
    low = raw_line.lower()
    return any(marker in low for marker in PREFILTER_MARKERS)


def parse_sprot_hit(field):
    """Trinotate sprot_Top_BLAST[PX]_hit -> (entry, percent identity, lineage).

    Format: ENTRY^ENTRY^Q:a-b,H:c-d^NN.N%ID^E:x^RecName: Full=...;^<lineage>,
    with multiple hits separated by a backtick. The trailing lineage is what
    lets us tell a genuine plant transcript from a contaminant contig.
    """
    if not field or field == ".":
        return "", None, ""
    parts = field.split("`")[0].split("^")
    entry = parts[0].strip() if parts else ""
    pident = None
    lineage = ""
    for chunk in parts:
        m = re.match(r"^([\d.]+)%ID$", chunk.strip())
        if m:
            try:
                pident = float(m.group(1))
            except ValueError:
                pident = None
    if len(parts) >= 2 and ";" in parts[-1]:
        lineage = parts[-1].strip()
    return entry, pident, lineage


# EggNM.EC is deliberately absent: EggNOG-mapper reports the EC numbers of the
# whole orthogroup, so it is parsed separately (see mine_trinotate) and a long
# mixed list is recorded as orthogroup-level rather than a per-protein EC.
TRINOTATE_SCAN_COLS = [
    "sprot_Top_BLASTX_hit", "sprot_Top_BLASTP_hit", "Pfam", "eggnog", "Kegg",
    "EggNM.Description", "EggNM.Preferred_name", "EggNM.PFAMs",
    "EggNM.KEGG_ko", "EggNM.KEGG_Reaction", "EggNM.BRITE",
]


def ec_evidence_from_list(ec_field):
    """-> {target: (kind, detail)} for a comma-separated EggNOG-style EC list."""
    values = [e.strip() for e in (ec_field or "").split(",")
              if re.fullmatch(r"\d+\.\d+\.\d+\.\d+", e.strip())]
    out = {}
    if not values:
        return out
    distinct = len(set(values))
    for target in TARGETS:
        hits = [e for e in values if e in TARGET_EC[target]]
        if not hits:
            continue
        if distinct <= 2:
            out[target] = ("EC", ", ".join(sorted(set(hits))))
        else:
            out[target] = ("EC_orthogroup", "{} (of {} EC numbers in the "
                                            "orthogroup)".format(
                                                ", ".join(sorted(set(hits))), distinct))
    return out


def mine_trinotate(path, store, species_filter=None, seq_cache=None):
    """Scan the per-species Trinotate reports (Method A, primary source)."""
    log("Method A / Trinotate reports: {}".format(os.path.basename(path)))
    n_rows = n_hits = n_species = 0
    for member, fh in iter_tar_members(path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        n_species += 1
        header = fh.readline().decode("utf-8", "replace").rstrip("\n").split("\t")
        header[0] = header[0].lstrip("#")
        idx = {name: i for i, name in enumerate(header)}
        scan_idx = [idx[c] for c in TRINOTATE_SCAN_COLS if c in idx]
        if not scan_idx:
            log("  {}: no recognised annotation columns -- skipped".format(species),
                level="WARN")
            continue
        i_gene = idx.get("gene_id", 0)
        i_tx = idx.get("transcript_id", 1)
        i_bp = idx.get("sprot_Top_BLASTP_hit")
        i_bx = idx.get("sprot_Top_BLASTX_hit")
        i_ec = idx.get("EggNM.EC")
        i_prot = idx.get("prot_id")
        i_coords = idx.get("prot_coords")
        # last two columns are the transcript and peptide sequences
        i_txseq = len(header) - 2
        i_pepseq = len(header) - 1
        sp_rows = sp_hits = 0
        for raw in fh:
            sp_rows += 1
            if not prefilter(raw):
                continue
            fields = raw.decode("utf-8", "replace").rstrip("\n").split("\t")
            if len(fields) < len(header) - 2:
                continue
            blob = " ".join(fields[i] for i in scan_idx if i < len(fields))
            if blob.strip(" .") == "":
                continue
            found = scan_annotation_text(blob)
            if i_ec is not None and i_ec < len(fields):
                for target, reason in ec_evidence_from_list(fields[i_ec]).items():
                    found.setdefault(target, []).append(reason)
            if not found:
                continue
            decoys = scan_decoys(blob)
            gene_id = fields[i_gene] if i_gene < len(fields) else ""
            tx_id = fields[i_tx] if i_tx < len(fields) else ""
            prot_id = ""
            if i_prot is not None and i_prot < len(fields) and fields[i_prot] != ".":
                prot_id = fields[i_prot]
            coords = ""
            if i_coords is not None and i_coords < len(fields) and fields[i_coords] != ".":
                coords = fields[i_coords]
            sprot_entry, sprot_pident, sprot_lineage = "", None, ""
            for col in (i_bp, i_bx):
                if col is not None and col < len(fields):
                    e, pid_, lin = parse_sprot_hit(fields[col])
                    if lin:
                        sprot_entry, sprot_pident, sprot_lineage = e, pid_, lin
                        break
            for target, reasons in found.items():
                store.add(species, tx_id, prot_id, target, "A", "trinotate", reasons,
                          extra={"prot_coords": coords,
                                 "sprot_entry": sprot_entry,
                                 "sprot_pident": sprot_pident,
                                 "sprot_lineage": sprot_lineage})
                if target in decoys:
                    store.add_decoy(species, tx_id, prot_id, target, "trinotate",
                                    decoys[target])
            store.set_gene(species, tx_id, prot_id, gene_id)
            if seq_cache is not None:
                tseq = fields[i_txseq] if i_txseq < len(fields) else "."
                pseq = fields[i_pepseq] if i_pepseq < len(fields) else "."
                if tseq and tseq != ".":
                    seq_cache.setdefault((species, "tx", tx_id), tseq.strip())
                if prot_id and pseq and pseq != ".":
                    seq_cache.setdefault((species, "pep", prot_id), pseq.strip().rstrip("*"))
            sp_hits += 1
        n_rows += sp_rows
        n_hits += sp_hits
        log("  {:38s} {:>9s} rows  {:>4d} annotation hits".format(
            species, fmt_int(sp_rows), sp_hits))
    log("Trinotate: {} species, {} rows scanned, {} annotation-level hits".format(
        n_species, fmt_int(n_rows), n_hits))


def load_pfam_gathering_cutoffs(hmm_paths):
    """Pfam curated gathering (GA) bit-score thresholds, keyed by accession+name.

    The hmmscan --domtblout tables shipped with AmarylOmicBase are unfiltered --
    they contain every reported row, including E-values around 0.1. Applying the
    family's own GA cutoff is the standard Pfam way to decide membership and is
    exactly what `hmmscan --cut_ga` would have done.
    """
    cutoffs = {}
    try:
        from pyhmmer.plan7 import HMMFile
    except ImportError:
        return cutoffs
    for paths in hmm_paths.values():
        for path in paths:
            try:
                with HMMFile(path) as hf:
                    for hmm in hf:
                        ga = hmm.cutoffs.gathering
                        if not ga:
                            continue
                        acc = _txt(hmm.accession).split(".")[0]
                        name = _txt(hmm.name)
                        if acc:
                            cutoffs[acc] = (float(ga[0]), float(ga[1]))
                        if name:
                            cutoffs[name.lower()] = (float(ga[0]), float(ga[1]))
            except Exception as exc:                      # noqa: BLE001
                log("  could not read GA cutoff from {}: {}".format(path, exc),
                    level="WARN")
    return cutoffs


def mine_hmmscan(path, store, species_filter=None, ga_cutoffs=None,
                 fallback_evalue=1e-5):
    """Scan the hmmscan --domtblout Pfam-A tables (Method A).

    Rows are kept only when they clear the family's Pfam gathering threshold
    (or, when no GA cutoff is available, a strict E-value cutoff).
    """
    ga_cutoffs = ga_cutoffs or {}
    log("Method A / hmmscan Pfam-A domain tables: {}".format(os.path.basename(path)))
    log("  significance filter: Pfam GA bit-score cutoffs for {} families"
        " (fallback E <= {:g})".format(len(ga_cutoffs) // 2 or 0, fallback_evalue))
    wanted_acc = {}
    wanted_name = {}
    for target in TARGETS:
        for acc, name in TARGET_PFAM[target].items():
            wanted_acc[acc] = (target, acc, name)
            wanted_name[name.lower()] = (target, acc, name)
    # tolerate historical Pfam family names
    for alias, acc in (("prephenate_dh", "PF02153"), ("pdh", "PF02153"),
                       ("pdh_n", "PF02153"), ("pdh_c", "PF20463")):
        if acc in wanted_acc:
            wanted_name[alias] = wanted_acc[acc]
    n_hits, n_below = 0, 0
    for member, fh in iter_tar_members(path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        sp_hits = 0
        for raw in fh:
            line = raw.decode("utf-8", "replace")
            if line.startswith("#"):
                continue
            f = line.split(None, 22)
            if len(f) < 22:
                continue
            fam_name, fam_acc_v, tlen, prot_id = f[0], f[1], f[2], f[3]
            fam_acc = fam_acc_v.split(".")[0]
            hit = wanted_acc.get(fam_acc) or wanted_name.get(fam_name.lower())
            if hit is None:
                continue
            target, acc, canonical = hit
            try:
                full_e = float(f[6]); full_score = float(f[7])
                i_eval = float(f[12]); dom_score = float(f[13])
                hmm_from, hmm_to = int(f[15]), int(f[16])
                hmm_len = int(tlen)
                qlen = int(f[5])
                env_from, env_to = int(f[19]), int(f[20])
            except ValueError:
                continue
            ga = ga_cutoffs.get(acc) or ga_cutoffs.get(fam_name.lower())
            if ga is not None:
                if full_score < ga[0] or dom_score < ga[1]:
                    n_below += 1
                    continue
            elif full_e > fallback_evalue:
                n_below += 1
                continue
            hmm_cov = (hmm_to - hmm_from + 1) / float(hmm_len) if hmm_len else 0.0
            tx_id = transcript_from_prot(prot_id)
            store.add(species, tx_id, prot_id, target, "A", "hmmscan_pfam",
                      [("Pfam", "{} ({})".format(acc, canonical))],
                      extra={"pfam_acc": acc, "pfam_name": canonical,
                             "evalue": full_e, "score": full_score,
                             "dom_ievalue": i_eval, "dom_score": dom_score,
                             "hmm_coverage": round(hmm_cov, 3),
                             "query_len": qlen,
                             "env": "{}-{}".format(env_from, env_to)})
            sp_hits += 1
        n_hits += sp_hits
        if sp_hits:
            log("  {:38s} {:>4d} target-Pfam domain rows".format(species, sp_hits))
    log("hmmscan/Pfam-A: {} target-family domain rows kept, {} discarded below "
        "the Pfam significance threshold".format(n_hits, n_below))


def mine_eggnog(path, store, species_filter=None):
    """Scan the EggNOG-mapper annotation tables (Method A)."""
    log("Method A / EggNOG-mapper tables: {}".format(os.path.basename(path)))
    n_hits = 0
    for member, fh in iter_tar_members(path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        idx, sp_hits = None, 0
        for raw in fh:
            line = raw.decode("utf-8", "replace").rstrip("\n")
            if line.startswith("##"):
                continue
            if line.startswith("#query"):
                cols = line.lstrip("#").split("\t")
                idx = {c.strip(): i for i, c in enumerate(cols)}
                continue
            if not line or idx is None:
                continue
            if not prefilter(line.encode("utf-8", "replace")):
                continue
            f = line.split("\t")
            # The EC column is handled separately below: EggNOG-mapper reports
            # the EC numbers of the whole orthogroup, so a long mixed list is
            # not a per-protein assignment and must not carry full EC weight.
            scan_cols = ["Description", "Preferred_name", "PFAMs",
                         "KEGG_ko", "KEGG_Reaction", "eggNOG_OGs", "BRITE"]
            blob = " ".join(f[idx[c]] for c in scan_cols
                            if c in idx and idx[c] < len(f))
            found = scan_annotation_text(blob)
            ec_field = f[idx["EC"]] if "EC" in idx and idx["EC"] < len(f) else ""
            ec_values = [e.strip() for e in ec_field.split(",")
                         if re.fullmatch(r"\d+\.\d+\.\d+\.\d+", e.strip())]
            for target in TARGETS:
                hits = [e for e in ec_values if e in TARGET_EC[target]]
                if not hits:
                    continue
                kind = "EC" if len(set(ec_values)) <= 2 else "EC_orthogroup"
                found.setdefault(target, []).append(
                    (kind, "{} (of {} EC numbers)".format(
                        ", ".join(hits), len(set(ec_values)))
                     if kind == "EC_orthogroup" else ", ".join(hits)))
            if not found:
                continue
            decoys = scan_decoys(blob)
            prot_id = f[0]
            tx_id = transcript_from_prot(prot_id)
            for target, reasons in found.items():
                store.add(species, tx_id, prot_id, target, "A", "eggnog", reasons,
                          extra={"eggnog_ec": ec_field,
                                 "eggnog_n_ec": len(set(ec_values))})
                if target in decoys:
                    store.add_decoy(species, tx_id, prot_id, target, "eggnog",
                                    decoys[target])
            sp_hits += 1
        n_hits += sp_hits
        if sp_hits:
            log("  {:38s} {:>4d} EggNOG hits".format(species, sp_hits))
    log("EggNOG-mapper: {} annotation hits".format(n_hits))


def mine_blastp(path, store, reference_entries, species_filter=None):
    """Scan the BLASTp-vs-Swiss-Prot outfmt6 tables (Method A)."""
    log("Method A / BLASTp vs Swiss-Prot: {}".format(os.path.basename(path)))
    entry_to_target = {}
    for target, entries in reference_entries.items():
        for e in entries:
            entry_to_target[e.upper()] = target
    n_hits = 0
    per_species = {}
    for member, fh in iter_tar_members(path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        sp_hits, n_rows_sp = 0, 0
        for raw in fh:
            n_rows_sp += 1
            f = raw.decode("utf-8", "replace").rstrip("\n").split("\t")
            if len(f) < 12:
                continue
            prot_id, sseqid = f[0], f[1]
            target = entry_to_target.get(sseqid.upper())
            reason_kind = "SwissProtRef"
            if target is None:
                for t in TARGETS:
                    if TARGET_SPROT_ENTRY[t].search(sseqid):
                        target, reason_kind = t, "SwissProtPattern"
                        break
            if target is None:
                continue
            try:
                pident = float(f[2]); alen = int(f[3])
                evalue = float(f[10]); bits = float(f[11])
            except ValueError:
                continue
            tx_id = transcript_from_prot(prot_id)
            store.add(species, tx_id, prot_id, target, "A", "blastp_swissprot",
                      [(reason_kind, sseqid)],
                      extra={"sprot_hit": sseqid, "pident": pident,
                             "aln_len": alen, "evalue": evalue, "bitscore": bits})
            sp_hits += 1
        n_hits += sp_hits
        per_species[species] = (sp_hits, n_rows_sp)
        log("  {:38s} {:>4d} target hits from {:>10s} BLASTp rows".format(
            species, sp_hits, fmt_int(n_rows_sp)))
    sizes = sorted(v[1] for v in per_species.values())
    if sizes:
        median = sizes[len(sizes) // 2]
        for species, (sp_hits, n_rows_sp) in sorted(per_species.items()):
            if median and n_rows_sp < median / 10:
                log("  {} has only {} BLASTp rows vs a median of {} -- the "
                    "upstream table looks truncated".format(
                        species, fmt_int(n_rows_sp), fmt_int(median)), level="WARN")
    log("BLASTp/Swiss-Prot: {} hits to target-family entries".format(n_hits))


# --------------------------------------------------------------------------- #
# STEP 2, Method B -- sequence homology (pyhmmer / HMMER3, in-process)
# --------------------------------------------------------------------------- #

# Canonical plant references, used verbatim if the UniProt REST query fails.
FALLBACK_REFERENCE_ACCESSIONS = {
    DAHP: ["P29976", "Q00218", "P21357", "P37822", "P37215", "P37216",
           "P27608", "Q75LR2", "Q75W16", "A0MH68", "A0A067XGX8", "A0A067XH53"],
    ADH: ["Q944B6", "Q9LMR3"],
}

MAX_REFERENCE_QUERIES = 20

# The canonical plant references. These are always used as homology queries and
# are never dropped by MAX_REFERENCE_QUERIES. Arabidopsis DHS3 (At1g22410,
# Q9SK84) is not a reviewed Swiss-Prot entry, so an `ec: AND reviewed:true`
# query alone would silently omit it.
CANONICAL_ACCESSIONS = {
    DAHP: ["P29976",   # DHS1 / AROF_ARATH, At4g39980
           "Q00218",   # DHS2 / AROG_ARATH, At4g33510
           "Q9SK84"],  # DHS3, At1g22410 (unreviewed)
    ADH: ["Q944B6",    # TyrA1 / TYRA1_ARATH, At5g34930
          "Q9LMR3"],   # TyrA2 / TYRA2_ARATH, At1g15710
}

UNIPROT_QUERIES = {
    DAHP: [" OR ".join("accession:{}".format(x) for x in CANONICAL_ACCESSIONS[DAHP]),
           "(ec:2.5.1.54) AND (reviewed:true) AND (taxonomy_id:33090)",
           "(ec:4.1.2.15) AND (reviewed:true) AND (taxonomy_id:33090)"],
    ADH: [" OR ".join("accession:{}".format(x) for x in CANONICAL_ACCESSIONS[ADH]),
          "(ec:1.3.1.78) AND (reviewed:true) AND (taxonomy_id:33090)",
          "(protein_name:\"arogenate dehydrogenase\") AND (reviewed:true) "
          "AND (taxonomy_id:33090)",
          "(protein_name:\"arogenate dehydrogenase\") AND (taxonomy_id:4447) "
          "AND (length:[250 TO 800]) AND (existence:1 OR existence:2)"],
}


def _parse_fasta_text(text):
    out, name, chunks = [], None, []
    for line in (text or "").splitlines():
        if line.startswith(">"):
            if name:
                out.append((name, "".join(chunks)))
            name, chunks = line[1:], []
        elif line.strip():
            chunks.append(line.strip())
    if name:
        out.append((name, "".join(chunks)))
    return out


def fetch_reference_proteins(workdir, offline=False):
    """Swiss-Prot/UniProt plant reference proteins for both targets.

    Returns (references, entry_names) where references maps target -> list of
    (entry_name, accession, description, sequence).
    """
    log("-" * 78)
    log("Method B / fetching reference sequences from UniProt")
    cache = os.path.join(workdir, "references")
    os.makedirs(cache, exist_ok=True)
    references, entry_names = {}, {}
    for target in TARGETS:
        path = os.path.join(cache, "{}.fasta".format(
            target.lower().replace(" ", "_")))
        text = None
        if os.path.exists(path) and os.path.getsize(path) > 0:
            with open(path) as fh:
                text = fh.read()
            log("  cached references for {}".format(target))
        elif not offline:
            parts = []
            for query in UNIPROT_QUERIES[target]:
                got = http_get(UNIPROT_SEARCH,
                               {"query": query, "format": "fasta", "size": 100})
                if got:
                    parts.append(got)
            text = "\n".join(p for p in parts if p.strip())
            if not (text or "").strip():
                log("  UniProt query returned nothing for {} -- using accession "
                    "fallback".format(target), level="WARN")
                accs = FALLBACK_REFERENCE_ACCESSIONS[target]
                got = http_get(UNIPROT_SEARCH, {
                    "query": " OR ".join("accession:{}".format(a) for a in accs),
                    "format": "fasta", "size": 100})
                text = got or ""
            if text.strip():
                with open(path, "w") as fh:
                    fh.write(text)
        if not (text or "").strip():
            log("  no reference sequences available for {}".format(target),
                level="ERROR")
            references[target], entry_names[target] = [], set()
            continue
        recs, names = [], set()
        seen = set()
        for header, seq in _parse_fasta_text(text):
            parts = header.split("|")
            db = parts[0] if len(parts) > 2 else ""
            acc = parts[1] if len(parts) > 2 else header.split()[0]
            rest = parts[2] if len(parts) > 2 else header
            entry = rest.split()[0]
            desc = rest[len(entry):].strip()
            if acc in seen:
                continue
            seen.add(acc)
            rank = 0 if acc in CANONICAL_ACCESSIONS.get(target, []) else (
                1 if db == "sp" else 2)
            recs.append((entry, acc, desc, seq, rank))
            names.add(entry)
        # Canonical references first, then Swiss-Prot, then TrEMBL; cap the query
        # set so phmmer stays fast. Family-level sensitivity comes from the Pfam
        # HMMs, not from the number of query sequences.
        recs.sort(key=lambda r: (r[4], r[0]))
        dropped = max(0, len(recs) - MAX_REFERENCE_QUERIES)
        kept = [(e, a, d, s_) for (e, a, d, s_, _r) in recs[:MAX_REFERENCE_QUERIES]]
        references[target] = kept
        entry_names[target] = names          # full set, used for BLASTp lookup
        log("  {}: {} reference proteins used as phmmer queries{} ({})".format(
            target, len(kept),
            " -- {} further TrEMBL homologs kept for annotation lookup only"
            .format(dropped) if dropped else "",
            ", ".join(e for e, _a, _d, _s in kept[:8]) +
            (" ..." if len(kept) > 8 else "")))
    return references, entry_names


def fetch_pfam_hmms(workdir, offline=False):
    """Download the real Pfam-A HMMs for the target families from InterPro."""
    log("Method B / fetching Pfam HMM profiles")
    cache = os.path.join(workdir, "references", "hmm")
    os.makedirs(cache, exist_ok=True)
    per_target = {}
    for target, accs in PFAM_FOR_HMMSEARCH.items():
        paths = []
        for acc in accs:
            path = os.path.join(cache, "{}.hmm".format(acc))
            if not (os.path.exists(path) and os.path.getsize(path) > 0):
                if offline:
                    log("  missing HMM {} (offline)".format(acc), level="WARN")
                    continue
                blob = http_get(INTERPRO_HMM.format(acc=acc), binary=True)
                if not blob:
                    log("  could not fetch HMM {}".format(acc), level="WARN")
                    continue
                try:
                    blob = gzip.decompress(blob)
                except (OSError, EOFError):
                    pass
                with open(path, "wb") as fh:
                    fh.write(blob)
            paths.append(path)
        per_target[target] = paths
        log("  {}: {} HMM profiles".format(target, len(paths)))
    return per_target


def _txt(value):
    """pyhmmer returns bytes on some builds and str on others."""
    if value is None:
        return ""
    return value.decode("utf-8", "replace") if isinstance(value, bytes) else str(value)


_AA_OK = set("ACDEFGHIKLMNPQRSTVWYBZXUO")


def sanitize_peptide(seq):
    seq = (seq or "").upper().replace("*", "").replace("-", "").replace(".", "")
    if not seq:
        return ""
    return "".join(c if c in _AA_OK else "X" for c in seq)


def _envelope_coverage(hit, on_query=True):
    """Fraction of the query profile (or of the target) covered by all domains."""
    spans, length = [], 0
    for dom in hit.domains:
        aln = dom.alignment
        if on_query:
            spans.append((aln.hmm_from, aln.hmm_to))
            length = aln.hmm_length or length
        else:
            spans.append((aln.target_from, aln.target_to))
            length = aln.target_length or length
    if not spans or not length:
        return 0.0
    spans.sort()
    merged, cur_s, cur_e = 0, spans[0][0], spans[0][1]
    for s, e in spans[1:]:
        if s <= cur_e + 1:
            cur_e = max(cur_e, e)
        else:
            merged += cur_e - cur_s + 1
            cur_s, cur_e = s, e
    merged += cur_e - cur_s + 1
    return min(1.0, merged / float(length))


def method_b_homology(proteome_path, references, hmm_paths, store, seq_cache,
                      evalue=1e-10, min_coverage=0.5, threads=0,
                      species_filter=None, peptide_lengths=None):
    """phmmer (reference proteins) + hmmsearch (Pfam HMMs) over every proteome."""
    try:
        import pyhmmer
        from pyhmmer.easel import Alphabet, TextSequence, DigitalSequenceBlock
        from pyhmmer.plan7 import HMMFile
    except ImportError:
        log("pyhmmer is not installed -- Method B (homology) is SKIPPED. "
            "Install it with `pip install pyhmmer`.", level="ERROR")
        return {"skipped": True}

    log("-" * 78)
    log("Method B / HMMER3 homology search over predicted proteomes "
        "(E <= {:g}, coverage >= {:.0%})".format(evalue, min_coverage))
    abc = Alphabet.amino()

    queries = {}
    for target, recs in references.items():
        digital = []
        for entry, acc, desc, seq in recs:
            pep = sanitize_peptide(seq)
            if len(pep) < 50:
                continue
            digital.append(TextSequence(
                name="{}|{}".format(acc, entry).encode(),
                description=desc.encode("utf-8", "replace"),
                sequence=pep).digitize(abc))
        queries[target] = digital

    hmms = {}
    for target, paths in hmm_paths.items():
        loaded = []
        for path in paths:
            try:
                with HMMFile(path) as hf:
                    loaded.extend(list(hf))
            except Exception as exc:                      # noqa: BLE001
                log("  could not load HMM {}: {}".format(path, exc), level="WARN")
        hmms[target] = loaded

    stats = {"phmmer": 0, "hmmsearch": 0, "species": 0, "skipped": False}
    for member, fh in iter_tar_members(proteome_path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        seqs, raw_by_id = [], {}
        for header, seq in fasta_stream(fh):
            pid = header.split()[0]
            pep = sanitize_peptide(seq)
            if not pep:
                continue
            raw_by_id[pid] = (header, seq.rstrip("*"))
            seqs.append(TextSequence(name=pid.encode(), sequence=pep).digitize(abc))
        if not seqs:
            continue
        stats["species"] += 1
        block = DigitalSequenceBlock(abc, seqs)
        sp_new = 0

        for target, qs in queries.items():
            if not qs:
                continue
            try:
                results = pyhmmer.hmmer.phmmer(qs, block, cpus=threads, E=evalue)
            except Exception as exc:                      # noqa: BLE001
                log("  phmmer failed for {} / {}: {}".format(species, target, exc),
                    level="WARN")
                continue
            for tophits in results:
                qname = _txt(tophits.query.name)
                for hit in tophits:
                    if hit.evalue > evalue:
                        continue
                    qcov = _envelope_coverage(hit, on_query=True)
                    tcov = _envelope_coverage(hit, on_query=False)
                    if qcov < min_coverage and tcov < min_coverage:
                        continue
                    pid = _txt(hit.name)
                    tx_id = transcript_from_prot(pid)
                    store.add(species, tx_id, pid, target, "B", "phmmer",
                              [("Homology", "{} (E={:.2g}, qcov={:.0%})".format(
                                  qname, hit.evalue, qcov))],
                              extra={"query": qname, "evalue": float(hit.evalue),
                                     "score": float(hit.score),
                                     "query_coverage": round(qcov, 3),
                                     "target_coverage": round(tcov, 3)})
                    stats["phmmer"] += 1
                    sp_new += 1

        for target, profiles in hmms.items():
            if not profiles:
                continue
            for bit_cutoffs in ("gathering", None):
                try:
                    kwargs = {"cpus": threads}
                    if bit_cutoffs:
                        kwargs["bit_cutoffs"] = bit_cutoffs
                    else:
                        kwargs["E"] = evalue
                    results = list(pyhmmer.hmmer.hmmsearch(profiles, block, **kwargs))
                    break
                except Exception as exc:                  # noqa: BLE001
                    if bit_cutoffs is None:
                        log("  hmmsearch failed for {} / {}: {}".format(
                            species, target, exc), level="WARN")
                        results = []
                    continue
            for tophits in results:
                hname = _txt(tophits.query.name)
                hacc = _txt(tophits.query.accession).split(".")[0]
                for hit in tophits:
                    hcov = _envelope_coverage(hit, on_query=True)
                    pid = _txt(hit.name)
                    tx_id = transcript_from_prot(pid)
                    store.add(species, tx_id, pid, target, "B", "hmmsearch_pfam",
                              [("PfamHMM", "{} {} (E={:.2g}, cov={:.0%})".format(
                                  hacc or "", hname, hit.evalue, hcov))],
                              extra={"pfam_acc": hacc, "pfam_name": hname,
                                     "evalue": float(hit.evalue),
                                     "score": float(hit.score),
                                     "hmm_coverage": round(hcov, 3)})
                    stats["hmmsearch"] += 1
                    sp_new += 1

        # cache peptide sequences for every sequence that is now a candidate
        for key, rec in list(store.rows.items()):
            if key[0] != species:
                continue
            pid = rec["prot_id"]
            if pid and pid in raw_by_id:
                header, pep = raw_by_id[pid]
                # the proteome FASTA is authoritative for both the sequence and
                # the ORF type / coordinates carried in its header
                seq_cache[(species, "pep", pid)] = pep
                seq_cache[(species, "pephdr", pid)] = header
        if peptide_lengths is not None:
            peptide_lengths[species] = len(raw_by_id)
        log("  {:38s} {:>7s} peptides scanned, {:>4d} homology hits".format(
            species, fmt_int(len(seqs)), sp_new))

    log("Method B: {} species, {} phmmer hits, {} Pfam-HMM hits".format(
        stats["species"], stats["phmmer"], stats["hmmsearch"]))
    return stats


def six_frame_peptides(nt, min_aa):
    """Yield (frame, index, peptide) for every stop-free stretch >= min_aa."""
    nt = nt.upper()
    for strand, seq in (("+", nt), ("-", revcomp(nt))):
        for frame in range(3):
            aa = translate_cds(seq[frame:])
            if len(aa) < min_aa:
                continue
            start = 0
            for piece in aa.split("*"):
                if len(piece) >= min_aa:
                    yield ("{}{}".format(strand, frame + 1), start, piece)
                start += len(piece) + 1


def method_b_transcript_sweep(transcriptome_path, hmm_paths, store, seq_cache,
                              threads=0, species_filter=None, min_orf_aa=60,
                              batch_size=40000):
    """Six-frame HMM sweep of the nucleotide assemblies.

    Methods A and B both key on TransDecoder peptides, so a transcript with no
    predicted ORF -- or one predicted in the wrong frame -- is invisible to
    them. This stage translates every unitig in all six frames and runs the
    same Pfam profiles at their gathering thresholds, so an ORF-less transcript
    carrying a genuine target domain is still recovered.
    """
    try:
        import pyhmmer
        from pyhmmer.easel import Alphabet, TextSequence, DigitalSequenceBlock
        from pyhmmer.plan7 import HMMFile
    except ImportError:
        log("pyhmmer missing -- six-frame assembly sweep SKIPPED", level="ERROR")
        return {"skipped": True}

    log("-" * 78)
    log("Method B / six-frame Pfam sweep of the nucleotide assemblies "
        "(ORFs >= {} aa, Pfam gathering thresholds)".format(min_orf_aa))
    abc = Alphabet.amino()
    profiles, profile_target = [], {}
    for target, paths in hmm_paths.items():
        for path in paths:
            try:
                with HMMFile(path) as hf:
                    for hmm in hf:
                        profiles.append(hmm)
                        profile_target[_txt(hmm.name)] = target
            except Exception as exc:                      # noqa: BLE001
                log("  could not load {}: {}".format(path, exc), level="WARN")
    if not profiles:
        return {"skipped": True}

    stats = {"species": 0, "hits": 0, "new_transcripts": 0, "fragments": 0}
    for member, fh in iter_tar_members(transcriptome_path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        stats["species"] += 1
        covered = store.transcripts_for(species)
        best = {}          # tx -> (target, score, evalue, peptide, profile)
        pending, names, n_frag, n_tx = [], [], 0, 0

        def flush(pending, names):
            if not pending:
                return
            block = DigitalSequenceBlock(abc, pending)
            for tophits in pyhmmer.hmmer.hmmsearch(
                    profiles, block, cpus=threads, bit_cutoffs="gathering"):
                pname = _txt(tophits.query.name)
                pacc = _txt(tophits.query.accession).split(".")[0]
                target = profile_target.get(pname)
                if target is None:
                    continue
                for hit in tophits:
                    label = _txt(hit.name)
                    tx_id, _, rest = label.partition("\x01")
                    prev = best.get(tx_id)
                    if prev is None or hit.score > prev[1]:
                        best[tx_id] = (target, float(hit.score), float(hit.evalue),
                                       names[int(rest)] if rest.isdigit() else "",
                                       "{} {}".format(pacc, pname))

        for header, seq in fasta_stream(fh):
            tx_id = header.split()[0]
            n_tx += 1
            if tx_id in covered:
                continue          # already found at the peptide level
            for frame, _off, pep in six_frame_peptides(seq, min_orf_aa):
                names.append(pep)
                pending.append(TextSequence(
                    name="{}\x01{}".format(tx_id, len(names) - 1).encode(),
                    sequence=sanitize_peptide(pep)).digitize(abc))
                n_frag += 1
                if len(pending) >= batch_size:
                    flush(pending, names)
                    pending = []
        flush(pending, names)
        stats["fragments"] += n_frag

        added = 0
        for tx_id, (target, score, ev, pep, profile) in best.items():
            store.add(species, tx_id, "", target, "B", "sixframe_pfam",
                      [("PfamHMM", "{} (six-frame, score={:.1f}, E={:.2g})".format(
                          profile, score, ev))],
                      extra={"pfam_acc": profile.split()[0], "evalue": ev,
                             "score": score, "sixframe": True})
            if pep:
                seq_cache.setdefault((species, "sixframe_pep", tx_id), pep)
            added += 1
        stats["hits"] += added
        stats["new_transcripts"] += added
        log("  {:38s} {:>9s} unitigs, {:>10s} ORF fragments, {:>3d} ORF-less "
            "transcripts recovered".format(species, fmt_int(n_tx),
                                           fmt_int(n_frag), added))
    log("six-frame sweep: {} species, {} transcripts recovered that carry a "
        "target domain but no predicted ORF".format(
            stats["species"], stats["new_transcripts"]))
    return stats


# --------------------------------------------------------------------------- #
# STEP 3 -- expression matrices + sample metadata
# --------------------------------------------------------------------------- #

ENA_FIELDS = ",".join([
    "run_accession", "sample_accession", "secondary_sample_accession",
    "experiment_accession", "study_accession", "scientific_name", "tax_id",
    "sample_title", "sample_alias", "description", "sample_description",
    "tissue_type", "tissue_lib", "dev_stage", "cell_type", "cultivar",
    "isolate", "strain", "age", "host_growth_conditions", "environmental_medium",
    "experiment_title", "study_title", "library_strategy", "library_source",
    "instrument_platform", "first_public",
])


def classify(text, patterns, default):
    """First matching label wins, so the pattern lists are ordered specific-first.

    The text is lower-cased, and matching is case-insensitive so that patterns
    written with the conventional capitalisation (\bCK\b, \bABA\b, \bLED\b,
    \bDAP\b) still match.
    """
    if not text:
        return default
    low = text.lower()
    for label, rx in patterns:
        if re.search(rx, low, re.IGNORECASE):
            return label
    return default


def classify_tissue(text):
    return classify(text, TISSUE_PATTERNS, "Unspecified")


def classify_condition(text):
    return classify(text, CONDITION_PATTERNS, "Unspecified")


def fetch_run_metadata(run_ids, workdir, offline=False):
    """Run + sample metadata from ENA for every Kallisto column accession."""
    log("-" * 78)
    log("STEP 3 -- sample metadata for {} sequencing runs".format(len(run_ids)))
    cache_path = os.path.join(workdir, "run_metadata.json")
    meta = {}
    if os.path.exists(cache_path):
        try:
            with open(cache_path) as fh:
                meta = json.load(fh)
            log("  loaded {} cached run records".format(len(meta)))
        except (json.JSONDecodeError, OSError):
            meta = {}

    missing = [r for r in sorted(run_ids) if r not in meta]
    if missing and not offline:
        log("  querying ENA for {} runs".format(len(missing)))
        for i in range(0, len(missing), 40):
            chunk = missing[i:i + 40]
            query = " OR ".join('run_accession="{}"'.format(r) for r in chunk)
            tsv = http_get(ENA_SEARCH, {
                "result": "read_run", "query": query,
                "fields": ENA_FIELDS, "format": "tsv", "limit": 0})
            if not tsv:
                continue
            lines = tsv.rstrip("\n").split("\n")
            if len(lines) < 2:
                continue
            header = lines[0].split("\t")
            for line in lines[1:]:
                vals = line.split("\t")
                rec = {header[j]: (vals[j] if j < len(vals) else "")
                       for j in range(len(header))}
                acc = rec.get("run_accession")
                if acc:
                    meta[acc] = rec
            log("    {}/{} runs resolved".format(min(i + 40, len(missing)), len(missing)))
        # enrich with the full sample attribute set
        samples = sorted({m.get("sample_accession") for m in meta.values()
                          if m.get("sample_accession")
                          and not m.get("_attrs_fetched")})
        if samples:
            log("  fetching sample attributes for {} biosamples".format(len(samples)))
            attrs_by_sample = {}
            for i in range(0, len(samples), 25):
                chunk = samples[i:i + 25]
                xml = http_get(ENA_XML.format(acc=",".join(chunk)))
                if not xml:
                    continue
                try:
                    root = ET.fromstring(xml)
                except ET.ParseError:
                    continue
                for sample in root.iter("SAMPLE"):
                    acc = sample.get("accession") or ""
                    bag = {}
                    title = sample.findtext("TITLE") or ""
                    if title:
                        bag["title"] = title
                    desc = sample.findtext("DESCRIPTION") or ""
                    if desc:
                        bag["description"] = desc
                    for attr in sample.iter("SAMPLE_ATTRIBUTE"):
                        tag = (attr.findtext("TAG") or "").strip()
                        val = (attr.findtext("VALUE") or "").strip()
                        if not tag or not val:
                            continue
                        if tag.lower().startswith("ena-"):
                            continue
                        if (tag.lower() in INTERESTING_TAGS
                                or len(bag) < 30):
                            bag[tag] = val
                    if acc:
                        attrs_by_sample[acc] = bag
            for rec in meta.values():
                sa = rec.get("sample_accession")
                if sa and sa in attrs_by_sample:
                    rec["sample_attributes"] = attrs_by_sample[sa]
                rec["_attrs_fetched"] = True
        try:
            with open(cache_path, "w") as fh:
                json.dump(meta, fh, indent=1, sort_keys=True)
        except OSError as exc:
            log("  could not cache run metadata: {}".format(exc), level="WARN")
    elif missing and offline:
        log("  {} runs have no cached metadata (offline)".format(len(missing)),
            level="WARN")

    resolved = 0
    for run in run_ids:
        rec = meta.get(run)
        if rec is None:
            # CNCB-NGDC GSA accessions (CRR...) are not INSDC and have no ENA
            # record; say so rather than implying the organ is simply unstated.
            source = ("unresolved: non-INSDC accession (CNCB-NGDC GSA)"
                      if run.upper().startswith("CRR")
                      else "unresolved: no ENA record")
            meta[run] = {"run_accession": run, "tissue": "Unspecified",
                         "condition": "Unspecified", "metadata_source": source,
                         "_unresolved": True}
            continue
        blob_parts = [rec.get(k, "") for k in (
            "tissue_type", "tissue_lib", "dev_stage", "cell_type", "sample_title",
            "sample_alias", "description", "sample_description", "experiment_title",
            "host_growth_conditions", "environmental_medium", "isolate", "age")]
        # Only attribute VALUES are classified. Including the tag names would
        # match on the schema rather than on the sample -- every BioSample
        # carrying an (often empty) `ecotype` or `time point` tag would
        # otherwise be classified from the tag name alone.
        attrs = rec.get("sample_attributes") or {}
        attrs_lower = {str(k).lower().strip(): str(v) for k, v in attrs.items()}
        blob_parts.extend(str(v) for v in attrs.values())
        sample_blob = " | ".join(p for p in blob_parts if p)
        display_blob = " | ".join(
            [p for p in blob_parts[:13] if p]
            + ["{}={}".format(k, v) for k, v in attrs.items()])
        study_blob = rec.get("study_title", "")
        # A field that explicitly declares the organ outranks the free text:
        # otherwise a word in an experiment title ("... bud transcriptome")
        # overrides a curated tissue field that plainly says "leave".
        declared_tissue = " | ".join(p for p in (
            [rec.get("tissue_type", ""), rec.get("tissue_lib", "")]
            + [attrs_lower.get(t, "") for t in
               ("tissue", "tissue type", "organism part", "organ",
                "plant structure", "plant_structure")]) if p)
        declared_cond = " | ".join(p for p in (
            [rec.get("dev_stage", "")]
            + [attrs_lower.get(t, "") for t in
               ("developmental stage", "development stage", "dev_stage",
                "treatment", "condition", "growth condition",
                "growth conditions")]) if p)

        rec["tissue"] = classify_tissue(declared_tissue)
        rec["tissue_source"] = "declared" if rec["tissue"] != "Unspecified" else ""
        for fallback, label in ((sample_blob, "sample text"), (study_blob, "study title")):
            if rec["tissue"] != "Unspecified":
                break
            rec["tissue"] = classify_tissue(fallback)
            rec["tissue_source"] = label if rec["tissue"] != "Unspecified" else ""
        rec["condition"] = classify_condition(declared_cond)
        rec["condition_source"] = "declared" if rec["condition"] != "Unspecified" else ""
        for fallback, label in ((sample_blob, "sample text"), (study_blob, "study title")):
            if rec["condition"] != "Unspecified":
                break
            rec["condition"] = classify_condition(fallback)
            rec["condition_source"] = label if rec["condition"] != "Unspecified" else ""
        rec["metadata_blob"] = display_blob[:600]
        rec["metadata_source"] = "ENA"
        resolved += 1
    unresolved = [r for r in run_ids if (meta.get(r) or {}).get("_unresolved")]
    log("  {}/{} runs resolved from ENA".format(resolved, len(run_ids)))
    if unresolved:
        log("  {} runs have no ENA record and stay Unspecified: {}{}".format(
            len(unresolved), ", ".join(sorted(unresolved)[:6]),
            " ..." if len(unresolved) > 6 else ""), level="WARN")
    tissue_counts = defaultdict(int)
    cond_counts = defaultdict(int)
    for run in run_ids:
        tissue_counts[meta[run].get("tissue", "Unspecified")] += 1
        cond_counts[meta[run].get("condition", "Unspecified")] += 1
    log("  tissues   : " + ", ".join("{}={}".format(k, v) for k, v in
                                     sorted(tissue_counts.items(), key=lambda x: -x[1])))
    log("  conditions: " + ", ".join("{}={}".format(k, v) for k, v in
                                     sorted(cond_counts.items(), key=lambda x: -x[1])))
    return meta


def mine_expression(path, wanted_tx, wanted_gene, species_filter=None):
    """Pull TPM rows for the candidate transcripts/genes out of the matrices.

    Returns (tpm_tx, tpm_gene, runs_by_species) where tpm_* maps
    (species, feature_id) -> {run_accession: tpm}.
    """
    log("-" * 78)
    log("STEP 3 -- Kallisto TPM matrices: {}".format(os.path.basename(path)))
    tpm_tx, tpm_gene = {}, {}
    runs_by_species = {}

    def want(name):
        base = os.path.basename(name)
        return "TPM.not_cross_norm" in base

    for member, fh in iter_tar_members(path, want=want):
        base = os.path.basename(member)
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        is_isoform = ".isoform." in base
        target_map = tpm_tx if is_isoform else tpm_gene
        wanted = wanted_tx.get(species, set()) if is_isoform else wanted_gene.get(species, set())
        header = fh.readline().decode("utf-8", "replace").rstrip("\n").split("\t")
        runs = [h.strip() for h in header[1:]] if header and header[0].strip() == "" \
            else [h.strip() for h in header]
        runs = [r for r in runs if r]
        runs_by_species.setdefault(species, [])
        for r in runs:
            if r not in runs_by_species[species]:
                runs_by_species[species].append(r)
        found, merged = 0, 0
        if not wanted:
            continue
        for raw in fh:
            line = raw.decode("utf-8", "replace").rstrip("\n")
            if not line:
                continue
            tab = line.find("\t")
            if tab < 0:
                continue
            feature = line[:tab]
            key = feature
            if not is_isoform and key not in wanted:
                # The gene matrices are not keyed consistently across species:
                # Clivia miniata leaves a trailing underscore
                # (Clmin_..._c0_g1_) and Lycoris radiata keys its gene matrix by
                # isoform id (Lyrad_..._g1_i1). Normalise before matching, and
                # sum the isoform rows so a gene-level value really is one.
                probe = re.sub(r"_i\d+$", "", feature.rstrip("_"))
                if probe in wanted:
                    key = probe
            if key not in wanted:
                continue
            vals = line[tab + 1:].split("\t")
            row = {}
            for j, run in enumerate(runs):
                if j < len(vals):
                    try:
                        row[run] = float(vals[j])
                    except ValueError:
                        pass
            existing = target_map.get((species, key))
            if existing is None:
                target_map[(species, key)] = row
                found += 1
            else:
                for run, val in row.items():
                    existing[run] = existing.get(run, 0.0) + val
                merged += 1
        log("  {:38s} {:8s} {:>4d}/{:<4d} candidate rows, {} runs{}".format(
            species, "isoform" if is_isoform else "gene", found, len(wanted),
            len(runs),
            "; {} isoform rows summed into gene totals".format(merged) if merged else ""))
    log("TPM: {} isoform rows, {} gene rows recovered".format(len(tpm_tx), len(tpm_gene)))
    return tpm_tx, tpm_gene, runs_by_species


# --------------------------------------------------------------------------- #
# STEP 4 -- sequence extraction
# --------------------------------------------------------------------------- #

_B1 = "TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG"
_B2 = "TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG"
_B3 = "TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG"
_AA = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG"
STANDARD_CODE = {_B1[i] + _B2[i] + _B3[i]: _AA[i] for i in range(64)}


def translate_cds(cds):
    """Translate with the standard genetic code; unknown codons become X."""
    return "".join(STANDARD_CODE.get(cds[i:i + 3].upper(), "X")
                   for i in range(0, len(cds) - 2, 3))


ORF_COORD_RE = re.compile(r"(\S+):(\d+)-(\d+)\(([+-])\)\s*$")
ORF_TYPE_RE = re.compile(r"ORF\s+type:(\S+)")
TRINOTATE_COORD_RE = re.compile(r"^(\d+)-(\d+)\[([+-])\]$")


def extract_cdna(transcriptome_path, wanted_by_species, species_filter=None):
    """Pull full-length unitig / cDNA sequences for the candidate transcripts."""
    log("-" * 78)
    log("STEP 4 -- cDNA extraction: {}".format(os.path.basename(transcriptome_path)))
    out = {}
    for member, fh in iter_tar_members(transcriptome_path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        wanted = wanted_by_species.get(species) or set()
        if not wanted:
            continue
        found = 0
        for header, seq in fasta_stream(fh):
            tx_id = header.split()[0]
            if tx_id in wanted:
                out[(species, tx_id)] = seq.upper()
                found += 1
        log("  {:38s} {:>4d}/{:<4d} candidate transcripts recovered".format(
            species, found, len(wanted)))
    log("cDNA: {} sequences recovered".format(len(out)))
    return out


def derive_cds(cdna, coords_text, trinotate_coords="", bed_coord=None):
    """Slice the CDS out of the parent unitig using TransDecoder ORF coordinates.

    Coordinate sources, in order of preference: the proteome FASTA header, the
    Trinotate `prot_coords` column, then the TransDecoder BED thickStart/thickEnd.
    Returns (cds, note, source).
    """
    if not cdna:
        return "", "no parent unitig sequence", ""
    start = end = None
    strand, source = "+", ""
    m = ORF_COORD_RE.search(coords_text or "")
    if m:
        start, end, strand, source = int(m.group(2)), int(m.group(3)), m.group(4), "proteome_header"
    else:
        m = TRINOTATE_COORD_RE.match((trinotate_coords or "").strip())
        if m:
            start, end, strand, source = int(m.group(1)), int(m.group(2)), m.group(3), "trinotate_prot_coords"
        elif bed_coord:
            start, end, strand, source = bed_coord[0], bed_coord[1], bed_coord[2], "transdecoder_bed"
    if start is None:
        return "", "no ORF coordinates", ""
    lo, hi = min(start, end), max(start, end)
    if lo < 1 or hi > len(cdna):
        return "", "ORF coordinates {}-{} outside unitig ({} bp)".format(
            lo, hi, len(cdna)), source
    sub = cdna[lo - 1:hi]
    if strand == "-":
        sub = revcomp(sub)
    return sub, "", source


def load_bed_coords(bed_path, wanted_prot, species_filter=None):
    """thickStart/thickEnd per peptide from the TransDecoder BED, for cross-checking."""
    coords = {}
    if not (bed_path and os.path.exists(bed_path)):
        return coords
    for member, fh in iter_tar_members(bed_path):
        species = species_key_from_member(member)
        if species_filter and species not in species_filter:
            continue
        wanted = wanted_prot.get(species) or set()
        if not wanted:
            continue
        for raw in fh:
            line = raw.decode("utf-8", "replace").rstrip("\n")
            if not line or line.startswith("track"):
                continue
            f = line.split("\t")
            if len(f) < 8:
                continue
            m = re.search(r"ID=([^;]+)", f[3])
            if not m:
                continue
            pid = m.group(1)
            if pid not in wanted:
                continue
            try:
                coords[(species, pid)] = (int(f[6]) + 1, int(f[7]), f[5])
            except ValueError:
                continue
    return coords


# --------------------------------------------------------------------------- #
# Evidence assessment
# --------------------------------------------------------------------------- #

FAMILY_PFAM = {
    DAHP: {"PF01474"},                       # class II -- the plant enzyme
    ADH: {"PF02153", "PF20463", "PF26213"},
}
WEAK_PFAM = {DAHP: {"PF00793"}, ADH: set()}  # class I: shared with KDSA/KdsA

EVIDENCE_WEIGHTS = {
    "EC": 4.0, "EC_related": 1.0, "EC_orthogroup": 1.0, "Pfam": 3.0, "PfamName": 1.5,
    "Description": 2.0, "SwissProt": 2.0, "SwissProtRef": 2.5,
    "SwissProtPattern": 2.0, "Homology": 2.0, "PfamHMM": 3.0,
}


def assess(rec):
    """Score every target this record has evidence for and pick the best call."""
    assessments = {}
    for target, evidences in rec["targets"].items():
        kinds = defaultdict(set)
        sources, methods, pfams, ecs, sprots = set(), set(), set(), set(), set()
        best_e, best_cov = None, 0.0
        best_lineage = None
        for ev in evidences:
            sources.add(ev["source"])
            methods.add(ev["method"])
            for reason in ev["reasons"]:
                kind, _, value = reason.partition(":")
                kinds[kind].add(value)
                if kind in ("EC", "EC_related", "EC_orthogroup"):
                    ecs.add(value)
                if kind in ("Pfam", "PfamHMM"):
                    for acc in PFAM_ACC_RE.findall(value):
                        pfams.add(acc)
                if kind.startswith("SwissProt"):
                    sprots.add(value)
            for acc in (ev.get("pfam_acc"),):
                if acc:
                    pfams.add(acc)
            ev_e = ev.get("evalue")
            if isinstance(ev_e, float) and (best_e is None or ev_e < best_e):
                best_e = ev_e
            for cov_key in ("query_coverage", "hmm_coverage", "target_coverage"):
                cov = ev.get(cov_key)
                if isinstance(cov, float):
                    best_cov = max(best_cov, cov)
            lin = ev.get("sprot_lineage")
            if lin:
                pid_ = ev.get("sprot_pident")
                if best_lineage is None or (pid_ or 0) > (best_lineage[1] or 0):
                    best_lineage = (lin, pid_, ev.get("sprot_entry", ""))

        score = 0.0
        for kind in kinds:
            score += EVIDENCE_WEIGHTS.get(kind, 0.5)
        has_target_ec = bool(kinds.get("EC"))
        has_family_pfam = bool(pfams & FAMILY_PFAM[target])
        weak_only = bool(pfams & WEAK_PFAM[target]) and not has_family_pfam
        has_homology = "B" in methods
        has_annotation = "A" in methods
        decoys = rec["decoys"].get(target) or []
        if decoys:
            score -= 3.0
        if weak_only:
            score -= 1.5
        if has_homology and has_annotation:
            score += 1.5

        # Plants encode only the class-II enzyme (PF01474). A PF00793-only
        # sequence is therefore KDSA/KdsA or a non-plant contaminant contig,
        # never a plant DAHP synthase.
        lineage_txt, lineage_pident, lineage_entry = (best_lineage or ("", None, ""))
        non_plant = bool(lineage_txt) and "viridiplantae" not in lineage_txt.lower()
        strong_non_plant = non_plant and (lineage_pident or 0) >= 60.0

        flags = []
        if non_plant:
            flags.append("non-plant best Swiss-Prot hit: {} ({}{})".format(
                lineage_entry or "?", lineage_txt.split(";")[0].strip(),
                ", {:.0f}% id".format(lineage_pident) if lineage_pident else ""))
        if decoys:
            flags.append("decoy-annotation:" + ";".join(sorted(set(decoys))[:3]))
        if weak_only:
            flags.append("class-I DAHP_synth_1 only (possible KDSA/KdsA paralog)"
                         if target == DAHP else "non-family Pfam only")
        if kinds.get("EC_orthogroup") and not kinds.get("EC"):
            flags.append("EC seen only in an aggregated EggNOG orthogroup list, "
                         "not assigned to this protein")
        if kinds.get("EC_related") and not kinds.get("EC"):
            flags.append("no EC {} annotation; only related EC numbers ({})"
                         .format(TARGET_EC[target][0],
                                 ", ".join(sorted(kinds["EC_related"])[:3])))
        if not has_homology:
            flags.append("annotation-only (no HMMER homology support)")
        if not has_annotation:
            flags.append("homology-only (no functional annotation support)")

        if score >= 8.0 and has_homology and (has_target_ec or has_family_pfam) and not decoys:
            confidence = "High"
        elif score >= 5.0 and (has_target_ec or has_family_pfam) and not (decoys and weak_only):
            confidence = "Medium"
        elif score >= 2.5:
            confidence = "Low"
        else:
            confidence = "Rejected"
        if decoys and weak_only:
            confidence = "Rejected"
        if weak_only and target == DAHP:
            confidence = "Rejected"
            flags.append("class-I DAHP_synth_1 (PF00793) only: plants encode only "
                         "the class-II enzyme (PF01474), so this is a KDSA/KdsA "
                         "paralog or a non-plant contig")
        if strong_non_plant:
            confidence = "Rejected"
            flags.append("likely contaminant contig: {:.0f}% identity to a "
                         "non-plant Swiss-Prot entry".format(lineage_pident))
        elif non_plant and confidence in ("High", "Medium"):
            confidence = {"High": "Medium", "Medium": "Low"}[confidence]

        assessments[target] = {
            "target": target, "score": round(score, 2), "confidence": confidence,
            "sources": sorted(sources), "methods": sorted(methods),
            "pfams": sorted(pfams), "ecs": sorted(ecs), "sprots": sorted(sprots),
            "kinds": {k: sorted(v) for k, v in kinds.items()},
            "best_evalue": best_e, "best_coverage": round(best_cov, 3),
            "flags": flags,
            "lineage": lineage_txt, "lineage_pident": lineage_pident,
            "non_plant": non_plant,
        }

    if not assessments:
        return None
    best = max(assessments.values(), key=lambda a: a["score"])
    others = [a for a in assessments.values() if a["target"] != best["target"]
              and a["confidence"] != "Rejected"]
    if others:
        best = dict(best)
        best["flags"] = list(best["flags"]) + [
            "also matched " + ", ".join(a["target"] for a in others)]
    return best


# --------------------------------------------------------------------------- #
# STEP 4 -- tabulation and output
# --------------------------------------------------------------------------- #

CSV_COLUMNS = [
    # the 12 requested fields, in order
    "Target_Enzyme",            # 1
    "Species",                  # 2
    "Transcript_ID",            # 3
    "Isoform_ID/Gene_ID",       # 4
    "Sequence_Type",            # 5
    "Sequence_Length",          # 6
    "Sampled_Tissue",           # 7
    "Sampled_Condition",        # 8
    "Expression_TPM",           # 9
    "EC_Number",                # 10a
    "Annotation_Source",        # 10b
    "Protein_Sequence",         # 11
    "CDS_Sequence",             # 12
    # supporting detail
    "Peptide_ID",
    "Species_Acronym",
    "Assembly",
    "ORF_Type",
    "CDS_Coord_Source",
    "Translation_Check",
    "Length_vs_Reference",
    "Protein_Length_aa",
    "CDS_Length_bp",
    "cDNA_Length_bp",
    "Detection_Method",
    "Evidence_Summary",
    "Pfam_Domains",
    "Best_SwissProt_Hit",
    "Best_Hit_Lineage",
    "Best_Hit_Identity",
    "Best_Evalue",
    "Best_Coverage",
    "Confidence",
    "Flags",
    "Max_TPM",
    "Max_TPM_Run",
    "Mean_TPM",
    "N_Samples",
    "TPM_By_Tissue",
    "TPM_By_Condition",
    "Gene_Max_TPM",
    "Protein_Source",
    "Metadata_Source",
    "Study_Accessions",
    "cDNA_Sequence",
]

MD_COLUMNS = [
    "Target_Enzyme", "Species", "Transcript_ID", "Isoform_ID/Gene_ID",
    "Sequence_Type", "Sequence_Length", "Sampled_Tissue", "Sampled_Condition",
    "Expression_TPM", "EC_Number", "Annotation_Source", "Confidence", "Assembly",
]


def _fasta_token(text):
    """One header field: no spaces, slashes or pipes to confuse downstream tools."""
    return re.sub(r"[^A-Za-z0-9_.:+-]", "_",
                  re.sub(r"\s+", "_", (text or "").strip())) or "NA"


def fasta_header(row, seq_id=None):
    """>TargetEnzyme|Species|TranscriptID|Tissue|Condition|TPM"""
    return "|".join((
        _fasta_token(row["Target_Enzyme"]).replace("_", ""),
        _fasta_token(row["Species"]),
        _fasta_token(seq_id or row["Transcript_ID"]),
        _fasta_token(row["Sampled_Tissue"]),
        _fasta_token(row["Sampled_Condition"]),
        _fasta_token(row["Expression_TPM"]),
    ))


def write_fasta(rows, seq_col, path):
    """Write one FASTA, guaranteeing unique record identifiers.

    A transcript can carry more than one predicted ORF, so several rows can
    share a Transcript_ID. Where those rows hold the same sequence (the cDNA
    file, whose unit is the unitig) the duplicate is dropped; where they hold
    different sequences (the CDS and protein files, whose unit is the ORF) the
    TransDecoder peptide id is used instead. Duplicate identifiers would break
    samtools faidx, makeblastdb -parse_seqids and any dict-keyed parser.
    """
    written, deduped, disambiguated = 0, 0, 0
    seen = {}
    with open(path, "w") as fh:
        for row in rows:
            seq = row.get(seq_col) or ""
            if not seq:
                continue
            header = fasta_header(row)
            prior = seen.get(header)
            if prior is not None:
                if prior == seq:
                    deduped += 1
                    continue
                header = fasta_header(row, row.get("Peptide_ID") or None)
                if header in seen:
                    deduped += 1
                    continue
                disambiguated += 1
            seen[header] = seq
            fh.write(">{}\n{}\n".format(header, wrap(seq)))
            written += 1
    return written, deduped, disambiguated


def validate_rows(rows):
    """Cheap invariants that catch label and format regressions before shipping."""
    problems = []
    for row in rows:
        sp = row.get("Species", "")
        if "&" in sp or "<" in sp:
            problems.append("un-decoded markup in Species: {!r}".format(sp))
        if re.search(r"\s+(PB|TH)$", sp):
            problems.append("assembly suffix leaked into Species: {!r}".format(sp))
        header = fasta_header(row)
        if header.count("|") != 5 or " " in header:
            problems.append("malformed FASTA header: {!r}".format(header))
    missing = [c for c in CSV_COLUMNS if rows and c not in rows[0]]
    if missing:
        problems.append("row dict is missing CSV columns: {}".format(missing))
    seen = set()
    for problem in problems:
        key = problem[:60]
        if key in seen:
            continue
        seen.add(key)
        log("output validation: {}".format(problem), level="ERROR")
    if not problems:
        log("output validation: {} rows passed all invariants".format(len(rows)))
    return problems


def write_outputs(rows, rejected, outdir, counts):
    os.makedirs(outdir, exist_ok=True)
    validate_rows(rows)

    csv_path = os.path.join(outdir, "target_enzymes_summary.csv")
    with open(csv_path, "w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    log("wrote {} ({} rows)".format(csv_path, len(rows)))

    if rejected:
        rej_path = os.path.join(outdir, "rejected_candidates.csv")
        with open(rej_path, "w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")
            writer.writeheader()
            for row in rejected:
                writer.writerow(row)
        log("wrote {} ({} rows -- decoy/insufficient-evidence hits, kept for "
            "transparency)".format(rej_path, len(rejected)))

    md_path = os.path.join(outdir, "target_enzymes_summary.md")
    with open(md_path, "w") as fh:
        fh.write("# DAHP synthase and arogenate dehydrogenase transcripts in "
                 "AmarylOmicBase\n\n")
        fh.write("Source: Zenodo record [{rec}](https://doi.org/10.5281/zenodo.{rec}) "
                 "-- *AmarylOmicBase*, 29 Amaryllidoideae species.\n\n".format(
                     rec=ZENODO_RECORD))
        fh.write("Full sequences (protein + CDS + cDNA) are in "
                 "`target_enzymes_summary.csv`; this table omits them for "
                 "readability.\n\n")
        for target in TARGETS:
            subset = [r for r in rows if r["Target_Enzyme"] == target]
            n_tx = len({r["Transcript_ID"] for r in subset})
            fh.write("## {} ({} transcripts / {} peptide rows)\n\n".format(
                target, n_tx, len(subset)))
            if not subset:
                fh.write("_No transcripts recovered._\n\n")
                continue
            fh.write("| " + " | ".join(MD_COLUMNS) + " |\n")
            fh.write("|" + "|".join(["---"] * len(MD_COLUMNS)) + "|\n")
            for row in sorted(subset, key=lambda r: (r["Species"], -_f(r["Max_TPM"]))):
                cells = [str(row.get(c, "")).replace("|", "/") for c in MD_COLUMNS]
                fh.write("| " + " | ".join(cells) + " |\n")
            fh.write("\n")
        fh.write("## Summary counts\n\n")
        fh.write(counts_markdown(counts))
    log("wrote {}".format(md_path))

    written = {}
    for fname, seq_col, label in (
        ("Amaryllidaceae_DAHP_ADH_transcripts.fasta", "CDS_Sequence", "CDS"),
        ("Amaryllidaceae_DAHP_ADH_proteins.fasta", "Protein_Sequence", "protein"),
        ("Amaryllidaceae_DAHP_ADH_cdna.fasta", "cDNA_Sequence", "full cDNA/unitig"),
    ):
        path = os.path.join(outdir, fname)
        n, deduped, disamb = write_fasta(rows, seq_col, path)
        written[label] = n
        log("wrote {} ({} {} records{}{})".format(
            path, n, label,
            "; {} duplicate records collapsed".format(deduped) if deduped else "",
            "; {} ids disambiguated by peptide id".format(disamb) if disamb else ""))
    return written


def _f(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def counts_markdown(counts):
    lines = ["| Metric | Value |", "|---|---|"]
    for key, value in counts:
        lines.append("| {} | {} |".format(key, value))
    return "\n".join(lines) + "\n"


def print_counts_table(counts):
    width = max(len(str(k)) for k, _ in counts) + 2
    log("=" * 78)
    log("SUMMARY")
    log("=" * 78)
    for key, value in counts:
        log("  {:<{w}} {}".format(str(key) + ":", value, w=width))
    log("=" * 78)


def build_rows(store, species_index, seq_cache, cdna, tpm_tx, tpm_gene, run_meta,
               bed_coords, min_confidence_for_output="Low", references=None):
    """Turn the merged candidate store into output rows."""
    order = {"High": 3, "Medium": 2, "Low": 1, "Rejected": 0}
    rows, rejected = [], []
    coord_agree = coord_disagree = 0
    ref_len = {}
    for target in TARGETS:
        lengths = sorted(len(r[3]) for r in (references or {}).get(target, []))
        ref_len[target] = lengths[len(lengths) // 2] if lengths else 0

    for (species, tx_id, prot_id), rec in store.rows.items():
        verdict = assess(rec)
        if verdict is None:
            continue
        target = verdict["target"]
        acronym = (prot_id or tx_id).split("_")[0] if (prot_id or tx_id) else ""
        species_name, assembly = species_index.resolve(species, acronym)

        pep = seq_cache.get((species, "pep", prot_id), "") if prot_id else ""
        pep_header = seq_cache.get((species, "pephdr", prot_id), "") if prot_id else ""
        pep_source = "TransDecoder proteome" if pep else ""
        sixframe_pep = seq_cache.get((species, "sixframe_pep", tx_id), "")
        nt = cdna.get((species, tx_id), "")
        if not nt:
            nt = seq_cache.get((species, "tx", tx_id), "")
        trinotate_coords = ""
        for ev in rec["targets"][target]:
            if ev.get("prot_coords"):
                trinotate_coords = ev["prot_coords"]
                break
        cds, cds_note, cds_source = derive_cds(
            nt, pep_header, trinotate_coords, bed_coords.get((species, prot_id)))
        if not pep and cds:
            # The peptide is missing from the distributed proteome but the ORF
            # coordinates survive in the Trinotate report / TransDecoder BED, so
            # the protein is recoverable by translation rather than lost.
            translated = translate_cds(cds).rstrip("*")
            if translated and "*" not in translated:
                pep = translated
                pep_source = "translated from {} ORF coordinates".format(
                    cds_source or "TransDecoder")
        if not pep and sixframe_pep:
            pep = sixframe_pep
            pep_source = "six-frame translation of the unitig (no predicted ORF)"
        translation_check = "n/a"
        if cds and pep:
            translated = translate_cds(cds).rstrip("*")
            if translated == pep:
                translation_check = "match"
                coord_agree += 1
            else:
                # tolerate a peptide that keeps a leading Met the CDS lacks, or
                # a selenocysteine/ambiguity difference
                diffs = sum(1 for a, b in zip(translated, pep) if a != b) + \
                    abs(len(translated) - len(pep))
                translation_check = "mismatch ({} residues)".format(diffs)
                coord_disagree += 1

        expr = tpm_tx.get((species, tx_id), {})
        gene_id = rec["gene_id"] or gene_from_transcript(tx_id)
        gene_expr = tpm_gene.get((species, gene_id), {})

        max_tpm, max_run, mean_tpm, n_samples = 0.0, "", 0.0, 0
        by_tissue = defaultdict(float)
        by_condition = defaultdict(float)
        studies = set()
        if expr:
            n_samples = len(expr)
            mean_tpm = sum(expr.values()) / float(n_samples)
            max_run, max_tpm = max(expr.items(), key=lambda kv: kv[1])
            for run, val in expr.items():
                meta = run_meta.get(run) or {}
                by_tissue[meta.get("tissue", "Unspecified")] = max(
                    by_tissue[meta.get("tissue", "Unspecified")], val)
                by_condition[meta.get("condition", "Unspecified")] = max(
                    by_condition[meta.get("condition", "Unspecified")], val)
                if meta.get("study_accession"):
                    studies.add(meta["study_accession"])
        meta_max = run_meta.get(max_run) or {}
        tissue = meta_max.get("tissue", "Unspecified") if max_run else "Unspecified"
        condition = meta_max.get("condition", "Unspecified") if max_run else "Unspecified"
        zero_everywhere = bool(expr) and max_tpm <= 0.0
        if zero_everywhere:
            # argmax of an all-zero vector is meaningless -- do not name a tissue
            tissue = condition = "Not detected"
            max_run = ""

        orf_type = ""
        m_orf = ORF_TYPE_RE.search(pep_header or "")
        if m_orf:
            orf_type = m_orf.group(1)
        extra_flags = []
        if zero_everywhere:
            extra_flags.append("zero TPM in all {} runs".format(n_samples))
        run_organism = (run_meta.get(max_run) or {}).get("scientific_name", "")
        if (run_organism and species_name
                and run_organism.split()[0] != species_name.split()[0]):
            extra_flags.append(
                "peak-expression run {} is recorded at ENA as {}, not {}".format(
                    max_run, run_organism, species_name))
        if max_run and (run_meta.get(max_run) or {}).get("_unresolved"):
            extra_flags.append(
                "tissue/condition unresolved for the peak-expression run {} "
                "({})".format(max_run,
                              (run_meta.get(max_run) or {}).get("metadata_source",
                                                                "no record")))
        if prot_id and pep_source.startswith("translated"):
            extra_flags.append("peptide absent from the distributed proteome; "
                               "protein recovered by translating the ORF")
        elif prot_id and not pep:
            extra_flags.append("peptide absent from the distributed proteome "
                               "(present in the hmmscan input set)")
        if not prot_id and sixframe_pep:
            extra_flags.append("no TransDecoder ORF: detected by six-frame "
                               "translation of the assembled unitig")
        if orf_type and orf_type != "complete":
            extra_flags.append("partial ORF ({})".format(orf_type))
        if pep and ref_len.get(target):
            ratio = len(pep) / float(ref_len[target])
            if ratio < 0.7:
                # TransDecoder "complete" means start+stop codons are present,
                # not that the ORF is full length relative to the enzyme family.
                extra_flags.append(
                    "length {:.0%} of the reference ({} aa vs {} aa median) -- "
                    "fragmentary".format(ratio, len(pep), ref_len[target]))

        seq_types = []
        if cds:
            seq_types.append("Nucleotide CDS")
        if pep:
            seq_types.append("Peptide Protein")
        if not seq_types and nt:
            seq_types.append("Nucleotide cDNA")
        length_bits = []
        if cds:
            length_bits.append("{} bp".format(len(cds)))
        elif nt:
            length_bits.append("{} bp (cDNA)".format(len(nt)))
        if pep:
            length_bits.append("{} aa".format(len(pep)))

        ec_list = [e for e in verdict["ecs"] if e in TARGET_EC[target]]
        ec_other = [e for e in verdict["ecs"] if e not in TARGET_EC[target]]
        ec_display = ", ".join(ec_list) if ec_list else (
            "; ".join(ec_other) + " (related)" if ec_other else
            "{} (inferred by homology/domain)".format(TARGET_EC[target][0]))

        evidence_bits = []
        for kind, values in sorted(verdict["kinds"].items()):
            evidence_bits.append("{}[{}]".format(kind, "; ".join(values[:3])))

        row = {
            "Target_Enzyme": target,
            "Species": species_name,
            "Transcript_ID": tx_id,
            "Isoform_ID/Gene_ID": gene_id,
            "Sequence_Type": " + ".join(seq_types) or "Unavailable",
            "Sequence_Length": " / ".join(length_bits),
            "Sampled_Tissue": tissue,
            "Sampled_Condition": condition,
            "Expression_TPM": "{:.4f}".format(max_tpm) if expr else "NA",
            "EC_Number": ec_display,
            "Annotation_Source": ", ".join(verdict["sources"]),
            "Protein_Sequence": pep,
            "CDS_Sequence": cds,
            "Peptide_ID": prot_id,
            "Species_Acronym": acronym,
            "Assembly": assembly,
            "ORF_Type": orf_type,
            "CDS_Coord_Source": cds_source,
            "Translation_Check": translation_check,
            "Length_vs_Reference": ("{:.0%}".format(len(pep) / float(ref_len[target]))
                                    if pep and ref_len.get(target) else ""),
            "Protein_Length_aa": len(pep) if pep else "",
            "CDS_Length_bp": len(cds) if cds else "",
            "cDNA_Length_bp": len(nt) if nt else "",
            "Detection_Method": "+".join(
                {"A": "A:annotation", "B": "B:homology"}[m]
                for m in verdict["methods"]),
            "Evidence_Summary": " ".join(evidence_bits)[:500],
            "Pfam_Domains": ", ".join(verdict["pfams"]),
            "Best_SwissProt_Hit": ", ".join(verdict["sprots"][:3]),
            "Best_Hit_Lineage": "; ".join(
                [t.strip() for t in (verdict.get("lineage") or "").split(";")[:4]]),
            "Best_Hit_Identity": ("{:.1f}%".format(verdict["lineage_pident"])
                                  if verdict.get("lineage_pident") else ""),
            "Best_Evalue": ("{:.2g}".format(verdict["best_evalue"])
                            if verdict["best_evalue"] is not None else ""),
            "Best_Coverage": "{:.0%}".format(verdict["best_coverage"])
                             if verdict["best_coverage"] else "",
            "Confidence": verdict["confidence"],
            "Flags": "; ".join(verdict["flags"] + extra_flags
                               + ([cds_note] if cds_note else [])),
            "Max_TPM": "{:.4f}".format(max_tpm) if expr else "",
            "Max_TPM_Run": max_run,
            "Mean_TPM": "{:.4f}".format(mean_tpm) if expr else "",
            "N_Samples": n_samples,
            "TPM_By_Tissue": "; ".join(
                "{}={:.2f}".format(k, v) for k, v in
                sorted(by_tissue.items(), key=lambda kv: -kv[1])),
            "TPM_By_Condition": "; ".join(
                "{}={:.2f}".format(k, v) for k, v in
                sorted(by_condition.items(), key=lambda kv: -kv[1])),
            "Gene_Max_TPM": ("{:.4f}".format(max(gene_expr.values()))
                             if gene_expr else ""),
            "Protein_Source": pep_source,
            "Metadata_Source": (run_meta.get(max_run) or {}).get(
                "metadata_source", "") if max_run else "",
            "Study_Accessions": ", ".join(sorted(studies)),
            "cDNA_Sequence": nt,
        }
        if order[verdict["confidence"]] >= order[min_confidence_for_output]:
            rows.append(row)
        else:
            rejected.append(row)

    if coord_agree or coord_disagree:
        total = coord_agree + coord_disagree
        log("CDS QA -- translated CDS identical to the predicted peptide for "
            "{}/{} rows ({:.1%})".format(coord_agree, total, coord_agree / float(total)),
            level="INFO" if coord_disagree == 0 else "WARN")
    rows.sort(key=lambda r: (r["Target_Enzyme"], r["Species"],
                             -order[r["Confidence"]], -_f(r["Max_TPM"])))
    rejected.sort(key=lambda r: (r["Target_Enzyme"], r["Species"]))
    return rows, rejected


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #

def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description="Mine DAHP synthase and arogenate dehydrogenase transcripts "
                    "from AmarylOmicBase (Zenodo record 17307476).")
    p.add_argument("--workdir", default="amaryl_work",
                   help="cache directory for downloads and reference data")
    p.add_argument("--outdir", default="results",
                   help="directory for the summary table and FASTA files")
    p.add_argument("--record", default=ZENODO_RECORD, help="Zenodo record id")
    p.add_argument("--evalue", type=float, default=1e-10,
                   help="maximum E-value for the homology search (Method B)")
    p.add_argument("--min-coverage", type=float, default=0.5,
                   help="minimum query or target coverage for Method B hits")
    p.add_argument("--threads", type=int, default=0,
                   help="CPUs for HMMER (0 = all available)")
    p.add_argument("--species", nargs="*", default=None,
                   help="restrict to these species keys (e.g. Narcissus_tazetta)")
    p.add_argument("--offline", action="store_true",
                   help="use cached downloads and cached metadata only")
    p.add_argument("--no-download", action="store_true",
                   help="never fetch Zenodo archives (use whatever is cached), "
                        "but still allow UniProt/InterPro/ENA lookups")
    p.add_argument("--no-metadata", action="store_true",
                   help="skip the ENA metadata lookup")
    p.add_argument("--no-sixframe", action="store_true",
                   help="skip the six-frame sweep of the nucleotide assemblies")
    p.add_argument("--min-orf-aa", type=int, default=60,
                   help="minimum stop-free stretch for the six-frame sweep")
    p.add_argument("--min-confidence", default="Low",
                   choices=["High", "Medium", "Low"],
                   help="lowest confidence tier written to the main outputs")
    p.add_argument("--quiet", action="store_true")
    return p.parse_args(argv)


def main(argv=None):
    global _VERBOSE
    args = parse_args(argv)
    _VERBOSE = not args.quiet
    t0 = time.time()

    workdir = os.path.abspath(args.workdir)
    outdir = os.path.abspath(args.outdir)
    os.makedirs(workdir, exist_ok=True)
    os.makedirs(outdir, exist_ok=True)
    species_filter = set(args.species) if args.species else None

    log("AmarylOmicBase enzyme mining pipeline")
    log("  workdir: {}".format(workdir))
    log("  outdir : {}".format(outdir))
    log("  targets: {}".format(" | ".join(TARGETS)))

    catalogue, species_index = step1_catalogue_and_download(
        workdir, offline=args.offline, record=args.record,
        no_download=args.no_download)

    def archive(name):
        info = catalogue.get(name)
        if not info:
            return None
        path = info["local"]
        if os.path.exists(path) and (info["size"] is None
                                     or os.path.getsize(path) == info["size"]):
            return path
        log("archive unavailable or incomplete: {}".format(name), level="WARN")
        return None

    store = CandidateStore()
    seq_cache = {}
    peptide_counts = {}

    log("=" * 78)
    log("STEP 2 -- dual-layer mining")
    log("=" * 78)

    references, reference_entries = fetch_reference_proteins(
        workdir, offline=args.offline)
    hmm_paths = fetch_pfam_hmms(workdir, offline=args.offline)

    # ---- Method A ---------------------------------------------------------- #
    log("-" * 78)
    ann = archive("Amaryllidoideae_annotation_report.tar.gz")
    if ann:
        mine_trinotate(ann, store, species_filter, seq_cache)
    n_after_trinotate = len(store)

    ga_cutoffs = load_pfam_gathering_cutoffs(hmm_paths)
    hmmscan_arc = archive("Amaryllidoideae_hmmscan_PfamA.tar.gz")
    if hmmscan_arc:
        mine_hmmscan(hmmscan_arc, store, species_filter, ga_cutoffs=ga_cutoffs)
    n_after_hmmscan = len(store)

    egg = archive("Amaryllidoideae_emapper_EggNOG.tar.gz")
    if egg:
        mine_eggnog(egg, store, species_filter)
    n_after_eggnog = len(store)

    blastp = archive("Amaryllidoideae_blastp_uniprot.tar.gz")
    if blastp:
        mine_blastp(blastp, store, reference_entries, species_filter)
    n_after_method_a = len(store)
    log("Method A total: {} unique candidate sequences".format(n_after_method_a))

    # ---- Method B ---------------------------------------------------------- #
    proteome = archive("Amaryllidoideae_proteome.tar.gz")
    method_b_stats = {"skipped": True}
    if proteome:
        method_b_stats = method_b_homology(
            proteome, references, hmm_paths, store, seq_cache,
            evalue=args.evalue, min_coverage=args.min_coverage,
            threads=args.threads, species_filter=species_filter,
            peptide_lengths=peptide_counts)
    n_after_method_b = len(store)
    log("Merged A+B (peptide level): {} unique candidates ({} added by homology)"
        .format(n_after_method_b, n_after_method_b - n_after_method_a))

    transcriptome = archive("Amaryllidoideae_transcriptome.tar.gz")
    sixframe_stats = {"skipped": True}
    if transcriptome and not args.no_sixframe:
        sixframe_stats = method_b_transcript_sweep(
            transcriptome, hmm_paths, store, seq_cache, threads=args.threads,
            species_filter=species_filter, min_orf_aa=args.min_orf_aa)
    n_after_sixframe = len(store)
    log("Merged A+B+six-frame: {} unique candidates ({} ORF-less transcripts "
        "recovered)".format(n_after_sixframe, n_after_sixframe - n_after_method_b))

    # ---- STEP 3 / 4 -------------------------------------------------------- #
    wanted_tx, wanted_gene, wanted_prot = defaultdict(set), defaultdict(set), defaultdict(set)
    for (species, tx_id, prot_id), rec in store.rows.items():
        if tx_id:
            wanted_tx[species].add(tx_id)
        gene_id = rec["gene_id"] or gene_from_transcript(tx_id)
        if gene_id:
            wanted_gene[species].add(gene_id)
        if prot_id:
            wanted_prot[species].add(prot_id)

    cdna = extract_cdna(transcriptome, wanted_tx, species_filter) if transcriptome else {}

    bed_coords = load_bed_coords(archive("Amaryllidoideae_bed.tar.gz"),
                                 wanted_prot, species_filter)

    expression = archive("Amaryllidoideae_expression.tar.gz")
    if expression:
        tpm_tx, tpm_gene, runs_by_species = mine_expression(
            expression, wanted_tx, wanted_gene, species_filter)
    else:
        tpm_tx, tpm_gene, runs_by_species = {}, {}, {}

    all_runs = sorted({r for runs in runs_by_species.values() for r in runs})
    if all_runs and not args.no_metadata:
        run_meta = fetch_run_metadata(all_runs, workdir, offline=args.offline)
    else:
        run_meta = {r: {"run_accession": r, "tissue": "Unspecified",
                        "condition": "Unspecified"} for r in all_runs}

    rows, rejected = build_rows(store, species_index, seq_cache, cdna, tpm_tx,
                                tpm_gene, run_meta, bed_coords,
                                min_confidence_for_output=args.min_confidence,
                                references=references)

    # ---- counts ------------------------------------------------------------ #
    per_target = defaultdict(lambda: defaultdict(int))
    species_with = defaultdict(set)
    tx_with = defaultdict(set)
    for row in rows:
        per_target[row["Target_Enzyme"]][row["Confidence"]] += 1
        per_target[row["Target_Enzyme"]]["total"] += 1
        species_with[row["Target_Enzyme"]].add(row["Species"])
        tx_with[row["Target_Enzyme"]].add(row["Transcript_ID"])
    n_species = len({k[0] for k in store.rows}) or len(peptide_counts)

    counts = [
        ("Zenodo record", "{} ({})".format(args.record, "AmarylOmicBase")),
        ("Archives in record", len(catalogue)),
        ("Archives used", sum(1 for k in NEEDED_ARCHIVES if archive(k))),
        ("Species / assemblies scanned", len(peptide_counts) or n_species),
        ("Peptides searched (Method B)", fmt_int(sum(peptide_counts.values()))),
        ("Method A candidates (annotation)", n_after_method_a),
        ("  ... from Trinotate reports", n_after_trinotate),
        ("  ... added by hmmscan/Pfam-A", n_after_hmmscan - n_after_trinotate),
        ("  ... added by EggNOG-mapper", n_after_eggnog - n_after_hmmscan),
        ("  ... added by BLASTp/Swiss-Prot", n_after_method_a - n_after_eggnog),
        ("Method B candidates added (homology)", n_after_method_b - n_after_method_a),
        ("Six-frame assembly sweep: ORF-less transcripts",
         n_after_sixframe - n_after_method_b),
        ("Merged unique candidates", n_after_sixframe),
        ("Rows written to summary", len(rows)),
        ("Rows rejected (decoy/weak)", len(rejected)),
        ("Sequencing runs mapped", len(all_runs)),
    ]
    for target in TARGETS:
        counts.append(("{} -- distinct transcripts".format(target),
                       len(tx_with[target])))
        counts.append(("{} -- rows (one per predicted ORF)".format(target),
                       per_target[target]["total"]))
        counts.append(("{} -- species".format(target),
                       len(species_with[target])))
        counts.append(("{} -- High/Medium/Low".format(target),
                       "{}/{}/{}".format(per_target[target]["High"],
                                         per_target[target]["Medium"],
                                         per_target[target]["Low"])))

    written = write_outputs(rows, rejected, outdir, counts)
    for label, n in written.items():
        counts.append(("FASTA records ({})".format(label), n))
    counts.append(("Wall time", "{:.1f} s".format(time.time() - t0)))

    summary_path = os.path.join(outdir, "pipeline_summary.json")
    with open(summary_path, "w") as fh:
        try:
            import hashlib
            with open(os.path.abspath(__file__), "rb") as srcfh:
                source_sha = hashlib.sha256(srcfh.read()).hexdigest()
        except OSError:
            source_sha = ""
        json.dump({
            "record": args.record,
            "source_file": os.path.abspath(__file__),
            "source_sha256": source_sha,
            "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "parameters": {"evalue": args.evalue,
                           "min_coverage": args.min_coverage,
                           "min_confidence": args.min_confidence},
            "counts": [[str(k), str(v)] for k, v in counts],
            "method_b": method_b_stats,
            "six_frame": sixframe_stats,
            "reference_proteins": {t: [r[0] for r in references.get(t, [])]
                                   for t in TARGETS},
        }, fh, indent=2)
    log("wrote {}".format(summary_path))

    if run_meta:
        rm_path = os.path.join(outdir, "run_metadata.csv")
        cols = ["run_accession", "study_accession", "sample_accession",
                "scientific_name", "sample_title", "tissue_type", "dev_stage",
                "tissue", "tissue_source", "condition", "condition_source",
                "metadata_source", "study_title", "metadata_blob"]
        with open(rm_path, "w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
            writer.writeheader()
            for run in all_runs:
                writer.writerow(run_meta.get(run, {"run_accession": run}))
        log("wrote {} ({} runs)".format(rm_path, len(all_runs)))

    print_counts_table(counts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
