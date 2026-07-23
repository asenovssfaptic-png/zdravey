import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { BossIntro } from "@/components/BossIntro";
import { Celebration } from "@/components/Celebration";
import { FindOnMap } from "@/components/exercises/FindOnMap";
import { MatchPairs } from "@/components/exercises/MatchPairs";
import { OddOneOut } from "@/components/exercises/OddOneOut";
import { PickPicture } from "@/components/exercises/PickPicture";
import { SayIt } from "@/components/exercises/SayIt";
import { SequenceOrder } from "@/components/exercises/SequenceOrder";
import { StoryPanel } from "@/components/exercises/StoryPanel";
import { TrueFalse } from "@/components/exercises/TrueFalse";
import type { ExerciseProps } from "@/components/exercises/types";
import { ProgressBar } from "@/components/ProgressBar";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import type { ExerciseType } from "@/content/content-model";
import { UNITS } from "@/content/content-model";
import { useDirection } from "@/lib/direction";
import { useProgress } from "@/lib/progress";

// Exercise type -> component. Adding a new exercise type is one line here plus
// its component; the lesson engine below doesn't change.
const EXERCISE_COMPONENTS: Partial<Record<ExerciseType, (props: ExerciseProps) => React.JSX.Element>> = {
  pick_picture: PickPicture,
  match_pairs: MatchPairs,
  say_it: SayIt,
  odd_one_out: OddOneOut,
  find_on_map: FindOnMap,
  story: StoryPanel,
  true_false: TrueFalse,
  sequence: SequenceOrder,
};

// Pre-render one static HTML page per lesson so deep-links/refreshes resolve
// to real HTML instead of a 404 or the bare [lessonId] template.
export function generateStaticParams(): { lessonId: string }[] {
  return UNITS.flatMap((unit) => unit.lessons.map((lesson) => ({ lessonId: lesson.id })));
}

// Stable no-op subscribe for useSyncExternalStore (client-detection only).
const emptySubscribe = () => () => {};

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
  const { completeLesson, martenitsi } = useProgress();

  const found = findLesson(lessonId);

  // Only exercises we have a component for. Guards against half-authored
  // content referencing a type that isn't built yet.
  const exercises = useMemo(
    () => found?.lesson.exercises.filter((e) => EXERCISE_COMPONENTS[e.type]) ?? [],
    [found],
  );

  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const finished = exercises.length > 0 && index >= exercises.length;

  // The lesson is a client-only interactive experience (audio playback,
  // recording, local progress); those hooks aren't safe to run during the
  // static export's server render. Render a bare shell until mounted so the
  // pre-rendered HTML and first client render agree (no hydration mismatch),
  // then mount the real, audio-driven content client-side only.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Award the martenitsa once, when the child reaches the end of the lesson.
  useEffect(() => {
    if (finished && found) completeLesson(found.lesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (!mounted) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  if (!found) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Lesson not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBoss = found.lesson.boss === true;

  // Krali Marko's challenge opens with a themed intro gate.
  if (isBoss && !started) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <BossIntro known={direction.known} onStart={() => setStarted(true)} />
      </SafeAreaView>
    );
  }

  const exercise = exercises[index];

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Celebration martenitsi={martenitsi} onHome={() => router.replace("/")} boss={isBoss} />
      </SafeAreaView>
    );
  }

  // Krali Marko hosts his own challenge; otherwise the unit's host.
  const host = CHARACTERS[isBoss ? "krali_marko" : found.unit.host];
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
});
