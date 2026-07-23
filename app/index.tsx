import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { BottomNav } from "@/components/BottomNav";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Martenitsa } from "@/components/Martenitsa";
import { ScreenBackground } from "@/components/ScreenBackground";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import type { LangCode, Lesson, Unit } from "@/content/content-model";
import { UNITS, VOCAB } from "@/content/content-model";
import { useDirection } from "@/lib/direction";
import { characterImage } from "@/lib/images";
import { useProgress } from "@/lib/progress";

// The home screen is the story of a юнак (hero-knight) on an adventure. The
// winding trail is the journey; every lesson is a STOP along the way, hosted by
// a folklore character. The knight stands at the stop the child is on now; each
// finished stop plants a waving flag (positive-only — flags only ever appear,
// never come down). Krali Marko, the app's hero, guides the adventure.

const FLAG: Record<LangCode, string> = { bg: "🇧🇬", en: "🇬🇧" };

type Side = "left" | "right";

// A few representative emoji for a stop, pulled from the vocab its lesson uses.
function lessonEmojis(lesson: Lesson): string {
  const ids = new Set<string>();
  for (const ex of lesson.exercises) {
    ids.add(ex.prompt);
    for (const c of ex.choices ?? []) ids.add(c);
  }
  const emojis: string[] = [];
  for (const id of ids) {
    const e = VOCAB[id]?.emoji;
    if (e && !emojis.includes(e)) emojis.push(e);
    if (emojis.length === 3) break;
  }
  return emojis.join("");
}

// Build the journey once (module-scope: UNITS is constant). Chapters are units;
// each holds its ordered stops. `side` alternates across the WHOLE path so the
// trail keeps zig-zagging even as it crosses from one chapter into the next.
const JOURNEY = (() => {
  let before = 0;
  return UNITS.map((unit, i) => {
    const start = before;
    before += unit.lessons.length;
    return {
      unit,
      chapter: i + 1,
      stops: unit.lessons.map((lesson, j) => ({
        lesson,
        side: ((start + j) % 2 === 0 ? "left" : "right") as Side,
      })),
    };
  });
})();

