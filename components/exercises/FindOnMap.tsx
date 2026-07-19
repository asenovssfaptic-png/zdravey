import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { buildFindOnMap } from "@/content/content-model";
import { useClipPlayer, useOnDemandPlayer } from "@/lib/audio";
import { useDirection } from "@/lib/direction";

import { REVEAL_DELAY_MS, type ExerciseProps } from "./types";

// find_on_map — a stylized map of Bulgaria with tappable city pins. Hear a
// city, tap where it is. The Black Sea sits on the east edge to orient the
// child. Positive-only: a wrong tap gently reveals the right pin.
export function FindOnMap({ exercise, host, onDone }: ExerciseProps) {
  const { direction } = useDirection();
  const built = useMemo(() => buildFindOnMap(exercise, direction), [exercise, direction]);

  const prompt = useClipPlayer(built.promptAudio);
  const pinPlayer = useOnDemandPlayer();
  const [picked, setPicked] = useState<string | null>(null);
  const resolved = picked !== null;
  // Measure the rendered map so pins are positioned in real pixels — percentage
  // top/left don't resolve reliably against an aspectRatio height on web.
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    prompt.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.prompt, direction.learning]);

  useEffect(() => {
    if (!resolved) return;
    const correct = built.pins.find((p) => p.id === built.correctId);
    const say = correct ? setTimeout(() => pinPlayer.play(correct.audio), 350) : undefined;
    const advance = setTimeout(onDone, REVEAL_DELAY_MS);
    return () => {
      if (say) clearTimeout(say);
      clearTimeout(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  return (
    <View style={styles.container}>
      <CharacterBubble
        character={host}
        text={
          direction.known === "bg"
            ? `Къде е «${built.promptLabel}»?`
            : `Where is «${built.promptLabel}»?`
        }
      />

      <View style={styles.promptRow}>
        <AudioButton
          onPress={prompt.play}
          isPlaying={prompt.isPlaying}
          accessibilityLabel={direction.known === "bg" ? "Чуй града" : "Hear the city"}
          size={88}
        />
      </View>

      <View
        style={styles.map}
        onLayout={(e) => setMapSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {/* Black Sea on the east edge */}
        <View style={styles.sea} />
        <Text style={styles.mapLabel}>{direction.known === "bg" ? "България" : "Bulgaria"}</Text>

        {mapSize.w > 0 &&
          built.pins.map((pin) => {
            const isCorrect = pin.id === built.correctId;
            return (
              <Pressable
                key={pin.id}
                onPress={() => {
                  if (resolved) return;
                  pinPlayer.play(pin.audio);
                  setPicked(pin.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={pin.label}
                style={[styles.pin, { left: pin.x * mapSize.w, top: pin.y * mapSize.h }]}
              >
                <View
                  style={[
                    styles.pinDot,
                    !resolved && styles.pinIdle,
                    resolved && isCorrect && styles.pinCorrect,
                    resolved && !isCorrect && pin.id === picked && styles.pinWrong,
                    resolved && !isCorrect && pin.id !== picked && styles.pinDim,
                  ]}
                >
                  <Text style={styles.pinIcon}>📍</Text>
                </View>
                <Text style={styles.pinLabel} numberOfLines={1}>
                  {pin.label}
                </Text>
              </Pressable>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.md,
  },
  promptRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    width: "100%",
    aspectRatio: 1.5,
    backgroundColor: Colors.mapLand,
    borderRadius: Radii.lg,
    borderWidth: 3,
    borderColor: Colors.correct,
    overflow: "hidden",
    position: "relative",
  },
  sea: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "12%",
    backgroundColor: Colors.mapSea,
  },
  mapLabel: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.md,
    fontSize: FontSizes.body,
    fontWeight: "700",
    color: Colors.correct,
    opacity: 0.7,
  },
  // Pin is anchored at its map point; shift up/left so the dot sits on the spot.
  pin: {
    position: "absolute",
    alignItems: "center",
    marginLeft: -44,
    marginTop: -26,
    width: 88,
  },
  pinDot: {
    width: 40,
    height: 40,
    borderRadius: Radii.round,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  pinIdle: {
    backgroundColor: Colors.white,
    borderColor: Colors.darkRed,
  },
  pinCorrect: {
    backgroundColor: Colors.tintGreen,
    borderColor: Colors.correct,
  },
  pinWrong: {
    backgroundColor: Colors.white,
    borderColor: Colors.textMuted,
  },
  pinDim: {
    backgroundColor: Colors.white,
    borderColor: Colors.textMuted,
    opacity: 0.4,
  },
  pinIcon: {
    fontSize: 22,
  },
  pinLabel: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    backgroundColor: Colors.white,
    paddingHorizontal: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
});
