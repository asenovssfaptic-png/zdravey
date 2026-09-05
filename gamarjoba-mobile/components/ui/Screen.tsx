/* Screen — SafeArea + TopBar + (optionally scrolling) content on the
 * warm paper background. Every route renders inside one. */

import React from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../../constants/theme";
import TopBar from "./TopBar";

export interface ScreenProps {
  children: React.ReactNode;
  /** Scrollable content (default). Sessions/tracing set false. */
  scroll?: boolean;
  /** Hide the persistent TopBar (sessions use their own exit/progress bar). */
  topBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  topBar = true,
  contentStyle,
}: ScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, { paddingBottom: insets.bottom + spacing.md }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.flex, styles.bg, { paddingTop: insets.top }]}>
      {topBar ? <TopBar /> : null}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
});

export default Screen;
