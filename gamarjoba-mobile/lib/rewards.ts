/* Gamarjoba! mobile — rewards: XP milestones, stars, crowns, badges,
 * stickers. A faithful port of the web app's reward branches. MONOTONIC
 * ONLY: everything here can only add — nothing is ever taken away, and
 * exams/lessons always award at least one star.
 *
 * All writes go through lib/store's monotonic API. Functions return what
 * was NEWLY earned so screens can toast/announce/confetti it.
 */

import { CURRICULUM } from "../content/generated/curriculum";
import type { Sticker, Unit } from "../content/types";
import {
  finishBonus,
  findUnit,
  lessonsDone,
  starsForAccuracy,
  type SessionConfig,
} from "./exercise-engine";
import {
  addXp,
  bump,
  bumpGameRound,
  getProgress,
  maxStar,
  pushOnce,
  XP_MILESTONES,
} from "./store";

export { XP_MILESTONES };

const C = CURRICULUM;

export interface BadgeInfo {
  id: string;
  emoji: string;
  name: string;
}

/** The 11 badges — ids are save keys and match the web exactly
 * (incl. `reading-sprinter`, whose display name moved on). */
export const BADGES: Record<string, Omit<BadgeInfo, "id">> = {
  "first-lesson": { emoji: "🎒", name: "First lesson" },
  "first-crown": { emoji: "👑", name: "First crown" },
  "alphabet-explorer": { emoji: "🔤", name: "Alphabet explorer" },
  "word-builder": { emoji: "🧱", name: "Word builder" },
  practicer: { emoji: "🏃", name: "Practicer" },
  "letter-artist": { emoji: "✍️", name: "Letter artist" },
  "first-reader": { emoji: "📖", name: "First reader" },
  "reading-sprinter": { emoji: "🪁", name: "Reading wanderer" }, // 50 lifetime stroll flips
  "home-finder": { emoji: "🛋️", name: "Home finder" }, // 10 Find-it-at-home finds
  "market-helper": { emoji: "🧺", name: "Market helper" }, // 3 completed shopping lists
  "letter-scout": { emoji: "🔎", name: "Letter scout" }, // 10 Letter-safari rounds
};

export function badgeInfo(id: string): BadgeInfo | null {
  const b = BADGES[id];
  return b ? { id, ...b } : null;
}

/** Earn a badge once, ever. Returns its info when NEWLY earned. */
export function earnBadge(id: string): BadgeInfo | null {
  if (!BADGES[id]) return null;
  return pushOnce("badges", id) ? badgeInfo(id) : null;
}

/* ------------------------------------------------------------------ *
 * Sticker album — daily gifts, first exam passes and crowns all draw
 * from C.stickers IN ORDER, so the album always completes. Append-only.
 * ------------------------------------------------------------------ */

export function nextSticker(): Sticker | null {
  const owned = getProgress().stickers;
  return (C.stickers ?? []).find((st) => !owned.includes(st.id)) ?? null;
}

/** Grant the next sticker in album order; null when the album is full. */
export function grantSticker(): Sticker | null {
  const st = nextSticker();
  if (!st) return null;
  pushOnce("stickers", st.id);
  return st;
}

/* ------------------------------------------------------------------ *
 * Crowns — celebrate the whole unit: every lesson ≥1★ AND the unit exam
 * passed. Existing crowns persist forever.
 * ------------------------------------------------------------------ */

export interface CrownOutcome {
  crowned: boolean;
  badge: BadgeInfo | null;
  sticker: Sticker | null;
}

export function maybeCrown(unit: Unit): CrownOutcome {
  const p = getProgress();
  const none: CrownOutcome = { crowned: false, badge: null, sticker: null };
  if (p.crowns.includes(unit.id)) return none;
  if (lessonsDone(p, unit) !== unit.lessons.length) return none;
  if ((p.unitExamStars[unit.id] ?? 0) < 1) return none;
  pushOnce("crowns", unit.id);
  return {
    crowned: true,
    badge: earnBadge("first-crown"),
    sticker: grantSticker(),
  };
}

/* ------------------------------------------------------------------ *
 * Session finish — the one place stars/bonuses are written.
 * ------------------------------------------------------------------ */

export interface FinishOutcome {
  /** stars earned THIS run (best-ever is max-merged into the store). */
  starsEarned: number;
  /** star slots to draw: 3 for lessons/exams, 1 for practice, 0 for
   * reading practice / letters-read (praise + XP only). */
  slotCount: number;
  /** finish-line XP bonus added (already applied to the store). */
  xpBonus: number;
  /** milestones crossed by the bonus XP. */
  milestones: { at: number; label: string }[];
  /** sticker newly granted (first unit-exam pass, or via a crown). */
  sticker: Sticker | null;
  /** unit crowned by this finish. */
  crowned: boolean;
  /** badges newly earned by this finish. */
  badges: BadgeInfo[];
}

/** Apply every reward for a finished session — exact port of the web
 * finishSession branches. `xpEarned` (per-answer XP) is already in the
 * store; this adds the finish bonus and returns everything newly earned. */
