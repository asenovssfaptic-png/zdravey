# CLAUDE.md — Zdravey! (working title)

A kids' language-learning app for **Bulgarian ↔ English**, aimed at **ages 5+**.
Think "Duolingo for Bulgarian," but built for young children and grounded in
Bulgarian folklore. Ships as **one codebase → website + mobile**.

> Keep this file lean. Detailed data shapes live in `content-model.ts`.
> If you correct me twice about the same project fact, add it here.

## What we're building

- A gentle, audio-first vocabulary + phrase app for young kids.
- Two mascots (martenitsa dolls **Pizho & Penda**) plus a folklore supporting cast.
- Bilingual and **bidirectional**: same app teaches English to Bulgarian kids
  and Bulgarian to English kids. Direction is a setting, not a separate build.

## Who it's for

- **Primary learner:** Bulgarian-speaking child, 5+, learning English.
  UI/instructions are in the child's *known* language (Bulgarian by default).
- Must work for **pre-readers**: nothing important is text-only; audio drives everything.
- **Parents** do setup (direction, child profile, recording family voices).

## Platforms & stack

- **Expo (React Native + React Native Web)** — one TypeScript codebase for
  iOS, Android, and web. Use the latest stable Expo SDK (check, don't assume).
- **Navigation:** Expo Router.
- **Audio:** `expo-audio` (playback + recording). Audio is core, not an afterthought.
- **Storage:** local only for MVP — Expo/AsyncStorage on mobile, same API on web.
  No backend, no accounts, no network calls in the MVP. Content is bundled.
- **Language:** TypeScript, functional components + hooks.

## Architecture: bidirectional by design (most important rule)

- **Store every vocabulary item ONCE**, language-neutral. See `content-model.ts`
  (`VocabItem`, `Direction`, `buildPickPicture`) — that file is the source of truth.
- **Never** hardcode which language is prompt vs answer. Read `Direction` and pull
  `labels[dir.known]` / `labels[dir.learning]` off the item.
- **Never** duplicate content per direction or per language.
- One exercise component must render both directions with no forking.
- The alphabet track is the only direction-specific content: Latin ABC for
  bg→en, Cyrillic for en→bg.

## Non-negotiable design principles

- **Audio-first.** Every prompt, word, and button has sound. A kid can complete a
  lesson without reading.
- **Positive-only. NO hearts, NO streaks-you-can-lose, NO timers, NO failure states.**
  Wrong answers bounce back gently and show the right one. Rewards only.
  Progress = collecting *martenitsi*. This is a hard rule — do not add Duolingo-style
  pressure mechanics.
- **Short sessions** (~3–4 min / lesson). One instruction on screen at a time.
- **Huge tap targets**, generous spacing, minimal text.
- **Culturally Bulgarian:** martenitsa red/white theme, folk characters, real
  Bulgarian children's-song hooks where possible.

## Characters (use sparingly — a rotating guest, not a crowd)

- **Pizho & Penda** — main mascots, the martenitsa dolls (white boy / red girl).
  They are NOT animals; keep them as yarn dolls.
- **Baba Marta** — daily greeter, hands out martenitsi (rewards), seasonal events.
- **Kuma Lisa** — clever fox, the hint helper; tips teach a *strategy* (first sound,
  eliminate a distractor), never just reveal the answer.
- **Hitar Petar** — trick/riddle bonus rounds (odd-one-out).
- **Samodiva** — hosts nature-themed units (animals, plants, colors, weather).
- **Krali Marko** — end-of-unit review challenge ("юнашки изпит").
- **Zmey** — friendly guardian dragon at a unit's treasure/reward.
- **Kuker** — pronunciation ("say it out loud") and festival/celebration moments.

Each character has one job; don't let them all appear at once. Give each a
signature sound (Baba Marta's jingle, Kuker's bells, Kuma Lisa's "пссст").

## Content model

- Source of truth: `content-model.ts` (types + sample `fruitsUnit`).
- Hierarchy: `Unit` (map node, hosted by a character) → `Lesson` (3–4 min) →
  `Exercise[]`.
- Exercise types (5+ appropriate): `pick_picture` (workhorse), `match_pairs`,
  `say_it`, `odd_one_out`, `letter_sound`.
- To add content: add `VocabItem`s to `VOCAB`, then reference their ids in a
  `Unit`. Never write English/Bulgarian strings inline in components — always
  read them from the vocab item via the current `Direction`.
- **Audio path convention:** `audio/{lang}/{word}__{voiceId}.mp3`
  (e.g. `audio/bg/yabalka__baba.mp3`). `voiceId` = `baba | mama | dyado | default`.

## Screens (MVP set)

Home/learning path · Lesson (`pick_picture`) · Celebration/reward ·
Alphabet track · Parent setup (direction + record family voices).

## Child safety & ethics (hard rules)

- **No ads, no third-party SDKs/trackers, no analytics that send data off-device.**
- No account, no personal data collection, no external links or in-app webviews.
- No engagement-manipulation (no guilt notifications, no loss-aversion streaks).
- Age-appropriate art only: friendly, never scary. The Zmey is benevolent; do NOT
  add the ламя/хала villain or scary kuker masks.
- Parent-gated setup so young kids can't change core settings by accident.

## Suggested project layout

```
/app            Expo Router routes (screens)
/components     reusable UI (Tile, AudioButton, ProgressBar, CharacterBubble)
/characters     character assets + metadata
/content        content-model.ts + unit/vocab data
/assets/audio   bg/ and en/ recordings
/lib            direction, storage, audio helpers
```

## Conventions

- TypeScript strict. Functional components, hooks, no class components.
- Colors/spacing via a shared theme (martenitsa palette: red `#E24B4A`,
  dark red `#A32D2D`, white `#F1EFE8`). No hardcoded hex scattered in components.
- Accessibility: label every interactive element; audio for every prompt.
- Keep components small; one exercise type per component.

## Commands

> New project — update these once scaffolded.

```
npx create-expo-app@latest        # scaffold
npx expo start                    # dev (press w for web, i/a for simulators)
npx expo start --web              # web only
```

## Do NOT

- Add hearts, lives, losable streaks, countdown timers, or any failure/punishment state.
- Hardcode a language direction or duplicate content per language.
- Put required information in text with no audio.
- Introduce a backend, accounts, ads, tracking, or external links in the MVP.
- Add scary imagery or the folklore villains.
- Overload a screen — one instruction, big targets, minimal words.
