/* Confetti — 12 gently falling pieces (core Animated, no worklets).
 * Reduced motion → renders nothing. Bump `trigger` to fire a burst; the
 * pieces animate to opacity 0 and stay inert (pointerEvents none). */

import React, { useEffect, useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors } from "../../constants/theme";
import { useReducedMotion } from "../../lib/announce";
import { seededRng } from "../../lib/rng";

export interface ConfettiProps {
  /** Increment to fire a burst (0/undefined = idle). */
  trigger: number;
}

const PIECE_COLORS = [colors.accent, colors.gold, colors.success];
const N = 12;

interface Burst {
  pieces: { left: number; delay: number; color: string }[];
  anims: Animated.Value[];
}

export function Confetti({ trigger }: ConfettiProps): React.ReactElement | null {
  const reduced = useReducedMotion();

  const burst = useMemo<Burst | null>(() => {
    if (!trigger) return null;
    // deterministic per burst (seeded by trigger) — pure during render
    const rng = seededRng(trigger * 7919 + 17);
    return {
      pieces: Array.from({ length: N }, (_, i) => ({
        left: 5 + rng() * 90,
        delay: rng() * 250,
        color: PIECE_COLORS[i % 3],
      })),
      anims: Array.from({ length: N }, () => new Animated.Value(0)),
    };
  }, [trigger]);

  useEffect(() => {
    if (!burst || reduced) return;
    Animated.parallel(
      burst.anims.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 1400,
          delay: burst.pieces[i].delay,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [burst, reduced]);

  if (!burst || reduced) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {burst.pieces.map((p, i) => (
        <Animated.View
          key={`${trigger}-${i}`}
          style={[
            styles.piece,
            {
              left: `${p.left}%`,
              backgroundColor: p.color,
              opacity: burst.anims[i].interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateY: burst.anims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 320],
                  }),
                },
                {
                  rotate: burst.anims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${i % 2 ? 300 : -300}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
    width: 10,
    height: 14,
    borderRadius: 2,
  },
});

export default Confetti;