export function finishSession(
  cfg: SessionConfig,
  score: number,
  totalOriginal: number
): FinishOutcome {
  const mode = cfg.mode;
  const badges: BadgeInfo[] = [];
  let starsEarned = 0;
  let slotCount = 3;
  let sticker: Sticker | null = null;
  let crowned = false;
  let milestones: { at: number; label: string }[] = [];

  const push = (b: BadgeInfo | null) => {
    if (b) badges.push(b);
  };

  if (mode === "practice") {
    bump("practiceStars");
    const sessions = bump("practiceSessions");
    starsEarned = 1;
    slotCount = 1;
    if (sessions >= 5) push(earnBadge("practicer"));
  } else if (mode === "reading-practice" || mode === "letters-read") {
    if (mode === "letters-read" && cfg.groupId) pushOnce("lettersReadDone", cfg.groupId);
    if (mode === "reading-practice" && cfg.stepId) pushOnce("readingPracticeDone", cfg.stepId);
    slotCount = 0; // no stars — praise + XP only
  } else if (mode === "letters-exam" || mode === "reading-exam" || mode === "unit-exam") {
    starsEarned = starsForAccuracy(score, totalOriginal); // always ≥ 1
    const p = getProgress();
    let prev = 0;
    if (mode === "letters-exam" && cfg.groupId) {
      prev = p.lettersExamStars[cfg.groupId] ?? 0;
      maxStar("lettersExamStars", cfg.groupId, starsEarned);
    } else if (mode === "reading-exam" && cfg.stepId) {
      prev = p.readingExamStars[cfg.stepId] ?? 0;
      maxStar("readingExamStars", cfg.stepId, starsEarned);
    } else if (mode === "unit-exam" && cfg.unitId) {
      prev = p.unitExamStars[cfg.unitId] ?? 0;
      maxStar("unitExamStars", cfg.unitId, starsEarned);
    }
    milestones = addXp(finishBonus(mode));
    if (mode === "reading-exam") push(earnBadge("first-reader"));
    if (mode === "unit-exam" && cfg.unitId) {
      if (prev === 0) sticker = grantSticker(); // first-time pass feeds the album
      const unit = findUnit(cfg.unitId);
      if (unit) {
        const c = maybeCrown(unit);
        crowned = c.crowned;
        push(c.badge);
        if (!sticker) sticker = c.sticker;
      }
    }
  } else {
    // lesson
    starsEarned = starsForAccuracy(score, totalOriginal); // always ≥ 1
    if (cfg.lessonId) maxStar("stars", cfg.lessonId, starsEarned);
    milestones = addXp(finishBonus(mode));
    push(earnBadge("first-lesson"));
    if (cfg.lessonId) {
      const found = findUnit(cfg.unitId ?? "") ?? null;
      const unit =
        found ??
        CURRICULUM.units.find((u) => u.lessons.some((l) => l.id === cfg.lessonId)) ??
        null;
      if (unit) {
        const c = maybeCrown(unit);
        crowned = c.crowned;
        push(c.badge);
        if (!sticker) sticker = c.sticker;
      }
    }
  }

  return {
    starsEarned,
    slotCount,
    xpBonus: finishBonus(mode),
    milestones,
    sticker,
    crowned,
    badges,
  };
}

/* ------------------------------------------------------------------ *
 * Incremental badge triggers (used across screens)
 * ------------------------------------------------------------------ */

/** A letter card/dialog was opened. 10 distinct → Alphabet explorer. */
export function recordLetterOpened(ka: string): BadgeInfo | null {
  if (!pushOnce("letterCardsOpened", ka)) return null;
  return getProgress().letterCardsOpened.length >= 10 ? earnBadge("alphabet-explorer") : null;
}

/** A letter was traced (or watch-drawn). 10 distinct → Letter artist. */
export function recordTraced(ka: string): BadgeInfo | null {
  if (!pushOnce("lettersTraced", ka)) return null;
  return getProgress().lettersTraced.length >= 10 ? earnBadge("letter-artist") : null;
}

/** build_word solved first try. 10 lifetime → Word builder. */
export function recordBuildFirstTry(): BadgeInfo | null {
  return bump("buildFirstTries") >= 10 ? earnBadge("word-builder") : null;
}

/** A stroll card flipped. 50 lifetime → Reading wanderer. */
export function recordStrollFlip(): BadgeInfo | null {
  return bump("sprintFlips") >= 50 ? earnBadge("reading-sprinter") : null;
}

/** A game round/list completed. Per-game lifetime badge thresholds. */
export function recordGameRound(gameId: string): BadgeInfo | null {
  const n = bumpGameRound(gameId);
  if (gameId === "find-home" && n >= 10) return earnBadge("home-finder");
  if (gameId === "market" && n >= 3) return earnBadge("market-helper");
  if (gameId === "letter-safari" && n >= 10) return earnBadge("letter-scout");
  return null;
}
