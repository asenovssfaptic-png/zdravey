import { useRouter } from "expo-router";
import { useState, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Tile, type TileState } from "@/components/Tile";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { VOCAB } from "@/content/content-model";
import { useOnDemandPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { shuffled } from "@/lib/shuffle";

// Игра — "Нахрани Змея" (Feed the Zmey). The friendly dragon names a food and
// the child taps the matching picture to feed him. Endless, positive-only: a
// correct tap fills him up (a grow-only fed-count), a miss gently reveals and
// speaks the right one — no lives, no timer, no fail. Reinforces food/fruit
// vocab across many rounds outside the lesson flow.
const emptySubscribe = () => () => {};
const CHOICES = 4;

// Things a dragon would happily eat — fruits + food.
const POOL = Object.keys(VOCAB).filter((id) => id.startsWith("fruit.") || id.startsWith("food."));

export default function FeedGameScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <FeedContent />;
}

function makeRound(): { tiles: string[]; target: string } {
  const picked = shuffled(POOL).slice(0, CHOICES);
  const target = picked[Math.floor(Math.random() * picked.length)];
  return { tiles: shuffled(picked), target };
}

function FeedContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const known = direction.known;
  const learning = direction.learning;
  const zmey = CHARACTERS.zmey;
  const player = useOnDemandPlayer();

  const [fed, setFed] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  // Lazy initializer + event-driven advance keep Math.random out of render.
  const [{ tiles, target }, setRoundData] = useState(makeRound);
  const resolved = picked !== null;
  const gotIt = resolved && picked === target;

  const targetVocab = VOCAB[target];

  function speakTarget() {
    player.play(targetVocab.audio[learning]);
  }

  function tap(id: string) {
    if (resolved) return;
    player.play(VOCAB[id].audio[learning]);
    setPicked(id);
    const correct = id === target;
    // Speak the right word on reveal, then move to a fresh round.
    setTimeout(() => player.play(targetVocab.audio[learning]), 400);
    setTimeout(
      () => {
        if (correct) setFed((n) => n + 1);
        setPicked(null);
        setRoundData(makeRound());
      },
      correct ? 1000 : 1500,
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Назад" : "Back"}
          onPress={() => router.back()}
        >
          ←
        </Text>
        <Text style={styles.title}>{known === "bg" ? "Нахрани Змея" : "Feed the Zmey"}</Text>
        <View style={styles.fedPill} accessibilityLabel={known === "bg" ? `Нахранен: ${fed}` : `Fed: ${fed}`}>
          <Text style={styles.fedEmoji}>🍽️</Text>
          <Text style={styles.fedNum}>{fed}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <CharacterBubble
          character={zmey}
          text={
            gotIt
              ? known === "bg"
                ? "Ням-ням! Още!"
                : "Yum-yum! More!"
              : known === "bg"
                ? `Гладен съм! Дай ми «${targetVocab.labels[learning]}».`
                : `I'm hungry! Give me «${targetVocab.labels[learning]}».`
          }
        />

        <View style={styles.promptRow}>
          <AudioButton
            onPress={speakTarget}
            accessibilityLabel={known === "bg" ? "Чуй пак" : "Hear again"}
            size={88}
          />
        </View>

        <View style={styles.grid}>
          {tiles.map((id) => {
            const v = VOCAB[id];
            let state: TileState = "idle";
            if (resolved) {
              if (id === target) state = "correct";
              else if (id === picked) state = "gentle";
              else state = "disabled";
            }
            return (
              <Tile
                key={id}
                vocabId={id}
                emoji={v.emoji}
                main={v.labels[learning]}
                gloss={v.labels[known]}
                state={state}
                onPress={() => tap(id)}
              />
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  back: { width: 48, height: 48, fontSize: 32, color: Colors.darkRed, fontWeight: "800", textAlign: "center", lineHeight: 48 },
  title: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  fedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.tintGreen,
    borderRadius: Radii.round,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.correct,
    minWidth: 48,
    justifyContent: "center",
  },
  fedEmoji: { fontSize: 20 },
  fedNum: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.darkRed },
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },
  promptRow: { alignItems: "center" },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    alignContent: "center",
    justifyContent: "center",
  },
});
