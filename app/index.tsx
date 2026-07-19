import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { fruitsUnit } from "@/content/content-model";
import { useDirection } from "@/lib/direction";
import { useProgress } from "@/lib/progress";

export default function HomeScreen() {
  const router = useRouter();
  const { direction } = useDirection();
  const { martenitsi, isLessonComplete } = useProgress();
  const host = CHARACTERS[fruitsUnit.host];
  const lesson = fruitsUnit.lessons[0];
  const lessonDone = isLessonComplete(lesson.id);

  const greeting =
    direction.known === "bg" ? "Здравей! Хайде да учим плодове!" : "Hello! Let's learn some fruits!";

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

      <View style={styles.content}>
        <Text style={styles.title}>{fruitsUnit.theme[direction.known]}</Text>

        <CharacterBubble character={host} text={greeting} />

        <Pressable
          onPress={() => router.push(`/lesson/${lesson.id}`)}
          accessibilityRole="button"
          accessibilityLabel={lesson.title[direction.known]}
          accessibilityState={{ selected: lessonDone }}
          style={({ pressed }) => [styles.unitTile, pressed && styles.pressed]}
        >
          {lessonDone && <Text style={styles.doneBadge}>🧿</Text>}
          <Text style={styles.unitEmoji}>🍎🍌🍇🍐</Text>
          <Text style={styles.unitLabel}>{lesson.title[direction.known]}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.xl,
    justifyContent: "center",
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
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
