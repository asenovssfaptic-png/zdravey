#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
blast_hippeastrum.py -- BLAST query sequences against every *Hippeastrum*
transcriptome in AmarylOmicBase (Zenodo record 17307476) and map the hits onto
tissue- and condition-specific expression.

Workflow
--------
STEP 1  Query the Zenodo REST API for the archive URLs and stream
        `Amaryllidoideae_Assemblies_nt97.tar.gz` and
        `Amaryllidoideae_expression.tar.gz`, extracting ONLY the members whose
        filename contains "Hippeastrum". Nothing else is ever written to disk.
STEP 2  Concatenate the assemblies, build a nucleotide BLAST database, detect
        whether the queries are nucleotide or protein, run blastn or tblastn
        accordingly, and keep hits with E <= 1e-10 and query coverage >= 50 %.
STEP 3  Look each hit transcript up in its species' Kallisto isoform TPM matrix,
        resolve every matrix column (an SRA run accession) against NCBI
        E-utilities at <= 3 requests/second, and parse tissue and treatment out
        of the returned XML.
STEP 4  Write `Hippeastrum_BLAST_expression_results.csv` and print a Markdown
        summary.

Usage
-----
    python3 blast_hippeastrum.py --query input.fasta

Requires: NCBI BLAST+ (makeblastdb, blastn, tblastn) on PATH, and
requests / pandas / biopython / tqdm.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import threading
import time
import urllib.parse
import xml.etree.ElementTree as ET
from collections import OrderedDict, defaultdict

import requests
from Bio import SeqIO
from tqdm import tqdm

ZENODO_RECORD = "17307476"
ZENODO_API = "https://zenodo.org/api/records/{rec}"
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
ENA_SEARCH = "https://www.ebi.ac.uk/ena/portal/api/search"

ASSEMBLY_ARCHIVE = "Amaryllidoideae_Assemblies_nt97.tar.gz"
EXPRESSION_ARCHIVE = "Amaryllidoideae_expression.tar.gz"
# Not every species was assembled de novo in this project, so a species can be
# absent from the nt97 archive; the per-species transcriptome archive has all of
# them and is used as a fallback (see resolve_missing_assemblies).
FALLBACK_ARCHIVE = "Amaryllidoideae_transcriptome.tar.gz"

GENUS = "Hippeastrum"
TPM_PATTERN = "kallisto.isoform.TPM.not_cross_norm"

TISSUE_TAGS = ("tissue", "tissue type", "tissue_type", "organism part",
               "organism_part", "organ", "plant structure", "plant_structure",
               "source_name", "source name", "isolation_source", "sample type",
               "body site", "cell type")
# An experimental variable proper. These are what the request means by
# "treatment/condition": control, light spectrum, stress, developmental stage.
TREATMENT_TAGS = ("treatment", "condition", "growth condition", "growth conditions",
                  "growth protocol", "developmental stage", "development stage",
                  "dev_stage", "dev stage", "stage", "time", "time point",
                  "timepoint", "light", "temperature", "stress", "infection")
# Sample context rather than an applied treatment. Used only when the sample
# declares no treatment at all, so that a cultivar comparison is still visible
# instead of collapsing to "Control/Unspecified".
CONTEXT_TAGS = ("cultivar", "genotype", "ecotype", "phenotype", "age", "variety")
DEFAULT_CONDITION = "Control/Unspecified"
DEFAULT_TISSUE = "Unspecified"

NUC_ALPHABET = set("ACGTUNRYKMSWBDHVacgtunrykmswbdhv-*.")


# --------------------------------------------------------------------------- #
# logging
# --------------------------------------------------------------------------- #

_T0 = time.time()


def log(msg, level="INFO"):
    print("[{:>7.1f}s {}] {}".format(time.time() - _T0, level, msg), flush=True)


def banner(text):
    print("\n" + "=" * 78, flush=True)
    print(text, flush=True)
    print("=" * 78, flush=True)


# --------------------------------------------------------------------------- #
# NCBI rate limiter -- E-utilities allows 3 requests/second without an API key
# --------------------------------------------------------------------------- #

class RateLimiter(object):
    def __init__(self, per_second=3.0):
        self.interval = 1.0 / float(per_second)
        self._lock = threading.Lock()
        self._last = 0.0

    def wait(self):
        with self._lock:
            now = time.time()
            delay = self._last + self.interval - now
            if delay > 0:
                time.sleep(delay)
            self._last = time.time()


NCBI = RateLimiter(3.0)


