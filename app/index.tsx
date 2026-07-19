import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { fruitsUnit } from "@/content/content-model";
import { useDirection } from "@/lib/direction";

export default function HomeScreen() {
  const router = useRouter();
  const { direction } = useDirection();
  const host = CHARACTERS[fruitsUnit.host];
  const lesson = fruitsUnit.lessons[0];

  const greeting =
    direction.known === "bg" ? "Здравей! Хайде да учим плодове!" : "Hello! Let's learn some fruits!";

  return (
    <SafeAreaView style={styles.safeArea}>
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
          style={({ pressed }) => [styles.unitTile, pressed && styles.pressed]}
        >
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
});
