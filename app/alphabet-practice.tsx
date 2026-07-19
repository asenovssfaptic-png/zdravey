import { useRouter } from "expo-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { ProgressBar } from "@/components/ProgressBar";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import type { Letter, LangCode } from "@/content/content-model";
import { ALPHABET, PRAISE, SCRIPT_FOR_LEARNING } from "@/content/content-model";
import { useClipPlayer, useOnDemandPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { shuffled } from "@/lib/shuffle";

const ROUNDS = 5;
const REVEAL_MS = 1400;
const emptySubscribe = () => () => {};

// letter_sound — the fifth exercise type. Hear a letter, tap the matching one.
// Self-generating from the current script's alphabet (Latin or Cyrillic), so
// it stays the one direction-specific activity. Audio-driven and client-only
// (mount-gated) so the audio hooks never run during the static export.
export default function AlphabetPracticeScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <PracticeContent />;
}

interface RoundData {
  target: Letter;
  options: Letter[];
}

function makeRounds(letters: Letter[]): RoundData[] {
  const rounds: RoundData[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    const target = letters[Math.floor(Math.random() * letters.length)];
    const distractors = shuffled(letters.filter((l) => l.char !== target.char)).slice(0, 3);
    rounds.push({ target, options: shuffled([target, ...distractors]) });
  }
  return rounds;
}

function PracticeContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const script = SCRIPT_FOR_LEARNING[direction.learning];
  const [rounds] = useState(() => makeRounds(ALPHABET[script]));
  const [index, setIndex] = useState(0);

  if (index >= ROUNDS) {
    return <PracticeDone known={direction.known} onDone={() => router.back()} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ProgressBar total={ROUNDS} completed={index} />
        <Round
          key={index}
          round={rounds[index]}
          known={direction.known}
          onDone={() => setIndex((i) => i + 1)}
        />
      </View>
    </SafeAreaView>
  );
}

function Round({ round, known, onDone }: { round: RoundData; known: LangCode; onDone: () => void }) {
  const kuker = CHARACTERS.kuker;
  const prompt = useClipPlayer(round.target.audio);
  const tilePlayer = useOnDemandPlayer();
  const [picked, setPicked] = useState<string | null>(null);
  const resolved = picked !== null;

  useEffect(() => {
    prompt.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!resolved) return;
    const say = setTimeout(prompt.play, 350); // speak the correct letter on reveal
    const advance = setTimeout(onDone, REVEAL_MS);
    return () => {
      clearTimeout(say);
      clearTimeout(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  return (
    <View style={styles.round}>
      <CharacterBubble
        character={kuker}
        text={known === "bg" ? "Коя буква чуваш?" : "Which letter do you hear?"}
      />

      <View style={styles.promptRow}>
        <AudioButton
          onPress={prompt.play}
          isPlaying={prompt.isPlaying}
          accessibilityLabel={known === "bg" ? "Чуй буквата" : "Hear the letter"}
          size={100}
        />
      </View>

      <View style={styles.grid}>
        {round.options.map((letter) => {
          const isCorrect = letter.char === round.target.char;
          let state: "idle" | "correct" | "gentle" | "disabled" = "idle";
          if (resolved) state = isCorrect ? "correct" : letter.char === picked ? "gentle" : "disabled";
          return (
            <Pressable
              key={letter.audio.src}
              onPress={() => {
                if (resolved) return;
                tilePlayer.play(letter.audio);
                setPicked(letter.char);
              }}
              accessibilityRole="button"
              accessibilityLabel={letter.char}
              style={({ pressed }) => [
                styles.tile,
                state === "correct" && styles.tileCorrect,
                state === "gentle" && styles.tileGentle,
                state === "disabled" && styles.tileDisabled,
                pressed && state === "idle" && styles.tilePressed,
              ]}
            >
              <Text style={styles.tileLetter}>{letter.char}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PracticeDone({ known, onDone }: { known: LangCode; onDone: () => void }) {
  const babaMarta = CHARACTERS.baba_marta;
  const praise = useClipPlayer(PRAISE[known].audio);
  useEffect(() => {
    praise.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.doneWrap}>
        <CharacterBubble character={babaMarta} text={known === "bg" ? "Браво!" : "Well done!"} />
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Назад" : "Back"}
          style={({ pressed }) => [styles.backButton, pressed && styles.tilePressed]}
        >
          <Text style={styles.backIcon}>🔤</Text>
          <Text style={styles.backText}>{known === "bg" ? "Азбука" : "Alphabet"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },
  round: { flex: 1, gap: Spacing.lg },
  promptRow: { alignItems: "center", justifyContent: "center" },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    alignContent: "center",
    justifyContent: "center",
  },
  tile: {
    width: 150,
    height: 150,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.darkRed,
    alignItems: "center",
    justifyContent: "center",
  },
  tileCorrect: { borderColor: Colors.correct, backgroundColor: Colors.tintGreen },
  tileGentle: { borderColor: Colors.textMuted },
  tileDisabled: { opacity: 0.4 },
  tilePressed: { transform: [{ scale: 0.96 }] },
  tileLetter: { fontSize: FontSizes.huge, fontWeight: "800", color: Colors.darkRed },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.xl, padding: Spacing.lg },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: TouchTarget.min,
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backIcon: { fontSize: 32 },
  backText: { fontSize: FontSizes.label, fontWeight: "700", color: Colors.white },
});
