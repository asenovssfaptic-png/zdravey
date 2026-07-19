import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Martenitsa } from "@/components/Martenitsa";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { PRAISE } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";

// The reward moment. Baba Marta (who hands out martenitsi) appears and SPEAKS
// praise so the screen isn't text-only — a pre-reader hears "Браво!" and can
// tap the big martenitsa to hear it again. The martenitsa springs in for a
// little delight, and the exit is a big house icon, not just a word.
export function Celebration({ martenitsi, onHome }: { martenitsi: number; onHome: () => void }) {
  const { direction } = useDirection();
  const known = direction.known;
  const babaMarta = CHARACTERS.baba_marta;
  const praise = useClipPlayer(PRAISE[known].audio);
  const [scale] = useState(() => new Animated.Value(0));

  useEffect(() => {
    praise.play();
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 70, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.centered}>
      <CharacterBubble
        character={babaMarta}
        text={known === "bg" ? "Браво! Ето ти мартеница!" : "Well done! Here's a martenitsa!"}
      />

      <Pressable
        onPress={praise.play}
        accessibilityRole="button"
        accessibilityLabel={known === "bg" ? "Мартеница" : "Martenitsa"}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Martenitsa size={130} />
        </Animated.View>
      </Pressable>

      <View style={styles.countRow}>
        {Array.from({ length: Math.min(martenitsi, 6) }).map((_, i) => (
          <Martenitsa key={i} size={30} />
        ))}
      </View>
      <Text style={styles.count}>
        {known === "bg" ? `Мартеници: ${martenitsi}` : `Martenitsi: ${martenitsi}`}
      </Text>

      <Pressable
        onPress={onHome}
        accessibilityRole="button"
        accessibilityLabel={known === "bg" ? "Начало" : "Home"}
        style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
      >
        <Text style={styles.homeIcon}>🏠</Text>
        <Text style={styles.homeText}>{known === "bg" ? "Начало" : "Home"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  countRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  count: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.text,
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  homeIcon: {
    fontSize: 32,
  },
  homeText: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.white,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
});
