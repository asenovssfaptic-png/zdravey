import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Tile, type TileState } from "@/components/Tile";
import { Spacing } from "@/constants/theme";
import { buildOddOneOut } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { useShuffled } from "@/lib/shuffle";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

// "Which one doesn't belong?" — Hitar Petar's trick round. Tapping a tile
// plays its word; the odd one out is the correct answer. Positive-only: a
// wrong tap gently reveals the right one, no penalty. Hitar Petar hosts this
// regardless of the unit's usual host.
export function OddOneOut({ exercise, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const hitarPetar = CHARACTERS.hitar_petar;

  const built = useMemo(() => buildOddOneOut(exercise, direction), [exercise, direction]);
  const tiles = useShuffled(built.tiles);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resolved = selectedId !== null;

  const correctTile = built.tiles.find((t) => t.id === built.correctId)!;
  const correctPlayer = useClipPlayer(correctTile.audio);

  useEffect(() => {
    if (!resolved) return;
    // Speak the odd one out on reveal so the correction isn't silent.
    const say = setTimeout(correctPlayer.play, 350);
    const advance = setTimeout(onDone, REVEAL_DELAY_MS);
    return () => {
      clearTimeout(say);
      clearTimeout(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={hitarPetar}
        text={direction.known === "bg" ? "Кой е различен?" : "Which one doesn't belong?"}
      />

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
  tile: ReturnType<typeof buildOddOneOut>["tiles"][number];
  state: TileState;
  onPick: () => void;
}) {
  const { play } = useClipPlayer(tile.audio);
  return (
    <Tile
      emoji={tile.emoji}
      vocabId={tile.id}
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
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    alignContent: "center",
    justifyContent: "center",
  },
});
