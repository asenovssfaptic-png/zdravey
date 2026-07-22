import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { BottomNav } from "@/components/BottomNav";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { useDirection } from "@/lib/direction";

// Игри — a small hub of supplementary games (never a replacement for the vocab
// loop). Memory is playable; puzzle and music are on the roadmap.
export default function GamesScreen() {
  const router = useRouter();
  const { direction } = useDirection();
  const known = direction.known;
  const hitar = CHARACTERS.hitar_petar;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>{known === "bg" ? "Игри" : "Games"}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <CharacterBubble
          character={hitar}
          text={known === "bg" ? "Хайде да поиграем!" : "Let's play!"}
        />

        <Pressable
          onPress={() => router.push("/game/memory")}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Памет — открий двойките" : "Memory — find the pairs"}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <Text style={styles.tileEmoji}>🃏</Text>
          <View style={styles.tileText}>
            <Text style={styles.tileLabel}>{known === "bg" ? "Памет" : "Memory"}</Text>
            <Text style={styles.tileSub}>
              {known === "bg" ? "Открий двойките" : "Find the pairs"}
            </Text>
          </View>
        </Pressable>

        <View style={[styles.tile, styles.soon]} accessibilityLabel={known === "bg" ? "Скоро" : "Coming soon"}>
          <Text style={styles.tileEmoji}>🧩</Text>
          <View style={styles.tileText}>
            <Text style={styles.tileLabel}>{known === "bg" ? "Пъзел" : "Puzzle"}</Text>
            <Text style={styles.tileSub}>{known === "bg" ? "Скоро" : "Coming soon"}</Text>
          </View>
        </View>

        <View style={[styles.tile, styles.soon]} accessibilityLabel={known === "bg" ? "Скоро" : "Coming soon"}>
          <Text style={styles.tileEmoji}>🎵</Text>
          <View style={styles.tileText}>
            <Text style={styles.tileLabel}>{known === "bg" ? "Музика" : "Music"}</Text>
            <Text style={styles.tileSub}>{known === "bg" ? "Скоро" : "Coming soon"}</Text>
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
    paddingTop: Spacing.md,
  },
  content: { padding: Spacing.lg, gap: Spacing.md },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    minHeight: TouchTarget.min,
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  soon: { backgroundColor: Colors.textMuted, opacity: 0.6 },
  tileEmoji: { fontSize: 40, minWidth: 56 },
  tileText: { flex: 1 },
  tileLabel: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.white },
  tileSub: { fontSize: FontSizes.body, color: Colors.white, opacity: 0.9 },
  pressed: { transform: [{ scale: 0.98 }] },
});
