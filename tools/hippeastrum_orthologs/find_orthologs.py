#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
find_orthologs.py -- identify true orthologs of Brachypodium distachyon DAHP
synthases in the two Hippeastrum proteomes of AmarylOmicBase (Zenodo 17307476),
using two orthogonal criteria: Reciprocal Best Hit and phylogenetic clustering.

STEP 0  write Bd_DHS_queries.fasta (the four query sequences)
STEP 1  stream the Zenodo archives and extract ONLY the Hippeastrum sp. and
        H. vittatum peptide FASTAs and Trinotate reports; fetch the B. distachyon
        reference proteome; build three DIAMOND databases
STEP 2  RBH -- forward diamond blastp queries -> Hippeastrum, reverse best hits
        -> B. distachyon reference, validated when the reverse best hit returns
        to the original query locus
STEP 3  domain-aware phylogeny -- Trinotate PF00793/PF01474 candidates + the
        queries -> mafft --auto -> fasttree -> Bio.Phylo clade inspection
STEP 4  Hippeastrum_DHS_Orthologs.csv + a Markdown summary

Requires: diamond, mafft, fasttree on PATH; requests, biopython, pandas.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import os
import re
import shutil
import subprocess
import sys
import tarfile
import time
from collections import OrderedDict, defaultdict

import requests
from Bio import Phylo, SeqIO

ZENODO_RECORD = "17307476"
ZENODO_API = "https://zenodo.org/api/records/{rec}"
PROTEOME_ARCHIVE = "Amaryllidoideae_proteome.tar.gz"
ANNOTATION_ARCHIVE = "Amaryllidoideae_annotation_report.tar.gz"
BD_PROTEOME_URL = ("https://ftp.ebi.ac.uk/ensemblgenomes/pub/plants/current/fasta/"
                   "brachypodium_distachyon/pep/"
                   "Brachypodium_distachyon.Brachypodium_distachyon_v3.0.pep.all.fa.gz")
SPECIES = ["Hippeastrum_sp", "Hippeastrum_vittatum"]
DAHP_PFAM = ("PF00793", "PF01474")

QUERIES_FASTA = """\
>BdDHS1a | Bradi1g21330 (Brachypodium distachyon)
MASAAVTTTSPATLSPSSLRLRRPASRASSRGAPLAVRCASAAPAPAAADGGVELS
RVRSLAKPAALAGAATAAATPATADAVVAASSRRAVAVKGGAEIKELRRRGLINVY
DSESFGLRGLIAGSFSKPLVKVVVSRDENGKLIAAGGLNTRNPVETAELVKILKEL
GCNVDVVQVASYKEDILAFALLSGAEPIDFLINIPHSQEHLTQTLDVVKEKGVLAY
DCGNVTSEIDIIRALNKKGIRCYGVFPGQISVGKDGVLRYAEEAAGLPIKTIISLD
DIRTYTQALERMGVTICSMKDPERLRDILKKLPNISVGSRLGGVTPEEFFAKVQGL
SDELLKGYEDLCEKLGSEVIACEDMDRHLPGHTI
>BdDHS1b | Bradi1g60750 (Brachypodium distachyon) - Deregulated Isoform
MASAAVTTTSPATLSPSSLRLRRPASRASSRGAPLAVRCASAAPAPAAADGGVELS
RVRSLAKPAALAGAATAAATPATADAVVAASSRRAVAVKGGAEIKELRRRGLINVY
DSESFGLRGLIAGSFSKPLVKVVVSRDENGKLIAAGGLNTRNPVETAELVKILKEL
GCNVDVVQVASYKEDILAFALLSGAEPIDFLINIPHSQEHLTQTLDVVKEKGVLAY
DCGNVTSEIDIIRALNKKGIRCYGVFPGQISVGKDGVLRYAEEAAGLPIKTIISLD
DIRTYTQALERMGVTICSMKDPERLRDILKKLPNISVGSRLGGVTPEEFFAKVQGL
SDELLKGYEDLCEKLGSEVIACEDMDRHLPGHTI
>BdDHS2 | Bradi3g38670 (Brachypodium distachyon)
MAAAAASSLSLSPSPSSSRLSRRPLSRASSSSAPLRVRCASAAPAPAAADGGVELS
RVRSLAKPAALAGATATAAATPATADAVVAASSRRAVAVKGGAEIKELRRRGLINV
YDSESFGLRGLIAGSFSKPLVKVVVSRDENGKLIAAGGLNTRNPVETAELVKILKE
LGCNVDVVQVASYKEDILAFALLSGAEPIDFLINIPHSQEHLTQTLDVVKEKGVLA
YDCGNVTSEIDIIRALNKKGIRCYGVFPGQISVGKDGVLRYAEEAAGLPIKTIISL
DDIRTYTQALERMGVTICSMKDPERLRDILKKLPNISVGSRLGGVTPEEFFAKVQG
LSDELLKGYEDLCEKLGSEVIACEDMDRHLPGHTI
>BdDHSnc | Bradi3g33650 (Brachypodium distachyon)
MASAAVTTTSPATLSPSSLRLRRPASRASSRGAPLAVRCASAAPAPAAADGGVELS
RVRSLAKPAALAGAATAAATPATADAVVAASSRRAVAVKGGAEIKELRRRGLINVY
DSESFGLRGLIAGSFSKPLVKVVVSRDENGKLIAAGGLNTRNPVETAELVKILKEL
GCNVDVVQVASYKEDILAFALLSGAEPIDFLINIPHSQEHLTQTLDVVKEKGVLAY
DCGNVTSEIDIIRALNKKGIRCYGVFPGQISVGKDGVLRYAEEAAGLPIKTIISLD
DIRTYTQALERMGVTICSMKDPERLRDILKKLPNISVGSRLGGVTPEEFFAKVQGL
SDELLKGYEDLCEKLGSEVIACEDMDRHLPGHTI
"""