def http_get(url, params=None, retries=5, timeout=120, rate=None, stream=False):
    last = None
    for attempt in range(1, retries + 1):
        if rate is not None:
            rate.wait()
        try:
            r = requests.get(url, params=params, timeout=timeout, stream=stream,
                             headers={"User-Agent": "hippeastrum-blast/1.0"})
            if r.status_code == 429 or 500 <= r.status_code < 600:
                raise requests.HTTPError("HTTP %d" % r.status_code)
            r.raise_for_status()
            return r
        except Exception as exc:                                  # noqa: BLE001
            last = exc
            if attempt == retries:
                break
            wait = 2.0 * (2 ** (attempt - 1))
            log("request failed ({}); retry {}/{} in {:.0f}s".format(
                type(exc).__name__, attempt, retries, wait), "WARN")
            time.sleep(wait)
    log("giving up on {}: {}".format(url, last), "ERROR")
    return None


# --------------------------------------------------------------------------- #
# STEP 1 -- targeted, streamed extraction from Zenodo
# --------------------------------------------------------------------------- #

def zenodo_catalogue(record=ZENODO_RECORD):
    log("querying the Zenodo API for record {}".format(record))
    r = http_get(ZENODO_API.format(rec=record))
    if r is None:
        raise SystemExit("cannot reach the Zenodo API")
    payload = r.json()
    files = {}
    for entry in payload.get("files") or []:
        files[entry["key"]] = {
            "key": entry["key"],
            "size": entry.get("size"),
            "url": (entry.get("links") or {}).get("self")
                   or "https://zenodo.org/api/records/{}/files/{}/content".format(
                       record, entry["key"]),
        }
    log("record: {}".format(payload.get("title", "?")))
    log("{} archives listed, {:.2f} GB total".format(
        len(files), sum(f["size"] or 0 for f in files.values()) / 1e9))
    return files


def ensure_archive(info, cache_dir):
    """Download an archive only if it is not already cached and complete."""
    os.makedirs(cache_dir, exist_ok=True)
    dest = os.path.join(cache_dir, info["key"])
    size = info.get("size")
    if os.path.exists(dest) and (size is None or os.path.getsize(dest) == size):
        log("cached   {} ({:.2f} GB)".format(info["key"], os.path.getsize(dest) / 1e9))
        return dest
    log("download {} ({:.2f} GB) ...".format(info["key"], (size or 0) / 1e9))
    for attempt in range(1, 6):
        have = os.path.getsize(dest) if os.path.exists(dest) else 0
        if size is not None and have == size:
            return dest
        headers = {"User-Agent": "hippeastrum-blast/1.0"}
        if have:
            headers["Range"] = "bytes={}-".format(have)
        try:
            with requests.get(info["url"], headers=headers, stream=True, timeout=300) as r:
                r.raise_for_status()
                mode = "ab" if (have and r.status_code == 206) else "wb"
                total = size or 0
                with open(dest, mode) as fh, tqdm(
                        total=total, initial=have if mode == "ab" else 0,
                        unit="B", unit_scale=True, desc=info["key"][:38],
                        disable=not sys.stderr.isatty()) as bar:
                    for chunk in r.iter_content(1 << 20):
                        fh.write(chunk)
                        bar.update(len(chunk))
        except Exception as exc:                                  # noqa: BLE001
            log("download error ({}), retry {}/5".format(type(exc).__name__, attempt), "WARN")
            time.sleep(3 * attempt)
            continue
        if size is None or os.path.getsize(dest) == size:
            return dest
    raise SystemExit("could not download {}".format(info["key"]))


def extract_matching(archive_path, outdir, predicate, label):
    """Stream a .tar.gz once and write out only the members that match.

    The archive is opened in 'r|gz' streaming mode, so it is decompressed
    exactly once and never materialised on disk.
    """
    os.makedirs(outdir, exist_ok=True)
    written = []
    log("streaming {} for {}".format(os.path.basename(archive_path), label))
    with tarfile.open(archive_path, mode="r|gz") as tar:
        for member in tar:
            if not member.isfile():
                continue
            if not predicate(member.name):
                continue
            fh = tar.extractfile(member)
            if fh is None:
                continue
            dest = os.path.join(outdir, os.path.basename(member.name))
            with open(dest, "wb") as out:
                shutil.copyfileobj(fh, out, 1 << 20)
            written.append(dest)
            log("  extracted {} ({:.1f} MB)".format(
                os.path.basename(member.name), member.size / 1e6))
    return written


def is_hippeastrum_fasta(name):
    base = os.path.basename(name)
    return GENUS.lower() in base.lower() and base.lower().endswith((".fasta", ".fa", ".fna"))