const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export default function HomeScreen() {
  const router = useRouter();
  const { direction } = useDirection();
  const { martenitsi, isLessonComplete } = useProgress();
  const bg = direction.known === "bg";
  const knight = CHARACTERS.krali_marko;

  // The knight rests on the first stop that isn't finished yet (or nowhere,
  // once the whole adventure is done).
  const currentId = ALL_LESSONS.find((l) => !isLessonComplete(l.id))?.id ?? null;
  const plantedFlags = ALL_LESSONS.filter((l) => isLessonComplete(l.id)).length;
  const totalStops = ALL_LESSONS.length;
  const allDone = plantedFlags === totalStops;

  const intro = bg
    ? "Аз съм юнакът! Тръгваме на приключение. На всяка спирка учим по нещо, а после забиваме флагче!"
    : "I'm the knight! Off on an adventure we go. At every stop we learn something, then plant a flag!";

  return (
    <ScreenBackground scene="meadow">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <View
            style={styles.martenitsaPill}
            accessibilityRole="text"
            accessibilityLabel={bg ? `Мартеници: ${martenitsi}` : `Martenitsi: ${martenitsi}`}
          >
            <Martenitsa size={26} />
            <Text style={styles.martenitsaNumber}>{martenitsi}</Text>
          </View>

          {/* Visible, tappable language switch (opens parent setup). */}
          <Pressable
            onPress={() => router.push("/parent-setup")}
            accessibilityRole="button"
            accessibilityLabel={bg ? "Смени езика" : "Change language"}
            style={({ pressed }) => [styles.langPill, pressed && styles.pressed]}
          >
            <Text style={styles.langText}>
              {FLAG[direction.known]} → {FLAG[direction.learning]}
            </Text>
            <Text style={styles.gearEmoji}>⚙️</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.adventureTitle}>
            🛡️ {bg ? "Приключението на юнака" : "The Knight's Adventure"}
          </Text>
          <CharacterBubble character={knight} text={intro} />

          {/* Flags planted so far — a positive tally that only ever grows. */}
          <View
            style={styles.flagTally}
            accessibilityRole="text"
            accessibilityLabel={
              bg
                ? `Забити флагчета: ${plantedFlags} от ${totalStops}`
                : `Flags planted: ${plantedFlags} of ${totalStops}`
            }
          >
            <Text style={styles.flagTallyText}>
              🚩 {plantedFlags}/{totalStops}{" "}
              {bg ? "флагчета по пътя" : "flags along the way"}
            </Text>
          </View>

          <View style={styles.trail}>
            {/* Dashed spine running down the middle — the road the knight walks. */}
            <View style={styles.spine} pointerEvents="none" />

            {JOURNEY.map(({ unit, chapter, stops }) => (
              <View key={unit.id}>
                <ChapterBanner unit={unit} chapter={chapter} knownLang={direction.known} />
                {stops.map(({ lesson, side }) => (
                  <PathStop
                    key={lesson.id}
                    lesson={lesson}
                    side={side}
                    knownLang={direction.known}
                    done={isLessonComplete(lesson.id)}
                    current={lesson.id === currentId}
                    onOpen={() => router.push(`/lesson/${lesson.id}`)}
                  />
                ))}
              </View>
            ))}

            {/* Side-quest: the alphabet, hosted by Kuker. Optional, so no flag. */}
            <SpecialStop
              emoji="🔔"
              glyphs={direction.learning === "bg" ? "Абв" : "Abc"}
              label={bg ? "Азбука" : "Alphabet"}
              caption={bg ? "Докосни, за да чуеш буквите" : "Tap to hear the letters"}
              onOpen={() => router.push("/alphabet")}
            />

            {/* Journey's end — the treasure the whole adventure leads to. */}
            <DestinationStop allDone={allDone} knownLang={direction.known} />
          </View>
        </ScrollView>

        <BottomNav />
      </SafeAreaView>
    </ScreenBackground>
  );
}

// A storybook chapter divider shown when a new unit begins.
function ChapterBanner({
  unit,
  chapter,
  knownLang,
}: {
  unit: Unit;
  chapter: number;
  knownLang: LangCode;
}) {
  const host = CHARACTERS[unit.host];
  return (
    <View style={styles.chapterBanner} accessibilityRole="header">
      <Text style={styles.chapterKicker}>
        {knownLang === "bg" ? `Глава ${chapter}` : `Chapter ${chapter}`}
      </Text>
      <Text style={styles.chapterTitle}>
        {host.emoji} {unit.theme[knownLang]}
      </Text>
    </View>
  );
}

// One stop on the trail: a card on the left or right of the spine, a knob on
// the spine, the knight when it's the current stop, and a flag once it's done.
function PathStop({
  lesson,
  side,
  knownLang,
  done,
  current,
  onOpen,
}: {
  lesson: Lesson;
  side: Side;
  knownLang: LangCode;
  done: boolean;
  current: boolean;
  onOpen: () => void;
}) {
  const boss = lesson.boss === true;
  const icon = boss ? "🏰" : lessonEmojis(lesson) || "⭐";
  const onDark = boss || (!done && !current);
  const label =
    (done ? (knownLang === "bg" ? "завършено, " : "completed, ") : "") + lesson.title[knownLang];

  const card = (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: done }}
      style={({ pressed }) => [
        styles.card,
        boss && styles.cardBoss,
        done && styles.cardDone,
        current && styles.cardCurrent,
        pressed && styles.pressed,
      ]}
    >
      {done && <FlagBadge />}
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={[styles.cardLabel, onDark && styles.cardLabelOnDark]} numberOfLines={2}>
        {lesson.title[knownLang]}
      </Text>
      {done && <Martenitsa size={24} />}
    </Pressable>
  );

  return (
    <View style={styles.stopRow}>
      <View style={[styles.half, styles.halfLeft]}>{side === "left" && card}</View>

      <View style={styles.knobCol}>
        {current ? (
          <KnightMarker knownLang={knownLang} />
        ) : (
          <View style={[styles.knob, done ? styles.knobDone : styles.knobTodo]} />
        )}
      </View>

      <View style={[styles.half, styles.halfRight]}>{side === "right" && card}</View>
    </View>
  );
}

