import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { Lesson, Unit } from "@/content/content-model";
import { UNITS, VOCAB } from "@/content/content-model";
import { useDirection } from "@/lib/direction";
import { useProgress } from "@/lib/progress";

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

  const greeting =
    direction.known === "bg" ? "Здравей! Хайде да учим!" : "Hello! Let's learn!";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={styles.martenitsaPill}
        accessibilityRole="text"
        accessibilityLabel={
          direction.known === "bg" ? `Мартеници: ${martenitsi}` : `Martenitsi: ${martenitsi}`
        }
      >
        <Text style={styles.martenitsaIcon}>🧿</Text>
        <Text style={styles.martenitsaNumber}>{martenitsi}</Text>
      </View>

      <Pressable
        onLongPress={() => router.push("/parent-setup")}
        delayLongPress={1200}
        accessibilityRole="button"
        accessibilityLabel="Parent settings"
        style={({ pressed }) => [styles.gearButton, pressed && styles.pressed]}
      >
        <Text style={styles.gearEmoji}>⚙️</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <CharacterBubble character={babaMarta} text={greeting} />

        {UNITS.map((unit) => (
          <UnitSection key={unit.id} unit={unit} knownLang={direction.known} onOpen={(id) => router.push(`/lesson/${id}`)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function UnitSection({
  unit,
  knownLang,
  onOpen,
}: {
  unit: Unit;
  knownLang: "bg" | "en";
  onOpen: (lessonId: string) => void;
}) {
  const { isLessonComplete } = useProgress();
  return (
    <View style={styles.unitSection}>
      <Text style={styles.title}>{unit.theme[knownLang]}</Text>
      {unit.lessons.map((lesson) => {
        const done = isLessonComplete(lesson.id);
        return (
          <Pressable
            key={lesson.id}
            onPress={() => onOpen(lesson.id)}
            accessibilityRole="button"
            accessibilityLabel={lesson.title[knownLang]}
            accessibilityState={{ selected: done }}
            style={({ pressed }) => [styles.unitTile, pressed && styles.pressed]}
          >
            {done && <Text style={styles.doneBadge}>🧿</Text>}
            <Text style={styles.unitEmoji}>{lessonEmojis(lesson)}</Text>
            <Text style={styles.unitLabel}>{lesson.title[knownLang]}</Text>
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
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    paddingTop: 76, // clear the absolutely-positioned martenitsa pill / gear
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
  },
  unitSection: {
    gap: Spacing.md,
  },
  unitTile: {
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  unitEmoji: {
    fontSize: FontSizes.huge,
  },
  unitLabel: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.white,
  },
  gearButton: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
    width: 48,
    height: 48,
    borderRadius: Radii.round,
    alignItems: "center",
    justifyContent: "center",
  },
  gearEmoji: {
    fontSize: 24,
    opacity: 0.5,
  },
  martenitsaPill: {
    position: "absolute",
    top: Spacing.lg,
    left: Spacing.lg,
    zIndex: 1,
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
  martenitsaIcon: {
    fontSize: 22,
  },
  martenitsaNumber: {
    fontSize: FontSizes.label,
    fontWeight: "800",
    color: Colors.darkRed,
  },
  doneBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.md,
    fontSize: 28,
  },
});
