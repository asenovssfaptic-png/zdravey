import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { MatchPairs } from "@/components/exercises/MatchPairs";
import { PickPicture } from "@/components/exercises/PickPicture";
import { SayIt } from "@/components/exercises/SayIt";
import type { ExerciseProps } from "@/components/exercises/types";
import { ProgressBar } from "@/components/ProgressBar";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { ExerciseType } from "@/content/content-model";
import { UNITS } from "@/content/content-model";
import { useDirection } from "@/lib/direction";

// Exercise type -> component. Adding a new exercise type is one line here plus
// its component; the lesson engine below doesn't change.
const EXERCISE_COMPONENTS: Partial<Record<ExerciseType, (props: ExerciseProps) => React.JSX.Element>> = {
  pick_picture: PickPicture,
  match_pairs: MatchPairs,
  say_it: SayIt,
};

function findLesson(lessonId: string) {
  for (const unit of UNITS) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return { unit, lesson };
  }
  return null;
}

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { direction } = useDirection();

  const found = findLesson(lessonId);

  // Only exercises we have a component for. Guards against half-authored
  // content referencing a type that isn't built yet.
  const exercises = useMemo(
    () => found?.lesson.exercises.filter((e) => EXERCISE_COMPONENTS[e.type]) ?? [],
    [found],
  );

  const [index, setIndex] = useState(0);

  if (!found) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Lesson not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const exercise = exercises[index];

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.celebrationEmoji}>🧿🎉</Text>
          <Text style={styles.title}>
            {direction.known === "bg"
              ? "Браво! Получи мартеница!"
              : "Well done! You earned a martenitsa!"}
          </Text>
          <Pressable
            onPress={() => router.replace("/")}
            style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.homeButtonText}>{direction.known === "bg" ? "Начало" : "Home"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const host = CHARACTERS[found.unit.host];
  const Component = EXERCISE_COMPONENTS[exercise.type]!;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ProgressBar total={exercises.length} completed={index} />
        <Component
          // Remount per step so exercise-local state resets cleanly.
          key={`${index}-${exercise.prompt}`}
          exercise={exercise}
          host={host}
          onDone={() => setIndex((i) => i + 1)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.darkRed,
    textAlign: "center",
  },
  celebrationEmoji: {
    fontSize: FontSizes.huge,
  },
  homeButton: {
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  homeButtonText: {
    fontSize: FontSizes.label,
    fontWeight: "700",
    color: Colors.white,
  },
});
