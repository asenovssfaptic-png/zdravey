import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { AdventurePath } from "@/components/AdventurePath";
import { BottomNav } from "@/components/BottomNav";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Martenitsa } from "@/components/Martenitsa";
import { ParentGate } from "@/components/ParentGate";
import { ScreenBackground } from "@/components/ScreenBackground";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { LangCode } from "@/content/content-model";
import { useDirection } from "@/lib/direction";
import { useProgress } from "@/lib/progress";

const FLAG: Record<LangCode, string> = { bg: "🇧🇬", en: "🇬🇧" };

export default function HomeScreen() {
  const router = useRouter();
  const { direction } = useDirection();
  const { martenitsi, isLessonComplete } = useProgress();
  const babaMarta = CHARACTERS.baba_marta;
  const [gateOpen, setGateOpen] = useState(false);

  const greeting =
    direction.known === "bg" ? "Здравей! Хайде на приключение!" : "Hello! Let's go on an adventure!";

  return (
    <ScreenBackground scene="village">
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

          <Pressable
            onPress={() => setGateOpen(true)}
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

          <AdventurePath
            known={direction.known}
            isDone={isLessonComplete}
            onOpen={(id) => router.push(`/lesson/${id}`)}
            onAlphabet={() => router.push("/alphabet")}
          />
        </ScrollView>

        <BottomNav />
      </SafeAreaView>

      {gateOpen && (
        <ParentGate
          onPass={() => {
            setGateOpen(false);
            router.push("/parent-setup");
          }}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  pressed: { transform: [{ scale: 0.98 }] },
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
  martenitsaNumber: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.darkRed },
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
  langText: { fontSize: FontSizes.body, fontWeight: "800", color: Colors.text },
  gearEmoji: { fontSize: 18, opacity: 0.6 },
});
