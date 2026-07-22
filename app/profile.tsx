import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/BottomNav";
import { Martenitsa } from "@/components/Martenitsa";
import { ScreenBackground } from "@/components/ScreenBackground";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { UNITS } from "@/content/content-model";
import { useDirection } from "@/lib/direction";
import { useProgress } from "@/lib/progress";

// Моят профил — the child's at-a-glance progress: martenitsi, stars, lessons
// done, and a parent-gated link to setup. No personal data is collected or
// stored beyond local progress (CLAUDE.md child-safety rules).
export default function ProfileScreen() {
  const router = useRouter();
  const { direction } = useDirection();
  const { martenitsi, stars, completedLessons } = useProgress();
  const known = direction.known;

  const totalLessons = UNITS.reduce((n, u) => n + u.lessons.length, 0);

  return (
    <ScreenBackground scene="meadow">
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>{known === "bg" ? "Моят профил" : "My Profile"}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Martenitsa size={72} />
          <Text style={styles.name}>{known === "bg" ? "Малък юнак" : "Little hero"}</Text>
        </View>

        <View style={styles.rows}>
          <Row icon="⭐" label={known === "bg" ? "Звезди" : "Stars"} value={stars} />
          <Row
            icon="🧿"
            label={known === "bg" ? "Мартеници" : "Martenitsi"}
            value={martenitsi}
            martenitsa
          />
          <Row
            icon="📘"
            label={known === "bg" ? "Завършени уроци" : "Lessons done"}
            value={`${completedLessons.size} / ${totalLessons}`}
          />
        </View>

        <Pressable
          onPress={() => router.push("/parent-setup")}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Родителски контрол" : "Parent settings"}
          style={({ pressed }) => [styles.parentButton, pressed && styles.pressed]}
        >
          <Text style={styles.parentIcon}>⚙️</Text>
          <Text style={styles.parentText}>
            {known === "bg" ? "Родителски контрол" : "Parent settings"}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
    </ScreenBackground>
  );
}

function Row({
  icon,
  label,
  value,
  martenitsa,
}: {
  icon: string;
  label: string;
  value: number | string;
  martenitsa?: boolean;
}) {
  return (
    <View style={styles.row}>
      {martenitsa ? <Martenitsa size={28} /> : <Text style={styles.rowIcon}>{icon}</Text>}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
    paddingTop: Spacing.md,
  },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  card: {
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.tintGreen,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.xl,
  },
  name: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  rows: { gap: Spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.darkRed,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: { fontSize: 28 },
  rowLabel: { flex: 1, fontSize: FontSizes.label, fontWeight: "700", color: Colors.text },
  rowValue: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.darkRed },
  parentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    minHeight: TouchTarget.min,
    backgroundColor: Colors.gold,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
  },
  parentIcon: { fontSize: 24 },
  parentText: { fontSize: FontSizes.label, fontWeight: "700", color: Colors.text },
  pressed: { transform: [{ scale: 0.98 }] },
});
