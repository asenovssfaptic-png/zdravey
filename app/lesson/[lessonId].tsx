import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { ProgressBar } from "@/components/ProgressBar";
import { Tile, type TileState } from "@/components/Tile";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { buildPickPicture, UNITS } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";

const REVEAL_DELAY_MS = 1400;

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  const exercises = useMemo(
    () => found?.lesson.exercises.filter((e) => e.type === "pick_picture") ?? [],
    [found],
  );

  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const exercise = exercises[index];
  const built = useMemo(
    () => (exercise ? buildPickPicture(exercise, direction) : null),
    [exercise, direction],
  );
  const tiles = useMemo(() => (built ? shuffled(built.tiles) : []), [built]);

  const resolved = selectedId !== null;
  const promptPlayer = useClipPlayer(built?.promptAudio ?? { src: "", voiceId: "default" });

  useEffect(() => {
    if (built) promptPlayer.play();
    // Re-play whenever a new exercise (or a direction flip) changes the prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.prompt, direction.learning]);

  useEffect(() => {
    if (!resolved) return;
    const timer = setTimeout(() => {
      setSelectedId(null);
      setShowHint(false);
      setIndex((i) => i + 1);
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [resolved]);

  if (!found) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Lesson not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const host = CHARACTERS[found.unit.host];
  const kumaLisa = CHARACTERS.kuma_lisa;

  if (!exercise || !built) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.celebrationEmoji}>🧿🎉</Text>
          <Text style={styles.title}>
            {direction.known === "bg" ? "Браво! Получи мартеница!" : "Well done! You earned a martenitsa!"}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ProgressBar total={exercises.length} completed={index} />

        <CharacterBubble
          character={host}
          text={
            direction.known === "bg"
              ? `Коя картинка е «${built.questionWord}»?`
              : `Which picture is «${built.questionWord}»?`
          }
        />

        <View style={styles.promptRow}>
          <AudioButton
            onPress={promptPlayer.play}
            isPlaying={promptPlayer.isPlaying}
            accessibilityLabel={built.questionWord}
            size={100}
          />
          {exercise.hint && (
            <Pressable
              onPress={() => setShowHint(true)}
              accessibilityRole="button"
              accessibilityLabel={kumaLisa.name[direction.known]}
              style={styles.hintButton}
            >
              <Text style={styles.hintEmoji}>{kumaLisa.emoji}</Text>
            </Pressable>
          )}
        </View>

        {showHint && exercise.hint && (
          <CharacterBubble character={kumaLisa} text={exercise.hint[direction.known]} />
        )}

        <View style={styles.grid}>
          {tiles.map((tile) => {
            let state: TileState = "idle";
            if (resolved) {
              if (tile.id === built.correctId) state = "correct";
              else if (tile.id === selectedId) state = "gentle";
              else state = "disabled";
            }
            return (
              <TileWithAudio
                key={tile.id}
                tile={tile}
                state={state}
                onPick={() => !resolved && setSelectedId(tile.id)}
              />
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TileWithAudio({
  tile,
  state,
  onPick,
}: {
  tile: ReturnType<typeof buildPickPicture>["tiles"][number];
  state: TileState;
  onPick: () => void;
}) {
  const { play } = useClipPlayer(tile.audio);

  return (
    <Tile
      emoji={tile.emoji}
      main={tile.main}
      gloss={tile.gloss}
      state={state}
      onPress={() => {
        play();
        onPick();
      }}
    />
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
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  hintButton: {
    width: 72,
    height: 72,
    borderRadius: Radii.round,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  hintEmoji: {
    fontSize: 36,
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    alignContent: "center",
    justifyContent: "center",
  },
});
