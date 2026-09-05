/* Gamarjoba! mobile — progress store.
 *
 * ONE AsyncStorage key, `gamarjoba.v1`, with the exact JSON shape of the
 * web app's storeDefaults() — a save file is portable between the two.
 *
 * Every value is MONOTONIC: XP, stars, badges, crowns, stickers and
 * counters only ever go up; lists are append-only. There are no delete or
 * decrement functions in this module, and nothing else may write.
 *
 * Implementation: module-level state + useSyncExternalStore. Writes update
 * the in-memory snapshot synchronously (immutably) and persist
 * fire-and-forget; storage failure never breaks play (in-memory fallback,
 * like the web app in private mode).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

import { todayKey } from "./dates";

export const STORE_KEY = "gamarjoba.v1";

export interface Progress {
  xp: number;
  stars: Record<string, number>; // lessonId -> best stars 1..3, max-merge only
  practiceStars: number; // increment-only
  badges: string[]; // append-only set
  crowns: string[]; // unit ids, never revoked
  lastPracticed: Record<string, number>; // wordId -> timestamp
  letterCardsOpened: string[]; // letter ka strings opened at least once
  buildFirstTries: number; // build_word first-try count (word-builder badge)
  practiceSessions: number; // completed practice sessions (practicer badge)
  lettersMeetDone: string[]; // group ids
  lettersTraceDone: string[]; // group ids
  lettersTraced: string[]; // individual ka chars ever traced
  lettersExamStars: Record<string, number>; // groupId -> best stars, max-merge
  readingCardsDone: string[]; // reading step ids
  readingPracticeDone: string[]; // reading step ids
  readingExamStars: Record<string, number>; // stepId -> best stars, max-merge
  unitCardsDone: string[]; // lesson ids
  unitExamStars: Record<string, number>; // unitId -> best stars, max-merge
  daysPlayed: string[]; // ISO "YYYY-MM-DD", append-only, gaps never shown
  stickers: string[]; // sticker ids, append-only
  wodDate: string; // date of the current word of the day
  wodId: string; // its vocab id
  wodCollected: string[]; // collected word-of-the-day ids, append-only
  lettersReadDone: string[]; // group ids
  sprintFlips: number; // lifetime Reading-stroll card flips
  gameRounds: Record<string, number>; // gameId -> completed rounds, increment-only
}

export function storeDefaults(): Progress {
  return {
    xp: 0,
    stars: {},
    practiceStars: 0,
    badges: [],
    crowns: [],
    lastPracticed: {},
    letterCardsOpened: [],
    buildFirstTries: 0,
    practiceSessions: 0,
    lettersMeetDone: [],
    lettersTraceDone: [],
    lettersTraced: [],
    lettersExamStars: {},
    readingCardsDone: [],
    readingPracticeDone: [],
    readingExamStars: {},
    unitCardsDone: [],
    unitExamStars: {},
    daysPlayed: [],
    stickers: [],
    wodDate: "",
    wodId: "",
    wodCollected: [],
    lettersReadDone: [],
    sprintFlips: 0,
    gameRounds: {},
  };
}

/** Upgrade-safe merge: defaults ⊕ per-known-key copy from a parsed save.
 * Unknown keys in the save are dropped; missing keys keep their default —
 * exactly the web app's loadState(). Pure, exported for tests. */
export function mergeSave(raw: unknown): Progress {
  const s = storeDefaults();
  if (raw && typeof raw === "object") {
    const p = raw as Record<string, unknown>;
    (Object.keys(s) as (keyof Progress)[]).forEach((k) => {
      if (p[k] !== undefined && p[k] !== null) {
        (s as unknown as Record<string, unknown>)[k] = p[k];
      }
    });
  }
  return s;
}

/* ------------------------------------------------------------------ *
 * Module state + subscription
 * ------------------------------------------------------------------ */

let state: Progress = storeDefaults();
let hydrated = false;
let firstVisitToday = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  AsyncStorage.setItem(STORE_KEY, JSON.stringify(state)).catch(() => {
    /* storage blocked / full — keep playing in memory */
  });
}

/** Apply a partial update immutably, persist, notify. */
function update(patch: Partial<Progress>): void {
  state = { ...state, ...patch };
  persist();
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProgress(): Progress {
  return state;
}

export function isHydrated(): boolean {
  return hydrated;
}

/** Load the saved progress. Call once at boot (the root layout holds the
 * splash screen until this resolves). Safe to call again (no-op). */
export async function hydrate(): Promise<Progress> {
  if (hydrated) return state;
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) state = mergeSave(JSON.parse(raw));
  } catch {
    /* unreadable save — start from defaults, never crash */
  }
  hydrated = true;
  emit();
  return state;
}

