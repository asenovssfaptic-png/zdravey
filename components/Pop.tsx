import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { ViewStyle } from "react-native";
import { Animated, Easing } from "react-native";

// Pop — a reusable "juice" wrapper. When `pop` flips false→true it gives its
// children a gentle scale bounce (expand slightly, then settle), the classic
// small-win feedback. Uses the core Animated API (no worklets) so it is safe in
// the static web export. useNativeDriver is off so web animates without warning.
export function Pop({
  pop,
  children,
  style,
  scaleTo = 1.14,
}: {
  pop: boolean;
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleTo?: number;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const prev = useRef(pop);

  useEffect(() => {
    if (pop && !prev.current) {
      scale.stopAnimation();
      Animated.sequence([
        Animated.timing(scale, {
          toValue: scaleTo,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 140,
          useNativeDriver: false,
        }),
      ]).start();
    }
    prev.current = pop;
  }, [pop, scale, scaleTo]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}
