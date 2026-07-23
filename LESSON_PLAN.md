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

## Exercise types (the toolbox)

| Type | What the child does | Host |
|------|---------------------|------|
| `pick_picture` | hear a word, tap the matching picture (the workhorse) | unit host |
| `match_pairs` | match picture ↔ word | unit host |
| `say_it` | repeat the word aloud (record + play back) | Kuker 🔔 |
| `odd_one_out` | tap the one that doesn't belong | Hitar Petar |
| `find_on_map` | hear a city, tap it on the map of Bulgaria | Krali Marko 🗡️ |
| `story` | a narrated storybook panel — turn the page, hear the tale, tap the spotlight word | the storyteller |
| `true_false` | he shows a picture + says a word — tap ✓ / ✗ | Hitar Petar |
| `sequence` | tap the pictures in order (e.g. count 1→5) | unit host |

**Stories & length ramp.** `story` panels frame a lesson in a short Bulgarian
folk tale: narration plays in the child's known language while an optional
*spotlight* word is heard in the language being learned. Early units stay short
(4 steps); later units (Food, Home, Clothes) open and close with a story and run
longer (~7 steps), mixing in `true_false` and `sequence` so the map grows from
quick drills into narrated mini-adventures. All new types are audio-first and
strictly positive-only — no timer, no score, no fail.

## The map

Units appear on the home path in this order. Each teaching lesson introduces 4
words; review lessons consolidate. Characters host per their role (see
`CLAUDE.md`).

### Unit 1 — Fruits · Плодове  (host: Samodiva 🌿)
| Lesson | Words | Notes |
|--------|-------|-------|
| Fruits 1 | apple, banana, grapes, pear | ✅ |
| Fruits 2 | orange, strawberry, watermelon, lemon | ✅ |
| Fruits — Hero's Challenge | all 8 | ✅ Krali Marko boss round |

### Unit 2 — Animals · Животни  (host: Samodiva 🌿)
| Lesson | Words | Notes |
|--------|-------|-------|
| Animals 1 | cat, dog, bird, fish | ✅ |
| Animals 2 | cow, horse, sheep, pig | ✅ farm set |
| Animals — Hero's Challenge | all 8 | ✅ Krali Marko boss round |

### Unit 3 — Colors · Цветове  (host: Samodiva 🌿)
| Lesson | Words | Notes |
|--------|-------|-------|
| Colors 1 | red, blue, green, yellow | ✅ |
| Colors 2 | orange, purple, black, white | ✅ |
| Colors — Hero's Challenge | all 8 | ✅ Krali Marko boss round |

### Unit 4 — Numbers · Числа  (host: Krali Marko 🗡️)
| Lesson | Words | Notes |
|--------|-------|-------|
| Numbers 1 | one–five | ✅ |
| Numbers 2 | six–ten | ✅ |
| Numbers — Hero's Challenge | all 10 | ✅ Krali Marko boss round |

### Unit 5 — Family · Семейство  (host: Baba Marta 👵)
| Lesson | Words | Notes |
|--------|-------|-------|
| Family 1 | mother, father, grandma, grandpa | ✅ |

### Unit 6 — Body · Тяло  (host: Kuker 🔔)
| Lesson | Words | Notes |
|--------|-------|-------|
| Body 1 | hand, eye, nose, mouth | ✅ |

### Unit 7 — Weather · Време  (host: Samodiva 🌿)
| Lesson | Words | Notes |
|--------|-------|-------|
| Weather 1 | sun, rain, cloud, snow | ✅ |

### Unit 8 — Food · Храна  (host: Baba Marta 👵)
| Lesson | Words | Notes |
|--------|-------|-------|
| Food 1 | bread, cheese, milk, egg | ✅ |
| Food 2 | honey, soup, banitsa, water | ✅ баница = a cultural favorite |
| Hero's Challenge — Food | mixed review + odd-one-out | ✅ `boss` |

### Unit 9 — Home · Вкъщи  (host: Kuma Lisa 🦊)
| Lesson | Words | Notes |
|--------|-------|-------|
| Home 1 | house, door, window, chair | ✅ |
| Home 2 | bed, lamp, key, clock | ✅ |
| Hero's Challenge — Home | mixed review + odd-one-out | ✅ `boss` |

### Unit 10 — Clothes · Дрехи  (host: Kuker 🔔)
| Lesson | Words | Notes |
|--------|-------|-------|
| Clothes 1 | shirt, shoes, hat, socks | ✅ |
| Clothes 2 | dress, coat, gloves, scarf | ✅ |
| Hero's Challenge — Clothes | mixed review + odd-one-out | ✅ `boss` |

### Unit 11 — Cities & Places · Градове и места  (host: Krali Marko 🗡️)
| Lesson | Words | Notes |
|--------|-------|-------|
| Cities 1 | Sofia, Plovdiv, Varna, Burgas, Veliko Tarnovo | ✅ `find_on_map` |
| Places 1 | sea, mountain, river, forest, city, village | ✅ |

### Alphabet track  (host: Kuker 🔔) — direction-specific
- Browse: tap any letter to hear it (Latin for →English, Cyrillic for →Bulgarian).
- **Practice** (`letter_sound`): hear a letter, tap it. 5 rounds.

### find_on_map — a map you tap
A stylized map of Bulgaria (land + the Black Sea on the east edge) with city
pins at their real relative positions. Hear a city, tap where it is. Pins are
sized by the map's measured pixels, so they land accurately on every screen.
Positive-only: a wrong tap gently reveals and speaks the right city.

## Planned next (not yet built)

- **Family 2** (brother, sister) and **Body 2** (ear, foot, leg) second lessons,
  each capped with a Krali Marko **Hero's Challenge** boss round.
- **Weather 2** (wind, storm) and a review lesson per new unit.
- **Baba Marta seasonal event**: a 1st-of-March martenitsa give-away.

### The Hero's Challenge (юнашки изпит) — built

A `boss: true` lesson (see the `Lesson` type). Krali Marko opens with a spoken
challenge (BossIntro), hosts the mixed-review tiles himself, and the reward
screen adds a gold medal 🏅 with his "Ти си юнак!" line. Still positive-only —
a hero's game, never a test you can fail. Add one by setting `boss: true` on a
review lesson.

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
