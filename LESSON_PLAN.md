# Zdravey! — Lesson Plan (curriculum)

The teaching plan behind the content in `content/content-model.ts`. It's
**bidirectional**: the exact same units teach English to a Bulgarian child and
Bulgarian to an English child — only the alphabet track differs by direction.

## Teaching principles

- **Audio-first.** Every word, prompt, and reward is spoken. A pre-reader can
  complete every lesson by ear and picture alone.
- **Positive-only.** No hearts, timers, or losable streaks. Wrong answers bounce
  back gently and the right answer is shown *and spoken*. Reward = collecting
  martenitsi.
- **Short.** A lesson is ~3–4 minutes: 4–6 exercises, one instruction on screen.
- **Small sets.** 4 new words per teaching lesson — enough to feel progress,
  few enough to hold.
- **Spiral.** Every unit ends with a **review lesson** that re-mixes earlier
  words (match_pairs + odd_one_out) so vocabulary is revisited, not dropped.
- **Concrete first.** Nouns you can picture (fruit, animals) before abstract
  ideas (colors, numbers), before relational words (family, body).

## Lesson shape (the default recipe)

| Step | Exercise | Purpose |
|------|----------|---------|
| 1 | `pick_picture` | introduce word A (hear it, find it) |
| 2 | `pick_picture` | introduce word B, A becomes a distractor |
| 3 | `say_it` | say one word aloud (Kuker) — production, not just recognition |
| 4 | `match_pairs` | consolidate all 4 words at once |
| 5 | `odd_one_out` *or* `pick_picture` | a small challenge to finish |

Review lessons drop steps 1–3 and lean on `match_pairs` + `odd_one_out` across
the unit's full word set.

## The map

Units appear on the home path in this order. Each teaching lesson introduces 4
words; review lessons consolidate. Characters host per their role (see
`CLAUDE.md`).

### Unit 1 — Fruits · Плодове  (host: Samodiva 🌿)
| Lesson | Words | Notes |
|--------|-------|-------|
| Fruits 1 | apple, banana, grapes, pear | ✅ |
| Fruits 2 | orange, strawberry, watermelon, lemon | ✅ |
| Fruits Review | all 8 | ✅ match_pairs + odd_one_out |

### Unit 2 — Animals · Животни  (host: Samodiva 🌿)
| Lesson | Words | Notes |
|--------|-------|-------|
| Animals 1 | cat, dog, bird, fish | ✅ |
| Animals 2 | cow, horse, sheep, pig | ✅ farm set |

### Unit 3 — Colors · Цветове  (host: Samodiva 🌿)
| Lesson | Words | Notes |
|--------|-------|-------|
| Colors 1 | red, blue, green, yellow | ✅ |
| Colors 2 | orange, purple, black, white | ✅ |

### Unit 4 — Numbers · Числа  (host: Krali Marko 🗡️)
| Lesson | Words | Notes |
|--------|-------|-------|
| Numbers 1 | one–five | ✅ |
| Numbers 2 | six–ten | ✅ |

### Alphabet track  (host: Kuker 🔔) — direction-specific
- Browse: tap any letter to hear it (Latin for →English, Cyrillic for →Bulgarian).
- **Practice** (`letter_sound`): hear a letter, tap it. 5 rounds.

## Planned next (not yet built)

- **Family · Семейство** (Baba Marta 👵): mother, father, grandma, grandpa,
  brother, sister.
- **Body · Тяло** (Kuker 🔔): head, hand, eye, nose, mouth, ear.
- **Weather · Време** (Samodiva 🌿): sun, rain, cloud, snow, wind.
- **Krali Marko's review challenge** ("юнашки изпит"): an end-of-unit boss round
  mixing a whole unit, hosted by Krali Marko.
- **Baba Marta seasonal event**: a 1st-of-March martenitsa give-away.

## Authoring a new lesson (for contributors)

1. Add `VocabItem`s to `VOCAB` in `content-model.ts` (ids like `fruit.orange`).
   Use `.mp3` audio paths following `audio/{lang}/{word}__{voiceId}.mp3`.
2. Add a `Lesson` to the unit's `lessons[]`, referencing those ids in exercises.
   Never write English/Bulgarian strings inline — the components read them from
   the vocab item via the current `Direction`.
3. Run `npm run generate:audio` to fill the new clips (TTS placeholder) and
   refresh the require-map. Real recordings can replace them later.
4. `npm run typecheck && npm run lint && npm run build:web`.

Progress = one martenitsa per lesson finished; the home path shows a martenitsa
badge on completed lessons. Nothing is ever locked — order is a suggestion, not
a gate (positive-only).
