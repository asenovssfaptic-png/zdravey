/* StubScreen — temporary scaffold body for feature screens still being
 * built. Shows the screen's real title so navigation is demoable end to
 * end. Feature agents replace the CONTENT of their route files; this
 * component stays for any screen not yet built. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "../../constants/theme";
import BackLink from "./BackLink";
import Screen from "./Screen";

export interface StubScreenProps {
  title: string;
  backLabel?: string;
  backHref?: string;
  sub?: string;
  children?: React.ReactNode;
}

export function StubScreen({
  title,
  backLabel,
  backHref,
  sub,
  children,
}: StubScreenProps): React.ReactElement {
  return (
    <Screen>
      {backLabel && backHref ? <BackLink label={backLabel} href={backHref} /> : null}
      <Text style={styles.h1} accessibilityRole="header">
        {title}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      <View style={styles.note}>
        <Text style={styles.noteText}>🚧 This screen is being built.</Text>
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
  sub: {
    fontSize: type.body,
    color: colors.inkSoft,
  },
  note: {
    backgroundColor: colors.warnSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
  },
});

export default StubScreen;
