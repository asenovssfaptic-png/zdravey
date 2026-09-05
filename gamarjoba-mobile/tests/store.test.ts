/* Store — defaults, legacy merge, monotonicity, persistence round-trip. */

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  _resetForTests,
  addXp,
  bump,
  bumpGameRound,
  getProgress,
  hydrate,
  maxStar,
  mergeSave,
  pushOnce,
  recordTodayPlayed,
  setWod,
  STORE_KEY,
  storeDefaults,
  XP_MILESTONES,
} from "../lib/store";

const EXPECTED_KEYS = [
  "xp",
  "stars",
  "practiceStars",
  "badges",
  "crowns",
  "lastPracticed",
  "letterCardsOpened",
  "buildFirstTries",
  "practiceSessions",
  "lettersMeetDone",
  "lettersTraceDone",
  "lettersTraced",
  "lettersExamStars",
  "readingCardsDone",
  "readingPracticeDone",
  "readingExamStars",
  "unitCardsDone",
  "unitExamStars",
  "daysPlayed",
  "stickers",
  "wodDate",
  "wodId",
  "wodCollected",
  "lettersReadDone",
  "sprintFlips",
  "gameRounds",
];

async function flush(): Promise<void> {
  // persist() is fire-and-forget — let the microtask queue drain
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(async () => {
  _resetForTests();
  await AsyncStorage.clear();
});

describe("defaults & merge (gamarjoba.v1 — same schema as the web app)", () => {
  test("defaults carry exactly the web schema keys", () => {
    expect(Object.keys(storeDefaults()).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  test("legacy partial save merges; unknown keys are dropped", () => {
    const merged = mergeSave({
      xp: 120,
      stars: { "greetings-1": 3 },
      badges: ["first-lesson"],
      someFutureKey: { anything: true },
    });
    expect(merged.xp).toBe(120);
    expect(merged.stars["greetings-1"]).toBe(3);
    expect(merged.badges).toEqual(["first-lesson"]);
    expect((merged as unknown as Record<string, unknown>).someFutureKey).toBeUndefined();
    // v2/v3/v4 keys default in for an old save
    expect(merged.lettersReadDone).toEqual([]);
    expect(merged.sprintFlips).toBe(0);
    expect(merged.gameRounds).toEqual({});
  });

  test("garbage saves fall back to defaults", () => {
    expect(mergeSave(null)).toEqual(storeDefaults());
    expect(mergeSave("nope")).toEqual(storeDefaults());
    expect(mergeSave(42)).toEqual(storeDefaults());
  });
});

describe("monotonic-only mutation API", () => {
  test("maxStar never lowers a saved best", () => {
    maxStar("stars", "l1", 3);
    maxStar("stars", "l1", 1);
    expect(getProgress().stars.l1).toBe(3);
    maxStar("unitExamStars", "u1", 2);
    maxStar("unitExamStars", "u1", 2);
    expect(getProgress().unitExamStars.u1).toBe(2);
  });

  test("pushOnce is idempotent and append-only", () => {
    expect(pushOnce("badges", "first-lesson")).toBe(true);
    expect(pushOnce("badges", "first-lesson")).toBe(false);
    expect(getProgress().badges).toEqual(["first-lesson"]);
  });

  test("addXp only goes up and each milestone fires exactly once", () => {
    expect(XP_MILESTONES.map((m) => m.at)).toEqual([500, 1500, 3000]);
    expect(addXp(499)).toEqual([]);
    const crossed = addXp(2);
    expect(crossed.map((m) => m.at)).toEqual([500]);
    expect(addXp(1)).toEqual([]); // already past 500 — never re-fires
    expect(addXp(0)).toEqual([]);
    expect(addXp(-50)).toEqual([]); // decrements are impossible
    expect(getProgress().xp).toBe(502);
    const both = addXp(3000);
    expect(both.map((m) => m.at)).toEqual([1500, 3000]);
  });

  test("bump and bumpGameRound only increment", () => {
    expect(bump("sprintFlips")).toBe(1);
    expect(bump("sprintFlips", -5)).toBe(1); // negative bumps are no-ops
    expect(bumpGameRound("market")).toBe(1);
    expect(bumpGameRound("market")).toBe(2);
    expect(getProgress().gameRounds.market).toBe(2);
  });

  test("recordTodayPlayed appends once per day", () => {
    expect(recordTodayPlayed()).toBe(true);
    expect(recordTodayPlayed()).toBe(false);
    expect(getProgress().daysPlayed).toHaveLength(1);
  });
});

describe("persistence round-trip (AsyncStorage mock)", () => {
  test("writes persist and hydrate back", async () => {
    await hydrate();
    addXp(25);
    maxStar("stars", "greetings-1", 2);
    pushOnce("stickers", "st-1");
    setWod("2026-09-05", "gamarjoba");
    await flush();

    const raw = await AsyncStorage.getItem(STORE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.xp).toBe(25);
    expect(parsed.stars["greetings-1"]).toBe(2);

    _resetForTests();
    const loaded = await hydrate();
    expect(loaded.xp).toBe(25);
    expect(loaded.stars["greetings-1"]).toBe(2);
    expect(loaded.stickers).toEqual(["st-1"]);
    expect(loaded.wodId).toBe("gamarjoba");
  });

  test("hydrating a corrupt save never crashes and keeps defaults", async () => {
    await AsyncStorage.setItem(STORE_KEY, "{not json");
    const loaded = await hydrate();
    expect(loaded).toEqual(storeDefaults());
  });
});