def is_hippeastrum_tpm(name):
    base = os.path.basename(name)
    return GENUS.lower() in base.lower() and TPM_PATTERN in base


def species_from_filename(path):
    base = os.path.basename(path)
    for suffix in (".fasta", ".fa", ".fna"):
        if base.endswith(suffix):
            base = base[: -len(suffix)]
    base = re.sub(r"_kallisto\..*$", "", base)
    base = re.sub(r"_nt97.*$", "", base)
    return base


def resolve_missing_assemblies(catalogue, cache_dir, asm_dir, have_species,
                               want_species):
    """Pull any Hippeastrum assembly absent from nt97 out of the fallback archive.

    `Amaryllidoideae_Assemblies_nt97.tar.gz` holds only the species assembled de
    novo in this project, so a Hippeastrum species with a previously published
    assembly (H. striatum) is not in it. Taking it from the per-species
    transcriptome archive keeps the genus complete instead of silently dropping it.
    """
    missing = sorted(set(want_species) - set(have_species))
    if not missing:
        return []
    log("{} not present in {}: {}".format(
        "species" if len(missing) > 1 else "species", ASSEMBLY_ARCHIVE,
        ", ".join(missing)), "WARN")
    if FALLBACK_ARCHIVE not in catalogue:
        log("fallback archive {} not in the record".format(FALLBACK_ARCHIVE), "ERROR")
        return []
    log("falling back to {} for: {}".format(FALLBACK_ARCHIVE, ", ".join(missing)))
    path = ensure_archive(catalogue[FALLBACK_ARCHIVE], cache_dir)
    wanted = set(missing)

    def pred(name):
        return is_hippeastrum_fasta(name) and species_from_filename(name) in wanted

    return extract_matching(path, asm_dir, pred,
                            "assemblies missing from nt97")


# --------------------------------------------------------------------------- #
# STEP 2 -- BLAST database and search
# --------------------------------------------------------------------------- #

def detect_query_type(fasta_path):
    """Return ('nucl'|'prot', [record ids]) for the query file."""
    records = list(SeqIO.parse(fasta_path, "fasta"))
    if not records:
        raise SystemExit("no FASTA records found in {}".format(fasta_path))
    nuc_like = 0
    for rec in records:
        seq = str(rec.seq)
        if not seq:
            continue
        frac = sum(1 for c in seq if c in NUC_ALPHABET) / float(len(seq))
        if frac >= 0.90:
            nuc_like += 1
    kind = "nucl" if nuc_like == len(records) else "prot"
    if 0 < nuc_like < len(records):
        log("query file mixes nucleotide and protein records ({}/{} look "
            "nucleotide) -- treating the set as protein".format(nuc_like, len(records)),
            "WARN")
    return kind, [r.id for r in records], records


def build_blast_db(assembly_paths, workdir, id_prefixes=None):
    combined = os.path.join(workdir, "hippeastrum_combined.fasta")
    id_prefixes = id_prefixes or {}
    id_species = {}
    n_seq, n_remapped = 0, 0
    log("concatenating {} assemblies".format(len(assembly_paths)))
    with open(combined, "w") as out:
        for path in sorted(assembly_paths):
            species = species_from_filename(path)
            canonical = id_prefixes.get(species)
            count, remapped, announced = 0, 0, False
            for rec in SeqIO.parse(path, "fasta"):
                seq_id = rec.id
                if canonical:
                    m = re.match(r"^([A-Za-z][A-Za-z0-9]*)_(.*)$", seq_id)
                    if m and m.group(1) != canonical:
                        if not announced:
                            log("  {}: assembly IDs are '{}_*' but the expression "
                                "matrix uses '{}_*' -- rewriting to the matrix "
                                "prefix".format(species, m.group(1), canonical), "WARN")
                            announced = True
                        seq_id = "{}_{}".format(canonical, m.group(2))
                        remapped += 1
                out.write(">{}\n{}\n".format(seq_id, str(rec.seq)))
                id_species[seq_id] = species
                count += 1
            n_seq += count
            n_remapped += remapped
            log("  {:28s} {:>9,} sequences{}".format(
                species, count,
                "  ({:,} IDs re-prefixed)".format(remapped) if remapped else ""))
    log("combined FASTA: {:,} sequences, {:.2f} GB".format(
        n_seq, os.path.getsize(combined) / 1e9))

    db_prefix = os.path.join(workdir, "hippeastrum_db")
    cmd = ["makeblastdb", "-in", combined, "-dbtype", "nucl",
           "-out", db_prefix, "-title", "Hippeastrum AmarylOmicBase", "-parse_seqids"]
    log("running makeblastdb ...")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        log("makeblastdb with -parse_seqids failed, retrying without it", "WARN")
        proc = subprocess.run([c for c in cmd if c != "-parse_seqids"],
                              capture_output=True, text=True)
        if proc.returncode != 0:
            log(proc.stderr.strip()[:800], "ERROR")
            raise SystemExit("makeblastdb failed")
    log("BLAST database built: {}".format(db_prefix))
    return db_prefix, id_species, n_seq


