import type { ReactNode } from "react";
import { Image, ImageBackground, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";
import { background } from "@/lib/images";

// A children's-book page: a soft painted scene behind the content, dimmed by a
// cream scrim so text and tiles stay readable, topped with a shevitsa folk
// border. Falls back to a plain cream screen if the art isn't present.
export function ScreenBackground({
  scene = "village",
  children,
}: {
  scene?: string;
  children: ReactNode;
}) {
  const scer = background(scene);
  const border = background("shevitsa_border");

  if (!scer) {
    return <View style={styles.plain}>{children}</View>;
  }

  return (
    <ImageBackground source={scer} resizeMode="cover" style={styles.fill}>
      <View style={styles.scrim} pointerEvents="none" />
      {border && (
        <View style={styles.border} pointerEvents="none">
          <Image
            source={border}
            resizeMode="stretch"
            style={styles.borderImg}
            accessibilityIgnoresInvertColors
          />
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, paddingTop: 16 }, // clear the shevitsa border band
  plain: { flex: 1, backgroundColor: Colors.white },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: Colors.scrim },
  border: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    opacity: 0.9,
  },
  borderImg: { width: "100%", height: "100%" },
});