_T0 = time.time()


def log(msg, level="INFO"):
    print("[{:>7.1f}s {}] {}".format(time.time() - _T0, level, msg), flush=True)


def banner(text):
    print("\n" + "=" * 78 + "\n" + text + "\n" + "=" * 78, flush=True)


def run(cmd, what):
    log("$ " + " ".join(str(c) for c in cmd[:9]) + (" ..." if len(cmd) > 9 else ""))
    proc = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if proc.returncode != 0:
        log(proc.stderr.strip()[:900], "ERROR")
        raise SystemExit("{} failed".format(what))
    return proc


def bd_protein_to_locus(fasta_path):
    """{protein id: locus} from the Ensembl Plants headers.

    Ensembl protein identifiers (KQK15223, PNS24245 ...) carry no locus, so the
    reverse best hit can only be matched back to the query gene through the
    `gene:BRADI_1g21330v3` field in the description. Without this map RBH can
    never validate.
    """
    out = {}
    with open(fasta_path) as fh:
        for line in fh:
            if not line.startswith(">"):
                continue
            pid = line[1:].split()[0]
            m = re.search(r"gene:(\S+)", line)
            if m:
                loc = norm_locus(m.group(1))
                if loc:
                    out[pid] = loc
    return out


def norm_locus(text):
    """Bradi1g21330 / BRADI_1g21330v3 / Bradi1g21330.1 -> 1g21330 (for RBH matching)."""
    if not text:
        return ""
    m = re.search(r"(?:bradi_?)(\d+g\d+)", text, re.I)
    return m.group(1).lower() if m else ""


# --------------------------------------------------------------------------- #
# STEP 1
# --------------------------------------------------------------------------- #

def http_download(url, dest, expect=None, retries=5):
    if os.path.exists(dest) and (expect is None or os.path.getsize(dest) == expect):
        log("cached   {} ({:.2f} GB)".format(os.path.basename(dest),
                                             os.path.getsize(dest) / 1e9))
        return dest
    for attempt in range(1, retries + 1):
        have = os.path.getsize(dest) if os.path.exists(dest) else 0
        if expect is not None and have == expect:
            return dest
        headers = {"User-Agent": "ortholog-finder/1.0"}
        if have:
            headers["Range"] = "bytes={}-".format(have)
        try:
            with requests.get(url, headers=headers, stream=True, timeout=300) as r:
                r.raise_for_status()
                mode = "ab" if (have and r.status_code == 206) else "wb"
                with open(dest, mode) as fh:
                    for chunk in r.iter_content(1 << 20):
                        fh.write(chunk)
        except Exception as exc:                                  # noqa: BLE001
            log("download error ({}), retry {}/{}".format(type(exc).__name__, attempt, retries),
                "WARN")
            time.sleep(3 * attempt)
            continue
        if expect is None or os.path.getsize(dest) == expect:
            return dest
    raise SystemExit("could not download " + url)