BLAST_FIELDS = ["qseqid", "sseqid", "pident", "length", "mismatch", "gapopen",
                "qstart", "qend", "sstart", "send", "evalue", "bitscore",
                "qcovs", "qlen", "slen"]


def run_blast(query, db_prefix, query_kind, workdir, evalue=1e-10,
              min_qcov=50.0, threads=None, max_targets=500):
    program = "blastn" if query_kind == "nucl" else "tblastn"
    out_path = os.path.join(workdir, "blast_raw.tsv")
    threads = threads or max(1, (os.cpu_count() or 2))
    cmd = [program, "-query", query, "-db", db_prefix,
           "-outfmt", "6 " + " ".join(BLAST_FIELDS),
           "-evalue", str(evalue), "-max_target_seqs", str(max_targets),
           "-num_threads", str(threads), "-out", out_path]
    if program == "blastn":
        # the queries may come from a different species, so use the more
        # sensitive blastn task rather than the megablast default
        cmd += ["-task", "blastn"]
    log("running {} ({} threads, E <= {:g}) ...".format(program, threads, evalue))
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        log(proc.stderr.strip()[:800], "ERROR")
        raise SystemExit("{} failed".format(program))

    raw, kept = [], []
    with open(out_path) as fh:
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < len(BLAST_FIELDS):
                continue
            rec = dict(zip(BLAST_FIELDS, parts))
            for k in ("pident", "evalue", "bitscore", "qcovs"):
                rec[k] = float(rec[k])
            for k in ("length", "qlen", "slen"):
                rec[k] = int(rec[k])
            raw.append(rec)
            if rec["evalue"] <= evalue and rec["qcovs"] >= min_qcov:
                kept.append(rec)
    log("{}: {:,} raw HSPs, {:,} pass E <= {:g} and query coverage >= {:.0f} %".format(
        program, len(raw), len(kept), evalue, min_qcov))

    # keep the best HSP per (query, subject)
    best = {}
    for rec in kept:
        key = (rec["qseqid"], rec["sseqid"])
        if key not in best or rec["bitscore"] > best[key]["bitscore"]:
            best[key] = rec
    log("{:,} unique query-transcript pairs after de-duplicating HSPs".format(len(best)))
    return program, list(best.values()), len(raw)


# --------------------------------------------------------------------------- #
# STEP 3 -- expression lookup and SRA metadata
# --------------------------------------------------------------------------- #

def tpm_id_prefixes(tpm_paths):
    """Canonical transcript-ID prefix per species, read from the TPM matrices.

    The nt97 assemblies and the expression matrices do not always agree on the
    species acronym: Hippeastrum sp. is `Hihyb_` (Hippeastrum hybrid) in
    nt97_assemblies but `Hisp_` everywhere else in the record. The two label the
    same transcripts -- identical sequence, identical count, one-to-one on the
    suffix -- so the assembly IDs are rewritten to the matrix's prefix, which is
    also the identifier a reader would use to look the transcript up.
    """
    prefixes = {}
    for path in tpm_paths:
        species = species_from_filename(path)
        with open(path) as fh:
            fh.readline()
            first = fh.readline().split("\t", 1)[0]
        m = re.match(r"^([A-Za-z][A-Za-z0-9]*)_", first)
        if m:
            prefixes[species] = m.group(1)
    return prefixes


def load_tpm_rows(tpm_paths, wanted_by_species):
    """-> ({(species, transcript): {run: tpm}}, {species: [run, ...]})"""
    tpm, runs_by_species = {}, {}
    for path in sorted(tpm_paths):
        species = species_from_filename(path)
        wanted = wanted_by_species.get(species) or set()
        with open(path) as fh:
            header = fh.readline().rstrip("\n").split("\t")
            runs = [h.strip() for h in (header[1:] if header and header[0].strip() == ""
                                        else header) if h.strip()]
            runs_by_species[species] = runs
            found = 0
            if wanted:
                for line in fh:
                    tab = line.find("\t")
                    if tab < 0:
                        continue
                    feature = line[:tab]
                    if feature not in wanted:
                        continue
                    vals = line[tab + 1:].rstrip("\n").split("\t")
                    row = {}
                    for i, run in enumerate(runs):
                        if i < len(vals):
                            try:
                                row[run] = float(vals[i])
                            except ValueError:
                                pass
                    tpm[(species, feature)] = row
                    found += 1
        log("  {:28s} {:>3} runs, {:>3}/{:<3} hit transcripts found".format(
            species, len(runs), found, len(wanted)))
    return tpm, runs_by_species


