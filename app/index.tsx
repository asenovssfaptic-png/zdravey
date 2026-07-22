import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { BottomNav } from "@/components/BottomNav";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Martenitsa } from "@/components/Martenitsa";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import type { LangCode, Lesson, Unit } from "@/content/content-model";
import { UNITS, VOCAB } from "@/content/content-model";
import { useDirection } from "@/lib/direction";
import { useProgress } from "@/lib/progress";

const FLAG: Record<LangCode, string> = { bg: "🇧🇬", en: "🇬🇧" };

// A few representative emoji for a lesson tile, pulled from the vocab it uses.
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
    if (emojis.length === 4) break;
  }
  return emojis.join("");
}

export default function HomeScreen() {
  const router = useRouter();
  const { direction } = useDirection();
  const { martenitsi } = useProgress();
  const babaMarta = CHARACTERS.baba_marta;

  const greeting = direction.known === "bg" ? "Здравей! Хайде да учим!" : "Hello! Let's learn!";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <View
          style={styles.martenitsaPill}
          accessibilityRole="text"
          accessibilityLabel={
            direction.known === "bg" ? `Мартеници: ${martenitsi}` : `Martenitsi: ${martenitsi}`
          }
        >
          <Martenitsa size={26} />
          <Text style={styles.martenitsaNumber}>{martenitsi}</Text>
        </View>

        {/* Visible, tappable language switch (opens parent setup). */}
        <Pressable
          onPress={() => router.push("/parent-setup")}
          accessibilityRole="button"
          accessibilityLabel={direction.known === "bg" ? "Смени езика" : "Change language"}
          style={({ pressed }) => [styles.langPill, pressed && styles.pressed]}
        >
          <Text style={styles.langText}>
            {FLAG[direction.known]} → {FLAG[direction.learning]}
          </Text>
          <Text style={styles.gearEmoji}>⚙️</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <CharacterBubble character={babaMarta} text={greeting} />

        {UNITS.map((unit) => (
          <UnitSection
            key={unit.id}
            unit={unit}
            knownLang={direction.known}
            onOpen={(id) => router.push(`/lesson/${id}`)}
          />
        ))}

        <Text style={styles.sectionTitle}>{direction.known === "bg" ? "Азбука" : "Alphabet"}</Text>
        <Pressable
          onPress={() => router.push("/alphabet")}
          accessibilityRole="button"
          accessibilityLabel={direction.known === "bg" ? "Азбука" : "Alphabet"}
          style={({ pressed }) => [styles.tile, styles.alphabetTile, pressed && styles.pressed]}
        >
          <Text style={[styles.tileEmoji, styles.alphabetGlyphs]}>
            {direction.learning === "bg" ? "Абв" : "Abc"}
          </Text>
          <Text style={[styles.tileLabel, styles.alphabetLabel]}>
            {direction.known === "bg" ? "Докосни, за да чуеш буквите" : "Tap to hear the letters"}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

function UnitSection({
  unit,
  knownLang,
  onOpen,
}: {
  unit: Unit;
  knownLang: LangCode;
  onOpen: (lessonId: string) => void;
}) {
  const { isLessonComplete } = useProgress();
  const host = CHARACTERS[unit.host];
  return (
    <View style={styles.unitSection}>
      <Text style={styles.sectionTitle}>
        {host.emoji} {unit.theme[knownLang]}
      </Text>
      {unit.lessons.map((lesson) => {
        const done = isLessonComplete(lesson.id);
        const boss = lesson.boss === true;
        return (
          <Pressable
            key={lesson.id}
            onPress={() => onOpen(lesson.id)}
            accessibilityRole="button"
            accessibilityLabel={lesson.title[knownLang]}
            accessibilityState={{ selected: done }}
            style={({ pressed }) => [
              styles.tile,
              boss && styles.tileBoss,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.tileEmoji}>{boss ? "🗡️" : lessonEmojis(lesson)}</Text>
            <Text style={styles.tileLabel} numberOfLines={2}>
              {lesson.title[knownLang]}
            </Text>
            {done && <Martenitsa size={26} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
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
  sectionTitle: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    marginTop: Spacing.md,
  },
  unitSection: {
    gap: Spacing.sm,
  },
  // Compact horizontal lesson tile — many fit per screen so the whole path
  // (and that there's more below) is obvious at a glance.
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: TouchTarget.min,
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  tileBoss: {
    backgroundColor: Colors.darkRed,
  },
  tileEmoji: {
    fontSize: 30,
    minWidth: 132,
  },
  tileLabel: {
    flex: 1,
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.white,
  },
  alphabetTile: {
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.red,
  },
  alphabetGlyphs: {
    fontWeight: "800",
    color: Colors.red,
    minWidth: 84,
  },
  alphabetLabel: {
    color: Colors.darkRed,
  },
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