// The knight himself, bobbing gently on the spine at the current stop.
function KnightMarker({ knownLang }: { knownLang: LangCode }) {
  const [bob] = useState(() => new Animated.Value(0));
  const painted = characterImage("krali_marko");

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  return (
    <Animated.View
      style={[styles.knight, { transform: [{ translateY }] }]}
      accessibilityRole="image"
      accessibilityLabel={knownLang === "bg" ? "Ти си тук, юнако" : "You are here, knight"}
    >
      {painted ? (
        <Image source={painted} style={styles.knightImg} resizeMode="cover" />
      ) : (
        <Text style={styles.knightEmoji}>🛡️</Text>
      )}
    </Animated.View>
  );
}

// A flag that pops in when a stop is completed, then waves in the breeze.
function FlagBadge() {
  const [pop] = useState(() => new Animated.Value(0));
  const [wave] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pop, wave]);

  const rotate = wave.interpolate({ inputRange: [0, 1], outputRange: ["-9deg", "9deg"] });

  return (
    <Animated.Text
      style={[styles.flagBadge, { transform: [{ scale: pop }, { rotate }] }]}
      accessibilityElementsHidden
    >
      🚩
    </Animated.Text>
  );
}

// A centered, special stop (side-quests / the alphabet) that sits on the spine.
function SpecialStop({
  emoji,
  glyphs,
  label,
  caption,
  onOpen,
}: {
  emoji: string;
  glyphs: string;
  label: string;
  caption: string;
  onOpen: () => void;
}) {
  return (
    <View style={styles.centerRow}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${caption}`}
        style={({ pressed }) => [styles.specialCard, pressed && styles.pressed]}
      >
        <Text style={styles.specialEmoji}>{emoji}</Text>
        <Text style={styles.specialGlyphs}>{glyphs}</Text>
        <Text style={styles.specialLabel}>{label}</Text>
        <Text style={styles.specialCaption} numberOfLines={2}>
          {caption}
        </Text>
      </Pressable>
    </View>
  );
}

// The end of the road: a treasure guarded by the friendly Zmey. Celebrates once
// every stop on the trail is flying a flag.
function DestinationStop({ allDone, knownLang }: { allDone: boolean; knownLang: LangCode }) {
  const bg = knownLang === "bg";
  return (
    <View style={styles.centerRow}>
      <View
        style={[styles.destination, allDone && styles.destinationDone]}
        accessibilityRole="text"
        accessibilityLabel={
          allDone
            ? bg
              ? "Приключението е завършено! Съкровището е твое."
              : "Adventure complete! The treasure is yours."
            : bg
              ? "Съкровището те чака в края на пътя."
              : "Treasure waits at the end of the road."
        }
      >
        <Text style={styles.destinationEmoji}>{allDone ? "🏆" : "💰"}</Text>
        <Text style={styles.destinationTitle}>
          {allDone
            ? bg
              ? "Победа, юнако!"
              : "Victory, knight!"
            : bg
              ? "Съкровището"
              : "The Treasure"}
        </Text>
        <Text style={styles.destinationCaption}>
          {allDone
            ? bg
              ? "Всички флагчета са забити!"
              : "Every flag is planted!"
            : bg
              ? "Забий всички флагчета, за да го стигнеш"
              : "Plant every flag to reach it"}
        </Text>
      </View>
    </View>
  );
}

const CARD_WIDTH = 172;
const KNOB_COL = 60;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  adventureTitle: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
  },
  flagTally: {
    alignSelf: "center",
    backgroundColor: Colors.tintGold,
    borderRadius: Radii.round,
    borderWidth: 2,
    borderColor: Colors.gold,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  flagTallyText: {
    fontSize: FontSizes.body,
    fontWeight: "800",
    color: Colors.darkRed,
  },

  // --- Trail / path ---
  trail: {
    position: "relative",
    marginTop: Spacing.sm,
  },
  spine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    marginLeft: -2,
    borderLeftWidth: 4,
    borderStyle: "dashed",
    borderColor: Colors.darkRed,
    opacity: 0.35,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: TouchTarget.min + Spacing.lg,
  },
  half: {
    flex: 1,
    justifyContent: "center",
  },
  halfLeft: {
    alignItems: "flex-end",
    paddingRight: Spacing.sm,
  },
  halfRight: {
    alignItems: "flex-start",
    paddingLeft: Spacing.sm,
  },
  knobCol: {
    width: KNOB_COL,
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  knobTodo: {
    backgroundColor: Colors.red,
  },
  knobDone: {
    backgroundColor: Colors.correct,
  },
  knight: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: Colors.gold,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  knightImg: {
    width: "100%",
    height: "100%",
  },
  knightEmoji: {
    fontSize: 30,
  },

  // --- Stop card ---
  card: {
    width: CARD_WIDTH,
    minHeight: TouchTarget.min,
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: "transparent",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  cardBoss: {
    backgroundColor: Colors.darkRed,
  },
  cardDone: {
    backgroundColor: Colors.tintGreen,
    borderColor: Colors.correct,
  },
  cardCurrent: {
    borderColor: Colors.gold,
  },
  cardIcon: {
    fontSize: 34,
  },
  cardLabel: {
    fontSize: FontSizes.label,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  cardLabelOnDark: {
    color: Colors.white,
  },
  flagBadge: {
    position: "absolute",
    top: -14,
    right: -6,
    fontSize: 30,
  },

  // --- Special + destination (centered on the spine) ---
  centerRow: {
    alignItems: "center",
    marginTop: Spacing.md,
  },
  specialCard: {
    width: CARD_WIDTH + 24,
    minHeight: TouchTarget.min,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.red,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    gap: 2,
  },
  specialEmoji: {
    fontSize: 30,
  },
  specialGlyphs: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.red,
  },
  specialLabel: {
    fontSize: FontSizes.label,
    fontWeight: "800",
    color: Colors.darkRed,
  },
  specialCaption: {
    fontSize: FontSizes.body,
    color: Colors.text,
    textAlign: "center",
  },
  destination: {
    width: CARD_WIDTH + 40,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.gold,
    backgroundColor: Colors.tintGold,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  destinationDone: {
    borderColor: Colors.correct,
    backgroundColor: Colors.tintGreen,
  },
  destinationEmoji: {
    fontSize: 44,
  },
  destinationTitle: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
  },
  destinationCaption: {
    fontSize: FontSizes.body,
    color: Colors.text,
    textAlign: "center",
  },

  // --- Chapter divider ---
  chapterBanner: {
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  chapterKicker: {
    fontSize: FontSizes.body,
    fontWeight: "800",
    color: Colors.red,
    letterSpacing: 1,
  },
  chapterTitle: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
  },

  // --- Header pills (unchanged) ---
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  martenitsaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.tintGreen,
    borderRadius: Radii.round,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.correct,
  },
  martenitsaNumber: {
    fontSize: FontSizes.label,
    fontWeight: "800",
    color: Colors.darkRed,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radii.round,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.darkRed,
  },
  langText: {
    fontSize: FontSizes.body,
    fontWeight: "800",
    color: Colors.text,
  },
  gearEmoji: {
    fontSize: 18,
    opacity: 0.6,
  },
});