def _clean(value):
    value = re.sub(r"\s+", " ", (value or "").strip())
    if value.lower() in ("", "na", "n/a", "none", "not applicable", "missing",
                         "not collected", "not provided", "unknown"):
        return ""
    return value


def derive_tissue_condition(attrs):
    """Tissue and condition from a sample's attribute map.

    Kept separate from the XML parsing so that it can be re-applied to cached
    raw attributes: the on-disk cache holds what NCBI returned, never a derived
    label, so changing this logic never requires re-querying NCBI.
    """
    attrs = attrs or {}
    tissue = ""
    for tag in TISSUE_TAGS:
        if attrs.get(tag):
            tissue = attrs[tag]
            break
    # a sample title is free text, not a declared organ -- do not guess from it

    def collect(tags):
        bits = []
        for tag in tags:
            val = attrs.get(tag)
            if val and val.lower() != (tissue or "").lower():
                bits.append("{}: {}".format(tag, val))
        return bits

    bits = collect(TREATMENT_TAGS) or collect(CONTEXT_TAGS)
    condition = "; ".join(bits[:3]) if bits else DEFAULT_CONDITION
    return tissue or DEFAULT_TISSUE, condition


def parse_sra_xml(xml_text):
    """-> {run_accession: {'tissue':..., 'condition':..., 'attributes': {...}}}"""
    out = {}
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        log("could not parse SRA XML: {}".format(exc), "WARN")
        return out
    for pkg in root.iter("EXPERIMENT_PACKAGE"):
        attrs = OrderedDict()
        for attr in pkg.iter("SAMPLE_ATTRIBUTE"):
            tag = _clean(attr.findtext("TAG")).lower()
            val = _clean(attr.findtext("VALUE"))
            if tag and val:
                attrs.setdefault(tag, val)
        title = _clean(pkg.findtext(".//SAMPLE/TITLE")) or _clean(pkg.findtext(".//TITLE"))
        organism = _clean(pkg.findtext(".//SAMPLE_NAME/SCIENTIFIC_NAME"))

        tissue, condition = derive_tissue_condition(attrs)
        for run in pkg.iter("RUN"):
            acc = run.get("accession")
            if not acc:
                continue
            out[acc] = {"tissue": tissue,
                        "condition": condition,
                        "organism": organism,
                        "title": title,
                        "attributes": attrs,
                        "source": "NCBI SRA"}
    return out


def fetch_sra_metadata(run_ids, batch=20, cache_path=None):
    meta = {}
    if cache_path and os.path.exists(cache_path):
        try:
            with open(cache_path) as fh:
                meta = json.load(fh)
            log("loaded {} cached SRA records".format(len(meta)))
        except (OSError, json.JSONDecodeError):
            meta = {}
    todo = [r for r in sorted(set(run_ids)) if r not in meta]
    if todo:
        log("querying NCBI E-utilities for {} run accessions "
            "(<= 3 requests/second)".format(len(todo)))
        for i in range(0, len(todo), batch):
            chunk = todo[i:i + batch]
            r = http_get(EUTILS + "/efetch.fcgi",
                         params={"db": "sra", "id": ",".join(chunk), "rettype": "xml"},
                         rate=NCBI)
            if r is not None:
                got = parse_sra_xml(r.text)
                meta.update(got)
            log("  {}/{} accessions processed".format(min(i + batch, len(todo)), len(todo)))
        # ENA fallback for anything NCBI did not return
        still = [r for r in todo if r not in meta]
        if still:
            log("{} runs unresolved at NCBI -- trying ENA".format(len(still)), "WARN")
            for i in range(0, len(still), 40):
                chunk = still[i:i + 40]
                q = " OR ".join('run_accession="{}"'.format(a) for a in chunk)
                r = http_get(ENA_SEARCH, params={
                    "result": "read_run", "query": q, "format": "tsv", "limit": 0,
                    "fields": "run_accession,scientific_name,sample_title,tissue_type,"
                              "dev_stage,description,sample_description"})
                if r is None or not r.text.strip():
                    continue
                lines = r.text.rstrip("\n").split("\n")
                head = lines[0].split("\t")
                for line in lines[1:]:
                    vals = line.split("\t")
                    rec = {head[j]: (vals[j] if j < len(vals) else "")
                           for j in range(len(head))}
                    acc = rec.get("run_accession")
                    if not acc:
                        continue
                    meta[acc] = {
                        "tissue": _clean(rec.get("tissue_type")) or DEFAULT_TISSUE,
                        "condition": ("dev_stage: " + _clean(rec["dev_stage"]))
                                     if _clean(rec.get("dev_stage")) else DEFAULT_CONDITION,
                        "organism": _clean(rec.get("scientific_name")),
                        "title": _clean(rec.get("sample_title")),
                        "attributes": {k: v for k, v in rec.items() if v},
                        "source": "ENA (NCBI returned no record)"}
        if cache_path:
            try:
                with open(cache_path, "w") as fh:
                    json.dump(meta, fh, indent=1, sort_keys=True)
            except OSError:
                pass
    # the cache stores raw attributes; labels are always re-derived
    for rec in meta.values():
        if rec.get("attributes"):
            rec["tissue"], rec["condition"] = derive_tissue_condition(rec["attributes"])
    resolved = sum(1 for r in set(run_ids) if r in meta)
    log("SRA metadata resolved for {}/{} run accessions".format(
        resolved, len(set(run_ids))))
    return meta, resolved


