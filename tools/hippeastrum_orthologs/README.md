# Orthologs of the *Brachypodium* DAHP synthases in *Hippeastrum*

`find_orthologs.py` searches the two *Hippeastrum* proteomes of
[AmarylOmicBase](https://doi.org/10.5281/zenodo.17307476) for orthologs of
*Brachypodium distachyon* DAHP synthases, and cross-checks every call with two
independent criteria: **Reciprocal Best Hit** and **phylogenetic clustering**.

```bash
python3 find_orthologs.py --workdir ./ortholog_work --outdir .
python3 find_orthologs.py --queries my_queries.fasta      # use your own FASTA
```

Needs `diamond`, `mafft`, `fasttree` on PATH plus `requests`, `biopython`.

## Pipeline

| Step | What happens |
|---|---|
| 0 | Writes `Bd_DHS_queries.fasta`, reports sequence lengths and loci, and warns about byte-identical queries |
| 1 | Streams the Zenodo proteome and Trinotate archives, extracting only *Hippeastrum sp.* and *H. vittatum*; downloads the *B. distachyon* reference proteome from Ensembl Plants; builds three DIAMOND databases |
| 2 | **RBH** — `diamond blastp --very-sensitive` forward to each *Hippeastrum* proteome, then the top hits back against the reference proteome; validated when the reverse best hit returns to the query's own locus |
| 3 | **Phylogeny** — Trinotate `PF00793`/`PF01474` candidates + queries → `mafft --auto` → column trimming and coverage filtering → `fasttree` → `Bio.Phylo` clade inspection |
| 4 | `Hippeastrum_DHS_Orthologs.csv` + Markdown table + summary |

## Five things that silently break this analysis

Each was found by running the pipeline, and each is handled:

1. **Ensembl protein IDs carry no locus.** The reverse best hit comes back as
   `KQK15223`, not `Bradi1g21330` — the locus is only in the header's `gene:`
   field. Without a protein→gene map, RBH can never validate. The pipeline
   builds that map from the FASTA descriptions.
2. **Partial peptides beat full-length ones on percent identity.** A 399-aa
   TransDecoder fragment scored 86.7 % to a query over 398 columns while the
   genuine full-length ortholog scored 79.6 % over 519 — the fragment simply
   lacks the fast-evolving N-terminal transit peptide. In a distance tree this
   pulls fragments in as false nearest neighbours. Candidates are filtered on
   length and on coverage of the trimmed alignment core.
3. **Alignment columns must be trimmed.** Only ~435 of 618 columns reach 50 %
   occupancy; the rest are fragment-driven gaps that distort every distance.
4. **Midpoint rooting is wrong here.** The queries are the longest branches, so
   the midpoint falls among them. The tree is rooted on the most divergent
   candidate instead.
5. **A clade holding most of the tree is not evidence.** A query that is
   divergent from the family sits on a long branch, so the smallest clade
   reaching any *Hippeastrum* leaf can be most of the tree. Clades holding more
   than half the *Hippeastrum* sequences, or falling below 0.7 local support,
   are reported as unresolved rather than as orthologs.

## Output

`Hippeastrum_DHS_Orthologs.csv` — `Brachypodium_Query_ID`, `Hippeastrum_Hit_ID`,
`Species`, `RBH_Validated`, `Phylogenetic_Clade_Match`, plus `Query_Locus`,
`Identity_%`, `E_value`, `Bitscore`, `Query_Coverage_%`, `Reverse_Best_Hit`,
`Reverse_Best_Locus`, `Clade_Depth` and `Evidence`.

A row is only strong evidence of orthology when **both** boolean columns are
true. Treat either one alone as a hypothesis.
