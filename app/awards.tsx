import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { BottomNav } from "@/components/BottomNav";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Martenitsa } from "@/components/Martenitsa";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useDirection } from "@/lib/direction";
import { useProgress } from "@/lib/progress";

// Награди — the collection screen: every martenitsa earned, plus total stars.
// Baba Marta (who hands them out) hosts. Grow-only, celebratory.
export default function AwardsScreen() {
  const { direction } = useDirection();
  const { martenitsi, stars } = useProgress();
  const known = direction.known;
  const babaMarta = CHARACTERS.baba_marta;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>{known === "bg" ? "Награди" : "Awards"}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <CharacterBubble
          character={babaMarta}
          text={
            known === "bg"
              ? martenitsi > 0
                ? "Виж какви мартеници събра!"
                : "Завърши урок, за да получиш мартеница!"
              : martenitsi > 0
                ? "Look at all your martenitsi!"
                : "Finish a lesson to earn a martenitsa!"
          }
        />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Martenitsa size={40} />
            <Text style={styles.statNumber}>{martenitsi}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statStar}>⭐</Text>
            <Text style={styles.statNumber}>{stars}</Text>
          </View>
        </View>

        {martenitsi > 0 && (
          <View style={styles.collection}>
            {Array.from({ length: martenitsi }).map((_, i) => (
              <View key={i} style={styles.collectItem}>
                <Martenitsa size={48} />
              </View>
            ))}
          </View>
        )}
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
  content: { padding: Spacing.lg, gap: Spacing.xl },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xxl,
  },
  stat: { alignItems: "center", gap: Spacing.xs },
  statStar: { fontSize: 40 },
  statNumber: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  collection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    backgroundColor: Colors.tintGreen,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  collectItem: { padding: Spacing.xs },
});
