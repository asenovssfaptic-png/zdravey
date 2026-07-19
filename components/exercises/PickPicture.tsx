import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Tile, type TileState } from "@/components/Tile";
import { Colors, Radii, Spacing } from "@/constants/theme";
import { buildPickPicture } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { useShuffled } from "@/lib/shuffle";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

// Hear a word, tap the matching picture. The workhorse exercise.
export function PickPicture({ exercise, host, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const kumaLisa = CHARACTERS.kuma_lisa;

  const built = useMemo(() => buildPickPicture(exercise, direction), [exercise, direction]);
  const tiles = useShuffled(built.tiles);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const resolved = selectedId !== null;

  const promptPlayer = useClipPlayer(built.promptAudio);

  useEffect(() => {
    promptPlayer.play();
    // Replay whenever the prompt or direction changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.prompt, direction.learning]);

  useEffect(() => {
    if (!resolved) return;
    const timer = setTimeout(onDone, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  return (
    <View style={styles.container}>
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
  container: {
    flex: 1,
    gap: Spacing.lg,
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
