export const meta = {
  name: 'vashlovani-crossref',
  description: 'Cross-reference the imagery analysis (track candidates, water bodies, land cover, site names) against internet sources, then adversarially verify each claim',
  phases: [
    { title: 'Cross-reference', detail: 'five angles against the analysis outputs' },
    { title: 'Verify', detail: 'adversarially check the claims that came back' },
  ],
}

const DIR = '/tmp/claude-0/-home-user-zdravey/a9f0e018-ace3-5082-8ade-d7673f0a235e/scratchpad/vashlovani'

const GEO = `Vashlovani National Park (ვაშლოვანის ეროვნული პარკი), Dedoplistsqaro municipality, Kakheti, eastern Georgia.
Park bbox EPSG:4326: west 46.27756, south 41.09400, east 46.73632, north 41.35038.
Semi-desert badlands, Iori (Yori) river canyon, mud volcanoes, elevation 78-858 m. Azerbaijan border to the east and south; Chachuna Managed Reserve to the south-west; Dedoplistsqaro town outside the park to the north-west.
Known named routes from OpenStreetMap inside the park: Dedoplistskaro-Pantishara, Vashlovani-Mijniskure, Pantishara-Eldari, Mijniskure-Takhis tskali, Takhis tskali-Shavi mta (Black Mountain), Sabatlo-Black Mountain, Black mountain-Kvemo Kedi, Road to Black mountain, Kasristskali-Mijniskure, plus ways tagged only "Possible road" and "Old abandoned road".`

const METHOD = `What produced the findings you are checking:
- Imagery: Esri World Imagery at 1.8 m/px (z16) for track detection; Sentinel-2 L2A of 2025-08-30 (0.04% cloud) at 10-20 m for land cover and water.
- Track detector: a random forest over 13 texture/morphology features, trained on OpenStreetMap tracks as labels and scored on a spatially disjoint half of the calibration window. Held-out AUC 0.848; deployed at the threshold giving a 5% false-positive rate (true-positive rate 0.52 there). The best hand-tuned single filter only reached AUC 0.661, which tells you how much natural linear structure this badlands terrain has.
- "Unmapped candidate" means: no OpenStreetMap road within 30 m of most of the line. It does NOT mean confirmed road. Gully edges, erosion scarps and stratigraphic banding all read like tracks here.`

const RULES = `Rules:
- Ground every claim in a source you actually fetched, and list its URL. No URL means the claim is worthless.
- Never invent a coordinate. If you cannot locate something, say so.
- Distinguish clearly between "a source confirms this" and "this is plausible". Use the confidence field honestly; prefer "low" when unsure.
- Georgian names transliterate inconsistently (Vashlovani/Washlowani, Iori/Yori, Dedoplistsqaro/Dedoplistskaro, Takhti-Tepa/Takhti Tepa, Artsivis Kheoba/Eagle Gorge, Pantishara/Pantishari, Mijniskure/Mijniskhure). Search several spellings and in Georgian script.
- Do not confuse Vashlovani National Park with the village of Vashlovani in the Gagra district of Abkhazia.
- Your output is data for a GIS pipeline, not prose for a human.`

const CLAIMS_SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'what this claim is about: a candidate segment id, a water body, a land-cover class, a site name, or a dataset name' },
          finding: { type: 'string', description: 'what you established, in 1-3 sentences' },
          supports_analysis: { type: 'string', description: 'one of: supports, contradicts, refines, inconclusive' },
          confidence: { type: 'string', description: 'high, medium or low' },
          lat: { type: 'number', description: 'omit unless the claim has a specific location' },
          lon: { type: 'number', description: 'omit unless the claim has a specific location' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['subject', 'finding', 'supports_analysis', 'confidence', 'sources'],
      },
    },
    summary: { type: 'string', description: 'what this angle established overall, and what it could not' },
  },
  required: ['claims', 'summary'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          holds: { type: 'boolean', description: 'true only if the claim survived your attempt to refute it' },
          reasoning: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['subject', 'holds', 'reasoning'],
      },
    },
  },
  required: ['verdicts'],
}