# --------------------------------------------------------------------------- #
# STEP 4 -- reporting
# --------------------------------------------------------------------------- #

CSV_COLUMNS = [
    "Query_Sequence_Name",              # 1
    "Hippeastrum_Species",              # 2
    "Hit_Transcript_ID",                # 3
    "Identity_%",                       # 4a
    "E-value",                          # 4b
    "Sampled_Tissues",                  # 5
    "Sampled_Conditions",               # 6
    "Top_Expressing_Sample_Metadata",   # 7
    "Max_TPM_Value",                    # 8
    # supporting detail
    "BLAST_Program", "Query_Coverage_%", "Alignment_Length", "Bitscore",
    "Subject_Length_bp", "Top_Run_Accession", "N_Runs_Total", "N_Runs_TPM_gt1",
    "Tissue_Max_TPM", "Condition_Max_TPM", "Top_Sample_Attributes", "Metadata_Source",
]

MD_COLUMNS = ["Query_Sequence_Name", "Hippeastrum_Species", "Hit_Transcript_ID",
              "Identity_%", "E-value", "Sampled_Tissues", "Sampled_Conditions",
              "Top_Expressing_Sample_Metadata", "Max_TPM_Value"]


def build_rows(hits, id_species, tpm, meta, tpm_threshold=1.0, program="blastn"):
    rows = []
    for hit in sorted(hits, key=lambda h: (h["qseqid"], h["evalue"], -h["bitscore"])):
        tx = hit["sseqid"]
        species = id_species.get(tx, "unknown")
        profile = tpm.get((species, tx), {})

        by_tissue, by_condition = defaultdict(float), defaultdict(float)
        n_gt1 = 0
        for run, value in profile.items():
            info = meta.get(run) or {}
            tissue = info.get("tissue", DEFAULT_TISSUE)
            condition = info.get("condition", DEFAULT_CONDITION)
            if value > tpm_threshold:
                n_gt1 += 1
                by_tissue[tissue] = max(by_tissue[tissue], value)
                by_condition[condition] = max(by_condition[condition], value)

        if profile:
            top_run, max_tpm = max(profile.items(), key=lambda kv: kv[1])
        else:
            top_run, max_tpm = "", float("nan")
        top_info = meta.get(top_run) or {}
        top_meta = " | ".join(x for x in (top_info.get("tissue"),
                                          top_info.get("condition")) if x) or "no metadata"

        rows.append({
            "Query_Sequence_Name": hit["qseqid"],
            "Hippeastrum_Species": species.replace("_", " "),
            "Hit_Transcript_ID": tx,
            "Identity_%": "{:.2f}".format(hit["pident"]),
            "E-value": "{:.2e}".format(hit["evalue"]),
            "Sampled_Tissues": "; ".join(k for k, _ in sorted(
                by_tissue.items(), key=lambda kv: -kv[1])) or "none above TPM %.1f" % tpm_threshold,
            "Sampled_Conditions": "; ".join(k for k, _ in sorted(
                by_condition.items(), key=lambda kv: -kv[1])) or "none above TPM %.1f" % tpm_threshold,
            "Top_Expressing_Sample_Metadata": top_meta,
            "Max_TPM_Value": "" if profile == {} else "{:.4f}".format(max_tpm),
            "BLAST_Program": program,
            "Query_Coverage_%": "{:.0f}".format(hit["qcovs"]),
            "Alignment_Length": hit["length"],
            "Bitscore": "{:.1f}".format(hit["bitscore"]),
            "Subject_Length_bp": hit["slen"],
            "Top_Run_Accession": top_run,
            "N_Runs_Total": len(profile),
            "N_Runs_TPM_gt1": n_gt1,
            "Tissue_Max_TPM": "; ".join("{}={:.2f}".format(k, v) for k, v in
                                        sorted(by_tissue.items(), key=lambda kv: -kv[1])),
            "Condition_Max_TPM": "; ".join("{}={:.2f}".format(k, v) for k, v in
                                           sorted(by_condition.items(), key=lambda kv: -kv[1])),
            "Top_Sample_Attributes": "; ".join(
                "{}={}".format(k, v) for k, v in
                ((meta.get(top_run) or {}).get("attributes") or {}).items()),
            "Metadata_Source": (meta.get(top_run) or {}).get("source", ""),
        })
    return rows


