import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Radii, Spacing, TouchTarget } from "@/constants/theme";
import type { LangCode } from "@/content/content-model";
import { useDirection } from "@/lib/direction";

interface Tab {
  path: "/" | "/awards" | "/profile";
  icon: string;
  label: Record<LangCode, string>;
}

const TABS: Tab[] = [
  { path: "/", icon: "🏠", label: { bg: "Начало", en: "Home" } },
  { path: "/awards", icon: "⭐", label: { bg: "Награди", en: "Awards" } },
  { path: "/profile", icon: "👤", label: { bg: "Профил", en: "Profile" } },
];

// Bottom navigation across the top-level hub screens. Lesson/alphabet/game
// screens are full-screen and deliberately don't show it.
export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { direction } = useDirection();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const active = pathname === tab.path;
        return (
          <Pressable
            key={tab.path}
            onPress={() => {
              if (!active) router.replace(tab.path);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label[direction.known]}
            style={styles.tab}
          >
            <Text style={[styles.icon, active && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label[direction.known]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: Colors.darkRed,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xs,
  },
  tab: {
    minHeight: TouchTarget.min * 0.7,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.md,
    paddingVertical: Spacing.xs,
    gap: 2,
  },
  icon: {
    fontSize: 26,
    opacity: 0.55,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.darkRed,
  },
});