const ANGLES = [
  {
    key: 'tracks',
    prompt: `Angle: DO THE UNMAPPED TRACK CANDIDATES CORRESPOND TO ANYTHING KNOWN?

Read ${DIR}/unmapped_candidates.geojson (each feature has a "centroid" [lon, lat] and a length). Also read ${DIR}/road_validation.json for the detector's own numbers.

For the longest candidates, work out whether a route is known at that location from sources OTHER than OpenStreetMap: published GPS tracks (Wikiloc, AllTrails, GPSies archives, Strava segment pages, Komoot), tour-operator and overland trip reports that describe routes through the park, the park's own trail and zoning maps, Soviet-era 1:50k/1:100k topographic sheets covering this area, and any published satellite-derived road dataset (Microsoft Road Detections, Meta/Daylight roads, GRIP4, gROADS).

Report one claim per candidate you could say anything about, keyed by its feature "id". Where a candidate sits somewhere a source describes a track, say so and cite it. Where the location is described as trackless badlands or a gully system, that CONTRADICTS the detection and is just as valuable — report it.`,
  },
  {
    key: 'datasets',
    prompt: `Angle: IS THERE AN INDEPENDENT ROAD/TRACK DATASET TO COMPARE AGAINST?

We validated the detector against OpenStreetMap only, and OSM is demonstrably incomplete in this park. Find out what other road or track data exists for eastern Georgia that could serve as a second reference: Microsoft's global road detections, Meta/Daylight Map, GRIP4 global roads, gROADSv1, OpenStreetMap changeset/import history for Dedoplistsqaro municipality, Georgian national mapping agency (Sakartvelos Kartografia / NAPR) products, any published GIS layer from the Agency of Protected Areas or a donor project (WWF, CENN, GIZ, KfW) covering Vashlovani's road network or infrastructure.

For each: does it cover this area, at what detail, is it downloadable, and under what licence. Say plainly which of these would actually be usable as a second validation reference and which would not.`,
  },
  {
    key: 'hydrology',
    prompt: `Angle: DO THE DETECTED WATER BODIES MATCH KNOWN HYDROLOGY?

Read ${DIR}/detected_water_points.geojson (water bodies of 2 ha or more detected via MNDWI on 2025-08-30) and ${DIR}/feature_stats.json (total detected water area).

Identify what each detected water body most likely is: the Iori/Yori river channel, the Alazani along the border, a reservoir, an artificial pond, a spring-fed pool, or an irrigation structure. Check published hydrology of the park and the Iori basin, and check whether late August is a low-water month here (it matters: the detected extent is one date).

Also assess whether the total detected water area is plausible for this park at that date, and flag anything the detector may have missed (narrow channels under 20 m are below the Sentinel-2 resolution used).`,
  },
  {
    key: 'landcover',
    prompt: `Angle: ARE THE LAND-COVER AREAS PLAUSIBLE?

Read ${DIR}/feature_stats.json. It reports an unsupervised 7-class k-means split of the park on 2025-08-30, with a km2 figure per class, labelled by rank: dense_vegetation, woodland_scrub, steppe_grass, dry_steppe, sparse_bare, badlands_bright_bare, shadowed_or_dark_soil.

Compare against published figures for Vashlovani: the park's stated forest and arid light forest ("mtchnari"/pistachio-juniper) area, steppe and semi-desert extent, the tugay/riparian floodplain forest along the Alazani and Iori, and the badlands ("Alesilebi") extent. Sources: the Agency of Protected Areas, the park's management plan, WWF/CENN/GIZ project documents, peer-reviewed vegetation studies of Vashlovani and the Iori plateau.

Say which classes look right, which look over- or under-estimated, and what a late-August acquisition does to the comparison (annual grasses are senesced by then, which suppresses NDVI and can push real steppe into a "bare" class).`,
  },
  {
    key: 'names',
    prompt: `Angle: CONFIRM THE SITE NAMES AND ADD SUBSTANCE.

Read ${DIR}/web/sites.json. Each record has name_ka (Georgian), name_en, name_en_src ("osm" where OSM supplied an English name, "transliteration" where we transliterated it ourselves and it is therefore unverified), a category and coordinates.

For each site whose name_en_src is "transliteration", and for the notable named sites generally, do two things:
1. Confirm or correct the English rendering, and note the standard or most-used English spelling.
2. Write 1-3 sentences of real substance about the place: what it is, why it matters, access notes. This text becomes the pin description on a map, so it must be accurate and specific -- not filler.

Priority sites: the rangers' post, the visitor centre and Central Bungalows, Pantishara Canyon and Gorge, Datvis Khevi (Bear Gorge), Alesilebi viewpoint, Khoranta ruined town, Mijniskure, Takhis Tskali, Bugha Moedani, Zilcha, "City of Swallows", the iron-smelting workshop ruins, Echo Viewpoint, the fossil elephant bone find site, Lekis/Mlashe Tskali, and the Georgia-Azerbaijan border checkpoint.

Use the subject field for the site's "id" from sites.json so results can be joined.`,
  },
]