def markdown_table(rows, columns=MD_COLUMNS, max_cell=46):
    def cell(value):
        text = str(value).replace("|", "/")
        return text if len(text) <= max_cell else text[:max_cell - 1] + "…"
    out = ["| " + " | ".join(columns) + " |",
           "|" + "|".join(["---"] * len(columns)) + "|"]
    for row in rows:
        out.append("| " + " | ".join(cell(row.get(c, "")) for c in columns) + " |")
    return "\n".join(out)


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description="BLAST query sequences against the Hippeastrum transcriptomes "
                    "of AmarylOmicBase and map hits to tissue/condition expression.")
    p.add_argument("--query", default="input.fasta", help="query FASTA (default: input.fasta)")
    p.add_argument("--workdir", default="hippeastrum_work", help="cache and intermediates")
    p.add_argument("--outdir", default=".", help="where the CSV is written")
    p.add_argument("--out-name", default="Hippeastrum_BLAST_expression_results.csv")
    p.add_argument("--record", default=ZENODO_RECORD)
    p.add_argument("--evalue", type=float, default=1e-10)
    p.add_argument("--min-qcov", type=float, default=50.0)
    p.add_argument("--tpm-threshold", type=float, default=1.0)
    p.add_argument("--threads", type=int, default=0)
    p.add_argument("--max-target-seqs", type=int, default=500)
    p.add_argument("--no-fallback-assembly", action="store_true",
                   help="do not pull missing Hippeastrum assemblies from the "
                        "per-species transcriptome archive")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    workdir = os.path.abspath(args.workdir)
    outdir = os.path.abspath(args.outdir)
    cache_dir = os.path.join(workdir, "zenodo")
    asm_dir = os.path.join(workdir, "hippeastrum_assemblies")
    tpm_dir = os.path.join(workdir, "hippeastrum_tpm")
    for d in (workdir, outdir, cache_dir, asm_dir, tpm_dir):
        os.makedirs(d, exist_ok=True)

    if not os.path.exists(args.query):
        raise SystemExit("query FASTA not found: {}".format(os.path.abspath(args.query)))

    for tool in ("makeblastdb", "blastn", "tblastn"):
        if shutil.which(tool) is None:
            raise SystemExit("required BLAST+ tool not on PATH: {}".format(tool))

    banner("STEP 1  Targeted extraction from Zenodo record {}".format(args.record))
    catalogue = zenodo_catalogue(args.record)
    for key in (ASSEMBLY_ARCHIVE, EXPRESSION_ARCHIVE):
        if key not in catalogue:
            raise SystemExit("archive {} is not in record {}".format(key, args.record))

    asm_path = ensure_archive(catalogue[ASSEMBLY_ARCHIVE], cache_dir)
    assemblies = extract_matching(asm_path, asm_dir, is_hippeastrum_fasta,
                                  "{} assemblies".format(GENUS))
    expr_path = ensure_archive(catalogue[EXPRESSION_ARCHIVE], cache_dir)
    tpm_files = extract_matching(expr_path, tpm_dir, is_hippeastrum_tpm,
                                 "{} isoform TPM matrices".format(GENUS))

    have = {species_from_filename(p) for p in assemblies}
    want = {species_from_filename(p) for p in tpm_files}
    if not args.no_fallback_assembly:
        assemblies += resolve_missing_assemblies(catalogue, cache_dir, asm_dir,
                                                 have, want)
    if not assemblies:
        raise SystemExit("no Hippeastrum assemblies were extracted")
    if not tpm_files:
        raise SystemExit("no Hippeastrum TPM matrices were extracted")
    log("assemblies: {}".format(", ".join(sorted(species_from_filename(p) for p in assemblies))))
    log("TPM matrices: {}".format(", ".join(sorted(species_from_filename(p) for p in tpm_files))))

    banner("STEP 2  BLAST database and search")
    query_kind, query_ids, query_records = detect_query_type(args.query)
    log("query file {}: {} sequences, detected as {}".format(
        args.query, len(query_ids), "nucleotide" if query_kind == "nucl" else "protein"))
    for rec in query_records:
        log("  {:38s} {:>6} {}".format(rec.id[:38], len(rec.seq),
                                       "bp" if query_kind == "nucl" else "aa"))
    id_prefixes = tpm_id_prefixes(tpm_files)
    log("canonical transcript-ID prefixes from the TPM matrices: {}".format(
        ", ".join("{}={}_".format(k, v) for k, v in sorted(id_prefixes.items()))))
    db_prefix, id_species, n_db_seq = build_blast_db(assemblies, workdir,
                                                     id_prefixes=id_prefixes)
    program, hits, n_raw = run_blast(args.query, db_prefix, query_kind, workdir,
                                     evalue=args.evalue, min_qcov=args.min_qcov,
                                     threads=args.threads or None,
                                     max_targets=args.max_target_seqs)
    if not hits:
        log("no hits passed the filters -- nothing to map", "WARN")

    banner("STEP 3  Expression and SRA metadata")
    wanted_by_species = defaultdict(set)
    for hit in hits:
        wanted_by_species[id_species.get(hit["sseqid"], "unknown")].add(hit["sseqid"])
    tpm, runs_by_species = load_tpm_rows(tpm_files, wanted_by_species)
    run_ids = sorted({r for runs in runs_by_species.values() for r in runs})
    log("{} distinct SRA run accessions across the {} matrices".format(
        len(run_ids), len(tpm_files)))
    meta, n_resolved = fetch_sra_metadata(
        run_ids, cache_path=os.path.join(workdir, "sra_metadata.json"))

    banner("STEP 4  Reporting")
    rows = build_rows(hits, id_species, tpm, meta,
                      tpm_threshold=args.tpm_threshold, program=program)
    csv_path = os.path.join(outdir, args.out_name)
    with open(csv_path, "w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    log("wrote {} ({} rows)".format(csv_path, len(rows)))

    md_path = os.path.splitext(csv_path)[0] + ".md"
    table = markdown_table(rows)
    with open(md_path, "w") as fh:
        fh.write("# Hippeastrum BLAST + expression results\n\n")
        fh.write("Query: `{}` ({} sequences, {}) | program: {} | "
                 "E <= {:g}, query coverage >= {:.0f} %\n\n".format(
                     os.path.basename(args.query), len(query_ids),
                     "nucleotide" if query_kind == "nucl" else "protein",
                     program, args.evalue, args.min_qcov))
        fh.write(table + "\n")
    log("wrote {}".format(md_path))

    print()
    print(table)
    print()

    banner("SUMMARY")
    per_query = defaultdict(int)
    for row in rows:
        per_query[row["Query_Sequence_Name"]] += 1
    summary = [
        ("Zenodo record", args.record),
        ("Hippeastrum assemblies used", len(assemblies)),
        ("Transcripts in BLAST database", "{:,}".format(n_db_seq)),
        ("Query sequences", "{} ({})".format(
            len(query_ids), "nucleotide" if query_kind == "nucl" else "protein")),
        ("BLAST program", program),
        ("Raw HSPs", "{:,}".format(n_raw)),
        ("Hits passing E <= {:g} and coverage >= {:.0f} %".format(
            args.evalue, args.min_qcov), len(hits)),
        ("TPM matrices searched", len(tpm_files)),
        ("SRA run accessions encountered", len(run_ids)),
        ("SRA accessions mapped to metadata", "{} / {}".format(n_resolved, len(run_ids))),
        ("Rows written", len(rows)),
        ("Output CSV", csv_path),
        ("Wall time", "{:.1f} s".format(time.time() - _T0)),
    ]
    width = max(len(str(k)) for k, _ in summary) + 2
    for key, value in summary:
        print("  {:<{w}} {}".format(str(key) + ":", value, w=width))
    print("\n  hits per query:")
    for qid in query_ids:
        print("    {:<40s} {}".format(qid[:40], per_query.get(qid, 0)))
    print("=" * 78)
    return 0


if __name__ == "__main__":
    sys.exit(main())
