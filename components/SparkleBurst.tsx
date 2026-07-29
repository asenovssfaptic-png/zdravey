import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

// SparkleBurst — a little celebratory particle burst for win moments. When
// `trigger` changes (and is truthy) a handful of ✨/⭐/🎉 fly outward from the
// centre and fade. Absolutely positioned + non-interactive so it overlays the
// content without affecting layout or taps. Core Animated (SSR-safe); particles
// always exist in the tree (opacity 0 at rest) so no setState-in-effect.
const PARTICLES = ["✨", "⭐", "🌟", "✨", "🎉", "⭐"];

export function SparkleBurst({
  trigger,
  size = 220,
  distance = 90,
}: {
  trigger: number | string | boolean;
  size?: number;
  distance?: number;
}) {
  const [t] = useState(() => new Animated.Value(0));
  // null sentinel so a truthy initial trigger also bursts on mount.
  const prev = useRef<typeof trigger | null>(null);

  useEffect(() => {
    if (trigger !== prev.current && trigger) {
      t.stopAnimation();
      t.setValue(0);
      Animated.timing(t, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    prev.current = trigger;
  }, [trigger, t]);

  const opacity = t.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >

      {PARTICLES.map((emoji, i) => {
        const angle = (i / PARTICLES.length) * Math.PI * 2;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
        const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
        const scale = t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.1, 0.9] });
        return (
          <Animated.Text
            key={i}
            style={[styles.particle, { opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  particle: { position: "absolute", fontSize: 30 },
});
