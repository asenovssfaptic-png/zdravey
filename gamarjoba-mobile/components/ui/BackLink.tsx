import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import { colors, minTarget, spacing, type } from "../../constants/theme";

export interface BackLinkProps {
  label: string;
  href: string;
}

/** "← All units" style back navigation at the top of every screen. */
export function BackLink({ label, href }: BackLinkProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"Back to " + label}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(href as never);
      }}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.arrow} accessibilityElementsHidden>
        ←
      </Text>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: minTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  arrow: {
    fontSize: type.body + 2,
    color: colors.accentDeep,
  },
  text: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.accentDeep,
  },
});

export default BackLink;