phase('Cross-reference')
const angles = await parallel(ANGLES.map((a) => () =>
  agent(`${GEO}\n\n${METHOD}\n\n${a.prompt}\n\n${RULES}\n\nBe thorough: many searches, fetch the promising pages rather than trusting snippets. You own this one angle; other agents cover the others.`,
    { label: `crossref:${a.key}`, phase: 'Cross-reference', schema: CLAIMS_SCHEMA, agentType: 'general-purpose' })
))

const ok = angles.filter(Boolean)
log(`${ok.length}/${ANGLES.length} angles returned`)
if (!ok.length) return { error: 'all cross-reference angles failed', claims: [] }

const all = []
for (let i = 0; i < ok.length; i++) {
  for (const c of (ok[i].claims || [])) {
    all.push({ ...c, angle: ANGLES[i] ? ANGLES[i].key : 'unknown' })
  }
}
log(`${all.length} claims to verify`)

// Verify only what is worth the tokens: anything asserted with confidence,
// or anything that CONTRADICTS the analysis (those change conclusions).
const worth = all.filter(c =>
  c.supports_analysis === 'contradicts' || c.confidence !== 'low')
log(`${worth.length} claims meet the verification bar (${all.length - worth.length} low-confidence non-contradicting claims carried through unverified)`)

const BATCH = 6
const batches = []
for (let i = 0; i < worth.length; i += BATCH) batches.push(worth.slice(i, i + BATCH))

phase('Verify')
const verdicts = await parallel(batches.map((batch, bi) => () =>
  agent(`${GEO}\n\n${METHOD}

You are adversarially verifying claims another researcher made about this analysis. Default to holds=false: a claim survives only if you independently find support for it. Search yourself rather than only re-reading the cited sources.

${batch.map((c, j) => `--- claim ${j + 1} ---
subject: ${c.subject}
angle: ${c.angle}
finding: ${c.finding}
stance toward the analysis: ${c.supports_analysis}
claimed confidence: ${c.confidence}
cited sources: ${(c.sources || []).join(' ') || '(none)'}`).join('\n\n')}

Watch particularly for: a coordinate that does not match the description; a claim about Vashlovani that actually describes a different Georgian protected area (Chachuna, Lagodekhi, Tusheti are commonly conflated); a figure quoted from a source that is about the whole Kakheti region rather than this park; and confident-sounding statements traceable to no source at all.

Return a verdict for every claim, using its subject verbatim so results can be joined.`,
    { label: `verify:batch${bi + 1}`, phase: 'Verify', schema: VERIFY_SCHEMA, agentType: 'general-purpose', effort: 'high' })
))

const vmap = new Map()
for (const v of verdicts.filter(Boolean)) {
  for (const d of (v.verdicts || [])) vmap.set(String(d.subject).toLowerCase(), d)
}

const merged = all.map(c => {
  const v = vmap.get(String(c.subject).toLowerCase())
  return {
    ...c,
    verified: v ? v.holds : null,
    verify_reasoning: v ? v.reasoning : 'not submitted for verification (low confidence, non-contradicting)',
    sources: Array.from(new Set([...(c.sources || []), ...((v && v.sources) || [])])),
  }
})

const held = merged.filter(c => c.verified === true)
const refuted = merged.filter(c => c.verified === false)
log(`VERIFIED ${held.length} claims held, ${refuted.length} refuted, ${merged.length - held.length - refuted.length} unverified`)

return {
  counts: {
    angles_ok: ok.length,
    claims: merged.length,
    held: held.length,
    refuted: refuted.length,
    unverified: merged.length - held.length - refuted.length,
    contradicting_analysis: merged.filter(c => c.supports_analysis === 'contradicts').length,
  },
  claims: merged,
  angle_summaries: ok.map((r, i) => ({
    angle: ANGLES[i] ? ANGLES[i].key : 'unknown',
    summary: r.summary || '',
  })),
}
