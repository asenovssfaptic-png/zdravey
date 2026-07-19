import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { Direction, LangCode } from "@/content/content-model";
import { useDirection } from "@/lib/direction";

interface DirectionOption {
  direction: Direction;
  label: Record<LangCode, string>;
}

const OPTIONS: DirectionOption[] = [
  {
    direction: { known: "bg", learning: "en" },
    label: { bg: "Българче учи английски", en: "Bulgarian-speaking child learning English" },
  },
  {
    direction: { known: "en", learning: "bg" },
    label: { en: "English-speaking child learning Bulgarian", bg: "Дете учи български език" },
  },
];

// Reached only via a long-press on the home screen's gear icon — that hold
// gesture is the "parent gate" so a young child can't flip this by accident.
export default function ParentSetupScreen() {
  const router = useRouter();
  const { direction, setDirection } = useDirection();
  const babaMarta = CHARACTERS.baba_marta;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Parent Setup</Text>

        <CharacterBubble character={babaMarta} text="Choose which language your child is learning." />

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const active =
              direction.known === opt.direction.known && direction.learning === opt.direction.learning;
            return (
              <Pressable
                key={opt.direction.known}
                onPress={() => setDirection(opt.direction)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.option,
                  active && styles.optionActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label.en}</Text>
                <Text style={[styles.optionSubtext, active && styles.optionTextActive]}>{opt.label.bg}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
        >
          <Text style={styles.doneButtonText}>Done</Text>
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
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
  },
  options: {
    gap: Spacing.md,
  },
  option: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  optionActive: {
    backgroundColor: Colors.red,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  optionText: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.text,
  },
  optionSubtext: {
    fontSize: FontSizes.body,
    color: Colors.textMuted,
  },
  optionTextActive: {
    color: Colors.white,
  },
  doneButton: {
    backgroundColor: Colors.gold,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.text,
  },
});