/** Live progress hook — re-renders on every store write. */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getProgress);
}

export function useStoreHydrated(): boolean {
  return useSyncExternalStore(subscribe, isHydrated, isHydrated);
}

/* ------------------------------------------------------------------ *
 * Monotonic mutation API — the ONLY writers.
 * ------------------------------------------------------------------ */

export type StarMapKey = "stars" | "lettersExamStars" | "readingExamStars" | "unitExamStars";

export type ListKey =
  | "badges"
  | "crowns"
  | "letterCardsOpened"
  | "lettersMeetDone"
  | "lettersTraceDone"
  | "lettersTraced"
  | "readingCardsDone"
  | "readingPracticeDone"
  | "unitCardsDone"
  | "daysPlayed"
  | "stickers"
  | "wodCollected"
  | "lettersReadDone";

export type CounterKey = "practiceStars" | "buildFirstTries" | "practiceSessions" | "sprintFlips";

/** XP milestones — celebrated when crossed, never lost (XP only goes up). */
export const XP_MILESTONES: { at: number; label: string }[] = [
  { at: 500, label: "🥉 Bronze borjgali" },
  { at: 1500, label: "🥈 Silver borjgali" },
  { at: 3000, label: "🥇 Golden borjgali" },
];

/** Add XP (n > 0). Returns the milestones crossed by this addition, so the
 * caller can celebrate them — each fires exactly once, ever. */
export function addXp(n: number): { at: number; label: string }[] {
  if (n <= 0) return [];
  const before = state.xp;
  const after = before + n;
  update({ xp: after });
  return XP_MILESTONES.filter((m) => before < m.at && after >= m.at);
}

/** Max-merge a star result in — a lower result never lowers a saved best. */
export function maxStar(map: StarMapKey, key: string, stars: number): void {
  const prev = state[map][key] ?? 0;
  if (stars <= prev) return;
  update({ [map]: { ...state[map], [key]: stars } } as Partial<Progress>);
}

/** Append to an append-only list if absent. True when it was added. */
export function pushOnce(listKey: ListKey, value: string): boolean {
  if (state[listKey].includes(value)) return false;
  update({ [listKey]: [...state[listKey], value] } as Partial<Progress>);
  return true;
}

/** Increment-only counter bump. Returns the new value. */
export function bump(counterKey: CounterKey, n = 1): number {
  const next = state[counterKey] + Math.max(0, n);
  update({ [counterKey]: next } as Partial<Progress>);
  return next;
}

/** Increment a game's lifetime round counter. Returns the new value. */
export function bumpGameRound(gameId: string): number {
  const next = (state.gameRounds[gameId] ?? 0) + 1;
  update({ gameRounds: { ...state.gameRounds, [gameId]: next } });
  return next;
}

/** Remember practice recency for these words (feeds the practice mixer). */
export function markPracticed(wordIds: string[]): void {
  if (!wordIds.length) return;
  const now = Date.now();
  const lastPracticed = { ...state.lastPracticed };
  wordIds.forEach((id) => {
    lastPracticed[id] = now;
  });
  update({ lastPracticed });
}

/** Pin today's word of the day (the deterministic pick is in the engine). */
export function setWod(date: string, id: string): void {
  if (state.wodDate === date && state.wodId === id) return;
  update({ wodDate: date, wodId: id });
}

/** Record today's visit; true when this is the first visit of the day
 * (drives the "Day N" hero and the daily-gift modal). The result is
 * remembered for the session so home can read it after boot. */
export function recordTodayPlayed(): boolean {
  const today = todayKey();
  if (state.daysPlayed.includes(today)) return false;
  update({ daysPlayed: [...state.daysPlayed, today] });
  firstVisitToday = true;
  return true;
}

/** Whether boot's recordTodayPlayed() was the first visit today —
 * the daily-gift modal shows exactly once per day. */
export function wasFirstVisitToday(): boolean {
  return firstVisitToday;
}

/** Consume the first-visit flag (the gift modal calls this when shown so
 * a re-navigation to home never re-opens it). */
export function consumeFirstVisitToday(): boolean {
  const v = firstVisitToday;
  firstVisitToday = false;
  return v;
}

/* ------------------------------------------------------------------ *
 * Test hook — not for app code.
 * ------------------------------------------------------------------ */

export function _resetForTests(initial?: Partial<Progress>): void {
  state = { ...storeDefaults(), ...initial };
  hydrated = false;
  firstVisitToday = false;
  listeners.clear();
}
