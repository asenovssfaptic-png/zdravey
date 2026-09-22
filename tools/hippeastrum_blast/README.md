# BLAST against the *Hippeastrum* transcriptomes of AmarylOmicBase

`blast_hippeastrum.py` BLASTs a set of query sequences against every
*Hippeastrum* transcriptome in [AmarylOmicBase](https://doi.org/10.5281/zenodo.17307476)
(Zenodo record **17307476**) and maps each hit onto tissue- and
condition-specific expression.

## Run it

```bash
pip install requests pandas biopython tqdm          # plus NCBI BLAST+ on PATH
python3 blast_hippeastrum.py --query input.fasta
```

Writes `Hippeastrum_BLAST_expression_results.csv` (+ a `.md` twin) and prints a
Markdown table and a summary log.

| Flag | Meaning |
|---|---|
| `--query` | query FASTA (default `input.fasta`); nucleotide or protein, auto-detected |
| `--workdir` | cache for archives, extracted files, BLAST DB and SRA metadata |
| `--evalue` / `--min-qcov` | hit filters (defaults `1e-10` / `50` % query coverage) |
| `--tpm-threshold` | TPM above which a sample counts as "expressed" (default `1.0`) |
| `--threads` | BLAST threads (default: all cores) |
| `--no-fallback-assembly` | use only `nt97`, even if that drops a species |

## What it does

**STEP 1 — targeted extraction.** Queries the Zenodo REST API, then streams
`Amaryllidoideae_Assemblies_nt97.tar.gz` and `Amaryllidoideae_expression.tar.gz`
in `r|gz` mode and writes out **only** members whose filename contains
"Hippeastrum" — the assemblies and the `*kallisto.isoform.TPM.not_cross_norm*`
matrices. The multi-gigabyte archives are decompressed once, on the fly, and
never extracted whole. Downloads are resumable and size-verified.

**STEP 2 — BLAST.** Concatenates the assemblies, builds a nucleotide database
with `makeblastdb`, detects whether the queries are nucleotide or protein
(BioPython, by alphabet composition) and runs `blastn` or `tblastn` accordingly.
Hits are filtered at E ≤ 1e-10 and query coverage ≥ 50 %, then reduced to the
best HSP per query–transcript pair.

**STEP 3 — expression and metadata.** Pulls each hit transcript's row from its
species' Kallisto isoform TPM matrix, then resolves every matrix column (an SRA
run accession) against NCBI E-utilities `efetch db=sra`, rate-limited to
**3 requests/second**, in batches of 20. Tissue and treatment are parsed out of
the returned `SAMPLE_ATTRIBUTE` tags.

**STEP 4 — reporting.** CSV + Markdown, with the eight requested fields first.

## Two traps in this dataset

Both were found by running the pipeline, not by reading the docs, and both would
silently corrupt the result:

* **`nt97` does not contain every *Hippeastrum*.** That archive holds only the
  species assembled *de novo* in this project, so it has *Hippeastrum* sp. and
  *H. vittatum* but **not *H. striatum***, whose assembly was previously
  published. The script detects any species that has a TPM matrix but no
  assembly and pulls it from `Amaryllidoideae_transcriptome.tar.gz`, so all
  three species are searched. `--no-fallback-assembly` disables this.
* **The same transcripts carry two different prefixes.** In `nt97` the
  *Hippeastrum* sp. sequences are `Hihyb_*` (Hippeastrum hybrid), but its
  expression matrix — and the rest of the record — uses `Hisp_*`. Matching
  BLAST hits against the matrix naively returns **zero** expression data for
  that species. The script reads the canonical prefix from each TPM matrix and
  rewrites assembly IDs to match. The two labels are the same sequences:
  identical counts (866,547 each) and byte-identical sequence for every
  transcript checked.

## Output columns

The eight requested fields first: `Query_Sequence_Name`, `Hippeastrum_Species`,
`Hit_Transcript_ID`, `Identity_%`, `E-value`, `Sampled_Tissues`,
`Sampled_Conditions`, `Top_Expressing_Sample_Metadata`, `Max_TPM_Value`.

Then: `BLAST_Program`, `Query_Coverage_%`, `Alignment_Length`, `Bitscore`,
`Subject_Length_bp`, `Top_Run_Accession`, `N_Runs_Total`, `N_Runs_TPM_gt1`,
`Tissue_Max_TPM`, `Condition_Max_TPM`, `Top_Sample_Attributes`,
`Metadata_Source`.

`Sampled_Tissues` and `Sampled_Conditions` list the distinct values among
samples with TPM above the threshold, ordered by their maximum TPM.
`Tissue_Max_TPM` / `Condition_Max_TPM` give those maxima.

**Tissue** is the value the submitter declared (`tissue`, `organism part`,
`organ`, …), reported verbatim rather than bucketed — so you will see both
`leave` and `leaves`, which is what the records actually say. **Condition**
prefers a real experimental variable (`treatment`, `dev_stage`, `light`,
`stress`, `time`) and only falls back to sample context (`cultivar`,
`genotype`, `age`) when no treatment is declared, so a cultivar comparison
stays visible instead of collapsing to `Control/Unspecified`. The peak sample's
complete attribute set is in `Top_Sample_Attributes`.

The metadata cache stores exactly what NCBI returned; tissue and condition
labels are re-derived on every run, so changing that logic never means
re-querying NCBI.

## Caveats

* TPM matrices are `not_cross_norm` — values are not comparable between species.
* A hit is a sequence match, not an orthology assignment.
* `Hippeastrum` sp. is registered at NCBI as *Hippeastrum hybrid cultivar*.
* Expression covers 36 runs in total: 22 (*Hippeastrum* sp.), 12
  (*H. vittatum*), 2 (*H. striatum*). *H. striatum* has only two runs, so its
  tissue/condition breadth is limited.
