import { useEffect, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { VOCAB } from "@/content/content-model";
import { useClipPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";
import { vocabImage } from "@/lib/images";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

// Hitar Petar's quick trick: he shows a picture and says a word — is he right?
// Tap ✓ (yes, they match) or ✗ (no, they don't). A different, faster gesture
// than the picture grid, so lessons don't feel like the same tap-a-tile loop.
// Positive-only: a wrong guess gently reveals and speaks the picture's real name.
export function TrueFalse({ exercise, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const known = direction.known;
  const learning = direction.learning;
  const hitar = CHARACTERS.hitar_petar;

  const picture = VOCAB[exercise.prompt];
  const claimed = VOCAB[exercise.claim ?? exercise.prompt];
  const isTrue = claimed.id === picture.id;

  const [answer, setAnswer] = useState<boolean | null>(null);
  const resolved = answer !== null;
  const gotItRight = resolved && answer === isTrue;

  // He speaks the CLAIMED word (what he says it is); on reveal, the picture's
  // REAL name so a pre-reader always hears the truth.
  const claimPlayer = useClipPlayer(claimed.audio[learning]);
  const truthPlayer = useClipPlayer(picture.audio[learning]);

  useEffect(() => {
    claimPlayer.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.prompt, exercise.claim, learning]);

  useEffect(() => {
    if (!resolved) return;
    const say = setTimeout(truthPlayer.play, 350);
    const advance = setTimeout(onDone, REVEAL_DELAY_MS);
    return () => {
      clearTimeout(say);
      clearTimeout(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  const img = vocabImage(picture.id);
  const claimWord = claimed.labels[learning];

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={hitar}
        text={known === "bg" ? `Това ли е «${claimWord}»?` : `Is this «${claimWord}»?`}
      />

      <View style={styles.pictureRow}>
        <View style={styles.picture}>
          {img ? (
            <Image source={img} style={styles.pictureImg} accessibilityIgnoresInvertColors accessibilityLabel={picture.labels[learning]} />
          ) : (
            <Text style={styles.pictureEmoji}>{picture.emoji ?? "❓"}</Text>
          )}
        </View>
        <AudioButton onPress={claimPlayer.play} isPlaying={claimPlayer.isPlaying} accessibilityLabel={claimWord} size={72} />
      </View>

      {resolved && (
        <Text style={[styles.verdict, gotItRight ? styles.verdictGood : styles.verdictGentle]}>
          {gotItRight
            ? known === "bg"
              ? "Браво!"
              : "Well done!"
            : known === "bg"
              ? `Това е «${picture.labels[learning]}».`
              : `This is «${picture.labels[learning]}».`}
        </Text>
      )}

      <View style={styles.buttons}>
        <ChoiceButton
          kind="no"
          label={known === "bg" ? "Не" : "No"}
          selected={answer === false}
          resolved={resolved}
          correct={!isTrue}
          onPress={() => !resolved && setAnswer(false)}
        />
        <ChoiceButton
          kind="yes"
          label={known === "bg" ? "Да" : "Yes"}
          selected={answer === true}
          resolved={resolved}
          correct={isTrue}
          onPress={() => !resolved && setAnswer(true)}
        />
      </View>
    </View>
  );
}

function ChoiceButton({
  kind,
  label,
  selected,
  resolved,
  correct,
  onPress,
}: {
  kind: "yes" | "no";
  label: string;
  selected: boolean;
  resolved: boolean;
  correct: boolean;
  onPress: () => void;
}) {
  // After answering, the correct button glows green; a wrong pick dims gently.
  let stateStyle: StyleProp<ViewStyle> = kind === "yes" ? styles.yes : styles.no;
  let onLight = false;
  if (resolved) {
    if (correct) stateStyle = styles.correct;
    else if (selected) {
      stateStyle = styles.gentle;
      onLight = true; // light background -> dark text for contrast
    } else stateStyle = styles.dim;
  }
  const textColor = onLight ? Colors.darkRed : Colors.white;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.button, stateStyle, pressed && !resolved && styles.pressed]}
    >
      <Text style={[styles.buttonIcon, { color: textColor }]}>{kind === "yes" ? "✓" : "✗"}</Text>
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.lg },
  pictureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.lg },
  picture: {
    width: 180,
    height: 180,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pictureImg: { width: "100%", height: "100%" },
  pictureEmoji: { fontSize: 96 },
  verdict: { textAlign: "center", fontSize: FontSizes.label, fontWeight: "800" },
  verdictGood: { color: Colors.correct },
  verdictGentle: { color: Colors.darkRed },
  buttons: { flexDirection: "row", gap: Spacing.lg, justifyContent: "center" },
  button: {
    flex: 1,
    maxWidth: 160,
    minHeight: TouchTarget.min + 24,
    borderRadius: Radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderWidth: 3,
  },
  yes: { backgroundColor: Colors.correct, borderColor: Colors.correct },
  no: { backgroundColor: Colors.red, borderColor: Colors.darkRed },
  correct: { backgroundColor: Colors.correct, borderColor: Colors.correct },
  gentle: { backgroundColor: Colors.tintGold, borderColor: Colors.gold },
  dim: { backgroundColor: Colors.textMuted, borderColor: Colors.textMuted, opacity: 0.5 },
  buttonIcon: { fontSize: 40, fontWeight: "900" },
  buttonText: { fontSize: FontSizes.label, fontWeight: "800" },
  pressed: { transform: [{ scale: 0.97 }] },
});