def stream_extract(archive, outdir, predicate, label):
    os.makedirs(outdir, exist_ok=True)
    written = []
    log("streaming {} for {}".format(os.path.basename(archive), label))
    with tarfile.open(archive, mode="r|gz") as tar:
        for member in tar:
            if not member.isfile() or not predicate(member.name):
                continue
            fh = tar.extractfile(member)
            if fh is None:
                continue
            dest = os.path.join(outdir, os.path.basename(member.name))
            with open(dest, "wb") as out:
                shutil.copyfileobj(fh, out, 1 << 20)
            written.append(dest)
            log("  extracted {} ({:.1f} MB)".format(os.path.basename(member.name),
                                                    member.size / 1e6))
    return written


def species_of(path):
    base = os.path.basename(path)
    for suf in (".fasta", ".fa", ".tsv", ".out"):
        if base.endswith(suf):
            base = base[: -len(suf)]
    return base


def step1(workdir, offline=False):
    banner("STEP 1  Targeted retrieval and DIAMOND databases")
    cache = os.path.join(workdir, "zenodo")
    pep_dir = os.path.join(workdir, "peptides")
    ann_dir = os.path.join(workdir, "annotation")
    db_dir = os.path.join(workdir, "diamond")
    for d in (cache, pep_dir, ann_dir, db_dir):
        os.makedirs(d, exist_ok=True)

    r = requests.get(ZENODO_API.format(rec=ZENODO_RECORD), timeout=120)
    r.raise_for_status()
    payload = r.json()
    files = {f["key"]: f for f in payload.get("files") or []}
    log("Zenodo record: {}".format(payload.get("title", "?")[:70]))

    def want_species(name):
        base = os.path.basename(name)
        return any(base.startswith(s + ".") for s in SPECIES)

    pep_archive = http_download(
        (files[PROTEOME_ARCHIVE].get("links") or {}).get("self"),
        os.path.join(cache, PROTEOME_ARCHIVE), files[PROTEOME_ARCHIVE].get("size"))
    peptides = stream_extract(pep_archive, pep_dir, want_species,
                              "Hippeastrum peptide FASTAs")
    ann_archive = http_download(
        (files[ANNOTATION_ARCHIVE].get("links") or {}).get("self"),
        os.path.join(cache, ANNOTATION_ARCHIVE), files[ANNOTATION_ARCHIVE].get("size"))
    reports = stream_extract(ann_archive, ann_dir, want_species,
                             "Hippeastrum Trinotate reports")

    # B. distachyon reference proteome
    bd_gz = os.path.join(cache, "Bd_reference_proteome.fa.gz")
    bd_fa = os.path.join(workdir, "Bd_reference_proteome.fasta")
    if not os.path.exists(bd_fa):
        http_download(BD_PROTEOME_URL, bd_gz)
        log("decompressing the B. distachyon reference proteome")
        with gzip.open(bd_gz, "rb") as src, open(bd_fa, "wb") as dst:
            shutil.copyfileobj(src, dst, 1 << 20)
    n_bd = sum(1 for _ in SeqIO.parse(bd_fa, "fasta"))
    log("Bd_reference_proteome.fasta: {:,} proteins".format(n_bd))

    dbs = {}
    for path in peptides + [bd_fa]:
        name = species_of(path) if path != bd_fa else "Bd_reference"
        out = os.path.join(db_dir, name)
        if not os.path.exists(out + ".dmnd"):
            run(["diamond", "makedb", "--in", path, "-d", out, "--quiet"],
                "diamond makedb")
        dbs[name] = out + ".dmnd"
        log("  DIAMOND db {:22s} {}".format(name, os.path.basename(dbs[name])))
    return peptides, reports, bd_fa, dbs


# --------------------------------------------------------------------------- #
# STEP 2 -- Reciprocal Best Hit
# --------------------------------------------------------------------------- #

BLAST_COLS = "qseqid sseqid pident length evalue bitscore qcovhsp scovhsp"


def diamond_blastp(query, db, out, threads=0, evalue=1e-5, sensitive=True, max_target=25):
    cmd = ["diamond", "blastp", "-q", query, "-d", db, "-o", out,
           "--outfmt", "6"] + BLAST_COLS.split() + [
           "--evalue", str(evalue), "--max-target-seqs", str(max_target), "--quiet"]
    if sensitive:
        cmd.append("--very-sensitive")
    if threads:
        cmd += ["--threads", str(threads)]
    run(cmd, "diamond blastp")
    rows = []
    if os.path.exists(out):
        with open(out) as fh:
            for line in fh:
                p = line.rstrip("\n").split("\t")
                if len(p) < 8:
                    continue
                rows.append({"qseqid": p[0], "sseqid": p[1], "pident": float(p[2]),
                             "length": int(p[3]), "evalue": float(p[4]),
                             "bitscore": float(p[5]), "qcovhsp": float(p[6]),
                             "scovhsp": float(p[7])})
    return rows


