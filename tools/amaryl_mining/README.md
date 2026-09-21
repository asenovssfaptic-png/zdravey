# AmarylOmicBase enzyme mining — DAHP synthase & arogenate dehydrogenase

`mining_pipeline.py` mines [AmarylOmicBase](https://doi.org/10.5281/zenodo.17307476)
(Zenodo record **17307476** — an integrated transcriptome database for 29
*Amaryllidoideae* species / 30 assemblies) for the two entry-point enzymes of
the shikimate → aromatic amino acid pathway, and emits a fully annotated master
table plus curated FASTA files.

> This directory is self-contained and unrelated to the rest of this repository.

## Targets

| Enzyme | EC | Pfam families used |
|---|---|---|
| DAHP synthase (3-deoxy-D-arabino-heptulosonate 7-phosphate synthase) | `2.5.1.54` (current), `4.1.2.15` (historical) | `PF01474` DAHP_synth_2 (class II — the plant/plastid enzyme), `PF00793` DAHP_synth_1 (class I) |
| Arogenate dehydrogenase (NADP+) / TyrAa / ADH | `1.3.1.78` | `PF02153` PDH_N, `PF20463` PDH_C, `PF26213` TYRAAT1_C |

## Install and run

```bash
pip install pyhmmer                     # the only third-party dependency
python3 mining_pipeline.py --workdir ./amaryl_work --outdir ./results
```

Useful flags:

| Flag | Meaning |
|---|---|
| `--species A B C` | restrict to specific assemblies (e.g. `Narcissus_tazetta`) |
| `--no-download` | use whatever archives are already cached; still allows UniProt/InterPro/ENA lookups |
| `--offline` | no network at all (cached archives + cached metadata only) |
| `--evalue` / `--min-coverage` | reference-protein homology thresholds (defaults `1e-10` / `0.5`) |
| `--no-sixframe` / `--min-orf-aa` | control the six-frame sweep of the assemblies |
| `--min-confidence` | lowest tier written to the main outputs (default `Low`) |
| `--threads` | CPUs for HMMER (`0` = all) |

Everything is cached and resumable: archives are size-verified against the
Zenodo API and re-fetched with HTTP range requests, and UniProt references,
Pfam HMMs and ENA metadata are cached under `--workdir`.

## What it does

**STEP 1 — catalogue & download.** Queries the Zenodo REST API, prints the full
13-archive catalogue with a category for each, and downloads the 8 archives the
analysis needs (~8 GB): Trinotate reports, hmmscan/Pfam-A domain tables,
EggNOG-mapper tables, BLASTp-vs-Swiss-Prot tables, the TransDecoder proteomes,
the nucleotide assemblies, the TransDecoder BED files and the Kallisto
expression matrices.

**STEP 2 — dual-layer mining.** No archive is ever fully extracted; every one is
streamed through `tarfile` in `r|gz` mode exactly once.

* **Method A — functional annotation.** Scans the Trinotate reports, the
  hmmscan Pfam-A domain tables, the EggNOG-mapper tables and the BLASTp
  Swiss-Prot tables for the target EC numbers, Pfam accessions/names,
  Swiss-Prot entry names (`AROF_*`, `AROG_*`, `TYRA*_*`) and protein-name
  patterns.
* **Method B — sequence homology.** Fetches plant reference proteins from
  UniProt by EC number, plus the real Pfam HMMs from InterPro, and runs HMMER3
  in-process via `pyhmmer`: `phmmer` (reference proteins as queries) and
  `hmmsearch` (Pfam HMMs at their curated gathering thresholds) against every
  predicted proteome. The canonical references the literature names —
  Arabidopsis DHS1 (P29976), DHS2 (Q00218) and DHS3 (Q9SK84) for DAHP synthase,
  TyrA1 (Q944B6) and TyrA2 (Q9LMR3) for ADH — are pinned so they are always
  queried. DHS3 is *not* a reviewed Swiss-Prot entry, so an EC-plus-`reviewed`
  query alone would silently omit it. The reference sets are restricted to
  Viridiplantae: a bacterial TyrA among the queries pulls in cyclohexadienyl
  dehydrogenases that are not the plant TyrAa enzyme.

* **Six-frame assembly sweep.** Methods A and B both key on TransDecoder
  peptides, so a transcript with no predicted ORF — or one predicted in the
  wrong frame — is invisible to them. A third stage translates every unitig in
  all six frames, keeps every stop-free stretch of ≥ 60 aa, and runs the same
  Pfam profiles at their gathering thresholds. In *Amaryllis belladonna* this
  recovers `Ambel_LDME-2009494`, a genuine ADH-domain transcript that the
  peptide-level search cannot see because TransDecoder predicted no ORF for it.
  Disable with `--no-sixframe`; tune with `--min-orf-aa`.

Hits from all three layers are merged and de-duplicated on
`(species, transcript, peptide)`; a six-frame hit is only recorded for a
transcript that no peptide-level layer already found.

**STEP 3 — expression & metadata.** Candidate rows are pulled out of the
Kallisto isoform and gene TPM matrices. The record itself ships no sample-metadata
file — the matrix columns are bare run accessions — so those accessions are
resolved against the ENA portal API (run records plus the full BioSample
attribute set) and classified into a tissue and a condition/treatment
vocabulary. Only attribute *values* are classified: matching on tag names would
classify the BioSample schema rather than the sample, and would label every
sample carrying an (often empty) `ecotype` or `time point` tag from the tag
alone.

**STEP 4 — sequences & tabulation.** Full-length unitig/cDNA, CDS and peptide
sequences are extracted, and the CDS is verified by translating it and
comparing against the predicted peptide.

## Correctness safeguards

These matter more than raw hit counts, so they are called out explicitly:

* **The shipped hmmscan tables are unfiltered.** They contain rows with
  E-values around 0.1, which are not domain assignments. The pipeline applies
  each family's **Pfam gathering (GA) bit-score cutoff**, read from the HMM
  itself — exactly what `hmmscan --cut_ga` would have done. Without this, five
  spurious "arogenate dehydrogenase" calls appear in *Amaryllis belladonna*
  alone.
* **KDSA disambiguation.** `PF00793` (DAHP_synth_1) is shared with KDSA/KdsA
  (2-dehydro-3-deoxyphosphooctonate aldolase, EC 2.5.1.55), which plants also
  encode. A PF00793-only hit carrying KDSA evidence is demoted to `Rejected`
  and written to `rejected_candidates.csv` rather than dropped silently.
* **Dehydratase ≠ dehydrogenase.** Prephenate dehydratase (`PF00800`,
  EC 4.2.1.51) and arogenate dehydratase (EC 4.2.1.91) are different enzymes on
  the phenylalanine branch; the ADH patterns are written so they can never
  match them.
* **CDS verification.** Every derived CDS is translated with the standard
  genetic code and compared to the predicted peptide; the per-row result is in
  `Translation_Check` and the aggregate is logged.
* **Plants have no class-I DAHP synthase.** The plant enzyme is class II
  (`PF01474`). A `PF00793`-only sequence is therefore a KDSA paralog or a
  non-plant contig, never a plant DAHP synthase, so it is rejected outright.
  In this dataset that rule moves 168 rows out of the master table — including
  16 that otherwise scored *High* and are near-verbatim *E. coli* AroG/AroF and
  yeast Aro4 contaminant contigs (70–90 % identity to the microbial protein,
  ~25 % to every plant reference).
* **Taxonomy of the best Swiss-Prot hit.** The Trinotate hit field carries the
  full lineage of the top match. A hit whose lineage lacks `Viridiplantae` is
  flagged; at ≥ 60 % identity it is rejected as a contaminant contig, and below
  that it is demoted one confidence tier and reported in `Best_Hit_Lineage` /
  `Best_Hit_Identity` so the caller can judge.
* **Fragmented assemblies.** A short unitig encoding a partial ORF has low
  coverage of a full-length reference, so a Method B hit is kept when *either*
  query or target coverage clears the threshold. `ORF_Type` and
  `Length_vs_Reference` report the truncation honestly.
* **Unique FASTA identifiers.** One transcript can carry several predicted ORFs.
  Where two rows share a sequence (the cDNA file, whose unit is the unitig) the
  duplicate is dropped; where they differ (the CDS and protein files, whose unit
  is the ORF) the TransDecoder peptide id is used instead. Duplicate identifiers
  would break `samtools faidx`, `makeblastdb -parse_seqids` and any dict-keyed
  parser.
* **Transcripts are counted distinctly.** A row is one predicted ORF, so the
  summaries report distinct transcripts *and* row counts rather than presenting
  one as the other.
* **EggNOG EC numbers describe an orthogroup, not a protein.** EggNOG-mapper
  reports the EC list of the whole orthogroup, so a protein sitting in a group
  annotated `1.3.1.13, 1.3.1.78, 2.7.1.15` is not thereby an arogenate
  dehydrogenase. An EC list with more than two distinct numbers is recorded as
  orthogroup-level evidence (weight 1.0, flagged) instead of a per-protein EC
  assignment (weight 4.0). Both the standalone EggNOG tables and the
  `EggNM.EC` column of the Trinotate report go through this rule.
* **"Complete" is about codons, not length.** TransDecoder calls an ORF
  `complete` when it has a start and a stop codon, which says nothing about
  whether it is full length. Any peptide below 70 % of the reference median is
  additionally flagged as fragmentary, so filtering on `ORF_Type == complete`
  cannot quietly hand back 100-aa stubs of a 525-aa enzyme.
* **Declared organ fields outrank free text.** `tissue_type` and the BioSample
  `tissue` / `organism part` attributes are classified first; the sample and
  study free text is only a fallback. Otherwise a word in an experiment title
  ("… bud transcriptome") overrides a curated tissue field that says `leave`.
  `run_metadata.csv` records which level each label came from in
  `tissue_source` / `condition_source`.
* **Two search regimes, deliberately.** The reference-protein sweep (`phmmer`
  against the Swiss-Prot/UniProt queries) applies the requested `E ≤ 1e-10` and
  `coverage ≥ 50 %` gate. The family sweeps (`hmmsearch` with the Pfam profiles,
  including the six-frame stage) instead use each family's curated **gathering
  threshold**, which is the Pfam-defined membership criterion and is what makes
  short, fragmentary domain hits detectable at all. Both E-value and coverage
  are still recorded per row.
* **Output invariants are asserted.** Before writing, every row is checked for
  un-decoded markup or an assembly suffix in `Species`, a malformed FASTA
  header, and missing columns; failures are logged as errors rather than
  shipped silently.

## Outputs (`--outdir`)

| File | Contents |
|---|---|
| `target_enzymes_summary.csv` | master table — the 12 requested columns followed by supporting detail (see below) |
| `target_enzymes_summary.md` | the same table per enzyme, minus the sequence columns, plus the summary counts |
| `rejected_candidates.csv` | hits demoted as decoys or insufficient evidence, kept for transparency |
| `Amaryllidaceae_DAHP_ADH_transcripts.fasta` | **CDS nucleotide** records |
| `Amaryllidaceae_DAHP_ADH_proteins.fasta` | peptide records |
| `Amaryllidaceae_DAHP_ADH_cdna.fasta` | full unitig / cDNA records |
| `run_metadata.csv` | every sequencing run with its resolved tissue and condition |
| `pipeline_summary.json` | parameters, counts and the reference set actually used |

All three FASTA files use the requested header:

```
>TargetEnzyme|Species|TranscriptID|Tissue|Condition|TPM
```

### Master table columns

The 12 requested fields come first, in order: `Target_Enzyme`, `Species`,
`Transcript_ID`, `Isoform_ID/Gene_ID`, `Sequence_Type`, `Sequence_Length`,
`Sampled_Tissue`, `Sampled_Condition`, `Expression_TPM`, `EC_Number`,
`Annotation_Source`, `Protein_Sequence`, `CDS_Sequence`. (`EC_Number` and
`Annotation_Source` are split into two columns so each stays machine-readable.)

They are followed by: `Peptide_ID`, `Species_Acronym`, `Assembly`, `ORF_Type`,
`CDS_Coord_Source`, `Translation_Check`, `Length_vs_Reference`,
`Protein_Length_aa`, `CDS_Length_bp`, `cDNA_Length_bp`, `Detection_Method`,
`Evidence_Summary`, `Pfam_Domains`, `Best_SwissProt_Hit`, `Best_Hit_Lineage`,
`Best_Hit_Identity`, `Best_Evalue`, `Best_Coverage`, `Confidence`, `Flags`,
`Max_TPM`, `Max_TPM_Run`, `Mean_TPM`, `N_Samples`, `TPM_By_Tissue`,
`TPM_By_Condition`, `Gene_Max_TPM`, `Protein_Source`, `Metadata_Source`,
`Study_Accessions`, `cDNA_Sequence`.

`Protein_Source` says where each peptide came from: the TransDecoder proteome,
a translation of the ORF coordinates (for peptides the distributed proteome
omits), or a six-frame translation of the unitig.

`Assembly` matters: *Lycoris aurea* contributes two assemblies (`Lycoris_aurea_PB`,
long-read, and `Lycoris_aurea_TH`, Trinity hybrid) that share the `Lyaur_`
sequence prefix. `Species` carries the binomial and `Assembly` the specific
build, so 29 species span 30 assemblies.

`Expression_TPM` is the **maximum** TPM across that assembly's runs, and
`Sampled_Tissue` / `Sampled_Condition` describe the run where that maximum
occurs. `TPM_By_Tissue` gives the per-tissue maxima so a single row is not
mistaken for the whole expression profile.

### Confidence tiers

`High` / `Medium` / `Low` / `Rejected`, from a weighted evidence score: target
EC number, family-diagnostic Pfam domain, protein-name match, Swiss-Prot entry
hit, and HMMER homology support, with penalties for decoy annotations and for
non-diagnostic (class-I-only) domain evidence. A `High` call requires both
annotation and homology support plus an EC or family-Pfam assignment.

## Results of the shipped run

One end-to-end run over all 30 assemblies (~56 min on 4 cores, archives cached):

| | DAHP synthase | Arogenate dehydrogenase |
|---|---|---|
| distinct transcripts | 851 | 287 |
| rows (one per predicted ORF) | 870 | 295 |
| assemblies with ≥ 1 hit | 30 / 30 | 30 / 30 |
| High / Medium / Low | 418 / 32 / 420 | 211 / 13 / 71 |

2.5 M predicted peptides and 28.9 M six-frame ORF fragments were searched;
1 425 candidates were merged, 1 165 kept and 260 rejected as decoys or
insufficient evidence. 571 of the kept transcripts carry a target domain but no
TransDecoder ORF and are visible only to the six-frame sweep. Every derived CDS
translates exactly to its predicted peptide (659/659), and 315 sequencing runs
were resolved to a tissue and a condition.

The large `Low` tier is expected: it is dominated by six-frame hits, which have
domain evidence but no functional annotation and are usually short fragments.
Filter on `Confidence` and `Flags` for the use you have in mind.

## Caveats

* Tissue and condition come from ENA/BioSample free text. Several source
  studies (notably the 1KP samples) register no organ at all, so those rows are
  honestly reported as `Unspecified` rather than guessed.
* Twelve runs (`CRR314451`–`CRR314462`, *Lycoris radiata*) are CNCB-NGDC GSA
  accessions, not INSDC, so ENA holds no record for them and no organ can be
  recovered. `Metadata_Source` says so explicitly, and any row whose
  peak-expression run is one of them carries a flag rather than a guess.
* A transcriptome assembly is not a genome: a species missing an enzyme here
  means it is absent *from that assembly*, not from the genome.
* The gene-level TPM matrices are not keyed consistently across species —
  *Clivia miniata* leaves a trailing underscore on its gene ids and *Lycoris
  radiata*'s "gene" matrix is keyed by isoform id. `Gene_Max_TPM` normalises
  both and sums isoform rows into a gene total, and the run log says when it
  did so.
* A few sequencing runs are registered at ENA under a different species from
  the assembly they quantify. That is a property of the source data, not of
  this pipeline; affected rows carry a flag naming the discrepancy.
* Trinity isoforms of one gene are reported as separate rows; use
  `Isoform_ID/Gene_ID` to collapse them.