def best_by_bitscore(rows, key="qseqid"):
    best = {}
    for r in rows:
        k = r[key]
        if k not in best or r["bitscore"] > best[k]["bitscore"]:
            best[k] = r
    return best


def step2_rbh(queries_fasta, dbs, workdir, query_loci, threads=0, bd_locus=None):
    banner("STEP 2  Method 1 -- Reciprocal Best Hit")
    outdir = os.path.join(workdir, "rbh")
    os.makedirs(outdir, exist_ok=True)
    forward, reverse_valid = {}, {}

    for species in SPECIES:
        if species not in dbs:
            log("no DIAMOND db for {}".format(species), "WARN")
            continue
        fwd_out = os.path.join(outdir, "fwd_{}.tsv".format(species))
        rows = diamond_blastp(queries_fasta, dbs[species], fwd_out, threads)
        top = best_by_bitscore(rows)
        log("{}: {} HSP rows, top hit for {}/4 queries".format(
            species, len(rows), len(top)))
        for q, r in sorted(top.items()):
            log("   forward  {:<10s} -> {:<34s} {:.1f}% id, E={:.1e}, bits={:.0f}".format(
                q, r["sseqid"], r["pident"], r["evalue"], r["bitscore"]))
        forward[species] = top

    # reverse: the forward top hits back against the B. distachyon proteome
    hit_ids = sorted({r["sseqid"] for top in forward.values() for r in top.values()})
    if not hit_ids:
        log("no forward hits at all -- RBH cannot proceed", "WARN")
        return forward, {}
    pep_index = {}
    for species in SPECIES:
        path = os.path.join(workdir, "peptides", species + ".fasta")
        if os.path.exists(path):
            for rec in SeqIO.parse(path, "fasta"):
                if rec.id in hit_ids:
                    pep_index[rec.id] = (species, str(rec.seq).rstrip("*"))
    rev_query = os.path.join(outdir, "reverse_queries.fasta")
    with open(rev_query, "w") as fh:
        for hid in hit_ids:
            if hid in pep_index:
                fh.write(">{}\n{}\n".format(hid, pep_index[hid][1]))
    log("reverse search: {} Hippeastrum proteins vs the B. distachyon proteome"
        .format(len(pep_index)))
    rev_rows = diamond_blastp(rev_query, dbs["Bd_reference"],
                              os.path.join(outdir, "reverse.tsv"), threads)
    rev_top = best_by_bitscore(rev_rows)
    bd_locus = bd_locus or {}
    for h, r in sorted(rev_top.items()):
        r["locus"] = bd_locus.get(r["sseqid"]) or norm_locus(r["sseqid"])
        log("   reverse  {:<34s} -> {:<12s} (gene {:<10s}) bits={:.0f}".format(
            h, r["sseqid"], r["locus"] or "?", r["bitscore"]))
    return forward, rev_top


# --------------------------------------------------------------------------- #
# STEP 3 -- domain-aware phylogeny
# --------------------------------------------------------------------------- #

def trinotate_dahp_ids(report_path, max_rows=None):
    """Protein IDs whose Trinotate Pfam column carries a DAHP synthase domain."""
    ids = set()
    with open(report_path, encoding="utf-8", errors="replace") as fh:
        header = fh.readline().rstrip("\n").split("\t")
        header[0] = header[0].lstrip("#")
        idx = {n: i for i, n in enumerate(header)}
        i_pfam, i_prot = idx.get("Pfam"), idx.get("prot_id")
        if i_pfam is None or i_prot is None:
            return ids
        markers = tuple(p.lower().encode() for p in DAHP_PFAM)
        for n, raw in enumerate(fh):
            low = raw.lower().encode() if isinstance(raw, str) else raw.lower()
            if not any(m in low for m in markers):
                continue
            f = raw.rstrip("\n").split("\t")
            if i_pfam >= len(f) or i_prot >= len(f):
                continue
            if not any(p in f[i_pfam] for p in DAHP_PFAM):
                continue
            if f[i_prot] and f[i_prot] != ".":
                ids.add(f[i_prot])
            if max_rows and n > max_rows:
                break
    return ids


def step3_phylogeny(reports, workdir, queries_fasta, threads=0, min_frac=0.5,
                    min_core_cov=0.7):
    """Build the DAHP phylogeny from the Trinotate-annotated candidates.

    Short TransDecoder fragments must be excluded. A 200-aa fragment of a 500-aa
    enzyme aligns to a minority of the columns, so its pairwise distance is
    computed over very few shared positions and comes out spuriously small: in
    this dataset an unfiltered tree put a 201-aa fragment 0.022 substitutions
    from a Brachypodium query, which is far too close for a ~150 My divergence,
    and displaced the genuine full-length ortholog. Candidates shorter than
    `min_frac` of the median query length are therefore dropped from the tree.
    """
    banner("STEP 3  Method 2 -- domain-aware phylogenetic inference")
    cand = {}
    for report in reports:
        species = species_of(report)
        ids = trinotate_dahp_ids(report)
        log("{}: {} proteins carry {} in the Trinotate Pfam column".format(
            species, len(ids), " or ".join(DAHP_PFAM)))
        cand[species] = ids

    qlens = sorted(len(r.seq) for r in SeqIO.parse(queries_fasta, "fasta"))
    min_len = int(qlens[len(qlens) // 2] * min_frac)
    log("length filter for the tree: >= {} aa ({:.0%} of the median query length "
        "{} aa)".format(min_len, min_frac, qlens[len(qlens) // 2]))

    all_fa = os.path.join(workdir, "all_DHS_candidates.fasta")
    seq_species = {}
    n, dropped = 0, []
    with open(all_fa, "w") as out:
        for rec in SeqIO.parse(queries_fasta, "fasta"):
            out.write(">{}\n{}\n".format(rec.id, str(rec.seq)))
            seq_species[rec.id] = "Brachypodium distachyon (query)"
            n += 1
        for species in SPECIES:
            path = os.path.join(workdir, "peptides", species + ".fasta")
            want = cand.get(species) or set()
            if not (os.path.exists(path) and want):
                continue
            got = 0
            for rec in SeqIO.parse(path, "fasta"):
                if rec.id not in want:
                    continue
                seq = str(rec.seq).rstrip("*")
                if len(seq) < min_len:
                    dropped.append((rec.id, len(seq)))
                    continue
                out.write(">{}\n{}\n".format(rec.id, seq))
                seq_species[rec.id] = species.replace("_", " ")
                got += 1
                n += 1
            log("  {}: {} peptide sequences kept".format(species, got))
    if dropped:
        log("{} candidates dropped as too short for a reliable tree (shortest {} aa, "
            "longest dropped {} aa)".format(len(dropped), min(d[1] for d in dropped),
                                            max(d[1] for d in dropped)), "WARN")
    log("all_DHS_candidates.fasta: {} sequences".format(n))
    if n < 4:
        log("too few sequences to build a tree", "WARN")
        return None, seq_species, cand

    aligned = os.path.join(workdir, "aligned_DHS.fasta")
    log("running mafft --auto ...")
    with open(aligned, "w") as fh:
        cmd = ["mafft", "--auto", "--quiet"]
        if threads:
            cmd += ["--thread", str(threads)]
        proc = subprocess.run(cmd + [all_fa], stdout=fh, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        log(proc.stderr.strip()[:600], "ERROR")
        raise SystemExit("mafft failed")
    # Trim to well-occupied columns and drop sequences that do not cover the core.
    # Without this the tree is dominated by a coverage artefact: a partial peptide
    # lacks the fast-evolving N-terminal transit peptide, so it scores a HIGHER
    # percent identity to the query than a full-length ortholog does (here 86.7 %
    # over 398 columns versus 79.6 % over 519) and is pulled in as the false
    # nearest neighbour.
    trimmed = os.path.join(workdir, "aligned_DHS_trimmed.fasta")
    aln = list(SeqIO.parse(aligned, "fasta"))
    ncol = len(aln[0].seq) if aln else 0
    occ = [sum(1 for r in aln if r.seq[i] != "-") / float(len(aln)) for i in range(ncol)]
    core = [i for i, o in enumerate(occ) if o >= 0.5]
    log("alignment {} columns -> {} core columns (>= 50 % occupancy)".format(ncol, len(core)))
    kept, thin = [], []
    for rec in aln:
        cov = sum(1 for i in core if rec.seq[i] != "-") / float(max(len(core), 1))
        is_query = seq_species.get(rec.id, "").startswith("Brachypodium")
        if is_query or cov >= min_core_cov:
            kept.append((rec, cov))
        else:
            thin.append((rec.id, cov))
    if thin:
        log("{} candidates dropped for covering < {:.0%} of the alignment core: {}"
            .format(len(thin), min_core_cov,
                    ", ".join("{} ({:.0%})".format(i, c) for i, c in thin[:6])), "WARN")
    with open(trimmed, "w") as fh:
        for rec, cov in kept:
            fh.write(">{}\n{}\n".format(rec.id, "".join(rec.seq[i] for i in core)))
    log("tree input: {} sequences x {} columns".format(len(kept), len(core)))
    for rec, cov in kept:
        if not seq_species.get(rec.id, "").startswith("Brachypodium"):
            seq_species.setdefault(rec.id, seq_species.get(rec.id, ""))
    aligned = trimmed

    tree_path = os.path.join(workdir, "DHS_phylogeny.tree")
    log("running fasttree ...")
    proc = subprocess.run(["fasttree", "-out", tree_path, aligned],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        log(proc.stderr.strip()[:600], "ERROR")
        raise SystemExit("fasttree failed")
    log("wrote {}".format(tree_path))
    return tree_path, seq_species, cand


def pick_outgroup(tree, query_ids, seq_species):
    """The most divergent Hippeastrum leaves, used to root the gene tree.

    Midpoint rooting is unreliable here because the Brachypodium queries are the
    longest branches, so the midpoint falls among them. Rooting on the most
    distant Hippeastrum sequences (the class-I / KDSA-like outgroup that the
    Pfam search also returns) puts the root outside the ingroup instead.
    """
    leaves = [t for t in tree.get_terminals() if t.name]
    ingroup = [t for t in leaves if t.name in query_ids]
    if not ingroup:
        return None
    scored = []
    for t in leaves:
        if t.name in query_ids:
            continue
        d = sum(tree.distance(t, q) for q in ingroup) / len(ingroup)
        scored.append((d, t.name, t))
    if not scored:
        return None
    # sort on (distance, name): Clade objects are not orderable, so a tie on
    # distance would otherwise raise
    scored.sort(key=lambda x: (-x[0], x[1]))
    return scored[0][2]


def clade_partners(tree_path, query_ids, seq_species, max_frac=0.5, min_support=0.7):
    """Hippeastrum leaves in the smallest clade that also contains each query.

    A clade is only accepted as evidence of orthology if it holds at most
    `max_frac` of all Hippeastrum sequences in the tree. A query that is very
    divergent from the family sits on a long branch, so the smallest clade that
    reaches any Hippeastrum leaf can be most of the tree -- that is the absence
    of a phylogenetic signal, not 20-odd orthologs, and is reported as
    unresolved rather than as a match.
    """
    tree = Phylo.read(tree_path, "newick")
    og = pick_outgroup(tree, set(query_ids), seq_species)
    try:
        if og is not None:
            tree.root_with_outgroup(og)
            log("gene tree rooted on the most divergent candidate: {}".format(og.name))
        else:
            tree.root_at_midpoint()
    except Exception:                                             # noqa: BLE001
        try:
            tree.root_at_midpoint()
        except Exception:                                         # noqa: BLE001
            pass
    parents = {}
    for clade in tree.find_clades(order="level"):
        for child in clade:
            parents[child] = clade
    leaves = {t.name: t for t in tree.get_terminals() if t.name}
    n_hipp = sum(1 for n in leaves if seq_species.get(n, "").startswith("Hippeastrum"))
    cap = max(1, int(n_hipp * max_frac))
    out = {}
    for q in query_ids:
        node = leaves.get(q)
        if node is None:
            out[q] = ([], 0)
            continue
        cur, depth = node, 0
        while cur in parents:
            cur = parents[cur]
            depth += 1
            names = [t.name for t in cur.get_terminals() if t.name]
            partners = [n for n in names
                        if seq_species.get(n, "").startswith("Hippeastrum")]
            if partners:
                supp = cur.confidence
                if supp is not None and supp < min_support:
                    continue          # keep walking up to a supported clade
                if len(partners) > cap:
                    log("clade of {} holds {} of {} Hippeastrum sequences "
                        "(> {:.0%}) -- no usable phylogenetic signal, reported as "
                        "unresolved".format(q, len(partners), n_hipp, max_frac), "WARN")
                    out[q] = ([], depth)
                else:
                    out[q] = (sorted(partners), depth)
                    log("clade of {}: support={}".format(
                        q, "{:.3f}".format(supp) if supp is not None else "n/a"))
                break
        else:
            out[q] = ([], depth)
    return out, tree


# --------------------------------------------------------------------------- #
# STEP 4 -- aggregation and reporting
# --------------------------------------------------------------------------- #

CSV_COLUMNS = ["Brachypodium_Query_ID", "Hippeastrum_Hit_ID", "Species",
               "RBH_Validated", "Phylogenetic_Clade_Match",
               # supporting detail
               "Query_Locus", "Identity_%", "E_value", "Bitscore",
               "Query_Coverage_%", "Reverse_Best_Hit", "Reverse_Best_Locus",
               "Clade_Depth", "Evidence"]

MD_COLUMNS = ["Brachypodium_Query_ID", "Hippeastrum_Hit_ID", "Species",
              "RBH_Validated", "Phylogenetic_Clade_Match", "Identity_%",
              "E_value", "Bitscore"]


def markdown_table(rows, columns=MD_COLUMNS):
    out = ["| " + " | ".join(columns) + " |",
           "|" + "|".join(["---"] * len(columns)) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(r.get(c, "")).replace("|", "/")
                                     for c in columns) + " |")
    return "\n".join(out)


def step4_report(forward, rev_top, partners, query_loci, seq_species, outdir, queries):
    banner("STEP 4  Aggregation and reporting")
    rows = []
    for q in queries:
        locus = query_loci.get(q, "")
        clade_hits, depth = partners.get(q, ([], 0))
        seen = set()
        for species in SPECIES:
            hit = (forward.get(species) or {}).get(q)
            if hit:
                hid = hit["sseqid"]
                seen.add(hid)
                rev = rev_top.get(hid)
                rev_id = rev["sseqid"] if rev else ""
                rev_locus = (rev or {}).get("locus", "") or norm_locus(rev_id)
                rbh = bool(rev and locus and rev_locus == locus)
                ev = []
                if rbh:
                    ev.append("reverse best hit returns to " + locus)
                elif rev:
                    ev.append("reverse best hit is {} (gene {})".format(
                        rev_id, rev_locus or "?"))
                else:
                    ev.append("no reverse hit")
                if hid in clade_hits:
                    ev.append("sister to the query in the tree (depth {})".format(depth))
                rows.append({
                    "Brachypodium_Query_ID": q,
                    "Hippeastrum_Hit_ID": hid,
                    "Species": species.replace("_", " "),
                    "RBH_Validated": rbh,
                    "Phylogenetic_Clade_Match": hid in clade_hits,
                    "Query_Locus": locus,
                    "Identity_%": "{:.1f}".format(hit["pident"]),
                    "E_value": "{:.2e}".format(hit["evalue"]),
                    "Bitscore": "{:.0f}".format(hit["bitscore"]),
                    "Query_Coverage_%": "{:.0f}".format(hit["qcovhsp"]),
                    "Reverse_Best_Hit": rev_id,
                    "Reverse_Best_Locus": rev_locus,
                    "Clade_Depth": depth,
                    "Evidence": "; ".join(ev)})
        # phylogenetic partners that the forward search did not nominate
        for hid in clade_hits:
            if hid in seen:
                continue
            rows.append({
                "Brachypodium_Query_ID": q,
                "Hippeastrum_Hit_ID": hid,
                "Species": seq_species.get(hid, "?"),
                "RBH_Validated": False,
                "Phylogenetic_Clade_Match": True,
                "Query_Locus": locus,
                "Identity_%": "", "E_value": "", "Bitscore": "",
                "Query_Coverage_%": "", "Reverse_Best_Hit": "",
                "Reverse_Best_Locus": "", "Clade_Depth": depth,
                "Evidence": "phylogenetic clade only (not the forward best hit)"})
        if not clade_hits and not any(
                (forward.get(s) or {}).get(q) for s in SPECIES):
            rows.append({
                "Brachypodium_Query_ID": q, "Hippeastrum_Hit_ID": "", "Species": "",
                "RBH_Validated": False, "Phylogenetic_Clade_Match": False,
                "Query_Locus": locus, "Identity_%": "", "E_value": "",
                "Bitscore": "", "Query_Coverage_%": "", "Reverse_Best_Hit": "",
                "Reverse_Best_Locus": "", "Clade_Depth": 0,
                "Evidence": "no ortholog found by either method"})

    path = os.path.join(outdir, "Hippeastrum_DHS_Orthologs.csv")
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    log("wrote {} ({} rows)".format(path, len(rows)))

    table = markdown_table(rows)
    md = os.path.join(outdir, "Hippeastrum_DHS_Orthologs.md")
    with open(md, "w") as fh:
        fh.write("# Hippeastrum orthologs of the Brachypodium DAHP synthases\n\n")
        fh.write(table + "\n")
    print("\n" + table + "\n")

    both = [r for r in rows if r["RBH_Validated"] and r["Phylogenetic_Clade_Match"]]
    banner("SUMMARY")
    stats = [
        ("Queries", len(queries)),
        ("Rows written", len(rows)),
        ("Confirmed by BOTH methods", len(both)),
        ("RBH-validated only", len([r for r in rows if r["RBH_Validated"]
                                    and not r["Phylogenetic_Clade_Match"]])),
        ("Phylogeny only", len([r for r in rows if r["Phylogenetic_Clade_Match"]
                                and not r["RBH_Validated"]])),
        ("Neither", len([r for r in rows if not r["RBH_Validated"]
                         and not r["Phylogenetic_Clade_Match"]])),
        ("Output CSV", path),
        ("Wall time", "{:.1f} s".format(time.time() - _T0)),
    ]
    w = max(len(str(k)) for k, _ in stats) + 2
    for k, v in stats:
        print("  {:<{w}} {}".format(str(k) + ":", v, w=w))
    print("=" * 78)
    return rows


# --------------------------------------------------------------------------- #

def parse_args(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    p.add_argument("--workdir", default="ortholog_work")
    p.add_argument("--outdir", default=".")
    p.add_argument("--queries", default=None,
                   help="use this FASTA instead of writing the built-in queries")
    p.add_argument("--threads", type=int, default=0)
    p.add_argument("--min-core-coverage", type=float, default=0.55,
                   help="drop tree candidates covering less than this fraction of "
                        "the trimmed alignment core")
    p.add_argument("--min-candidate-frac", type=float, default=0.5,
                   help="drop tree candidates shorter than this fraction of the "
                        "median query length (fragments distort the distances)")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    workdir, outdir = os.path.abspath(args.workdir), os.path.abspath(args.outdir)
    os.makedirs(workdir, exist_ok=True)
    os.makedirs(outdir, exist_ok=True)
    for tool in ("diamond", "mafft", "fasttree"):
        if shutil.which(tool) is None:
            raise SystemExit("required tool not on PATH: " + tool)

    banner("STEP 0  Query file")
    if args.queries:
        queries_fasta = os.path.abspath(args.queries)
        log("using supplied query file {}".format(queries_fasta))
    else:
        queries_fasta = os.path.join(outdir, "Bd_DHS_queries.fasta")
        with open(queries_fasta, "w") as fh:
            fh.write(QUERIES_FASTA)
        log("wrote {}".format(queries_fasta))

    query_loci, queries, seqs = OrderedDict(), [], {}
    for rec in SeqIO.parse(queries_fasta, "fasta"):
        queries.append(rec.id)
        query_loci[rec.id] = norm_locus(rec.description)
        seqs[rec.id] = str(rec.seq)
        log("  {:<10s} {:>4} aa  locus={}".format(rec.id, len(rec.seq),
                                                  query_loci[rec.id] or "?"))
    dupes = defaultdict(list)
    for q in queries:
        dupes[seqs[q]].append(q)
    for group in dupes.values():
        if len(group) > 1:
            log("queries {} are byte-identical -- they cannot resolve to different "
                "orthologs, and will form a zero-length polytomy in the tree"
                .format(" == ".join(group)), "WARN")

    peptides, reports, bd_fa, dbs = step1(workdir)
    bd_locus = bd_protein_to_locus(bd_fa)
    log("mapped {:,} B. distachyon protein IDs to their gene locus".format(len(bd_locus)))
    for q, loc in query_loci.items():
        n = sum(1 for v in bd_locus.values() if v == loc)
        log("  query {:<30s} locus {:<10s} -> {} protein(s) in the reference".format(
            q, loc or "?", n))
    forward, rev_top = step2_rbh(queries_fasta, dbs, workdir, query_loci,
                                 args.threads, bd_locus)
    tree_path, seq_species, _cand = step3_phylogeny(reports, workdir, queries_fasta,
                                                    args.threads,
                                                    args.min_candidate_frac,
                                                    args.min_core_coverage)
    if tree_path:
        partners, _tree = clade_partners(tree_path, queries, seq_species)
        for q in queries:
            hits, depth = partners.get(q, ([], 0))
            log("clade of {:<10s}: {} Hippeastrum sequence(s) at depth {}{}".format(
                q, len(hits), depth, (" -> " + ", ".join(hits[:4])) if hits else ""))
    else:
        partners, seq_species = {}, {}
    step4_report(forward, rev_top, partners, query_loci, seq_species, outdir, queries)
    return 0


if __name__ == "__main__":
    sys.exit(main())
