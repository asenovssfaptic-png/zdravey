import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { AudioButton } from "@/components/AudioButton";
import { CharacterBubble } from "@/components/CharacterBubble";
import { SparkleBurst } from "@/components/SparkleBurst";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { VOCAB } from "@/content/content-model";
import { AUDIO_ASSETS } from "@/lib/audioAssets";
import { useDirection } from "@/lib/direction";
import { vocabImage } from "@/lib/images";
import { useSfx } from "@/lib/sfx";
import { shuffled } from "@/lib/shuffle";

// Игра — "Спукай балона" (Pop the balloon). Hear a word, tap the matching
// gently-bobbing balloon to pop it. Endless and positive-only: a hit pops with
// a sparkle + chime and floats a fresh set in; a wrong tap just wobbles, no
// penalty, no timer. Reinforces vocab with an arcade-y feel. Hitar Petar hosts.
const emptySubscribe = () => () => {};
const CHOICES = 4;
const COLORS = [Colors.red, Colors.gold, Colors.correct, Colors.mapSea];

const POOL = Object.keys(VOCAB).filter(
  (id) => id.startsWith("fruit.") || id.startsWith("animal.") || id.startsWith("food.") || id.startsWith("toy."),
);

export default function BalloonGameScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <BalloonContent />;
}

function makeRound(): { items: string[]; target: string } {
  const items = shuffled(POOL).slice(0, CHOICES);
  const target = items[Math.floor(Math.random() * items.length)];
  return { items: shuffled(items), target };
}

function BalloonContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const known = direction.known;
  const learning = direction.learning;
  const hitar = CHARACTERS.hitar_petar;
  const sfx = useSfx();

  const player = useAudioPlayer(null);
  function say(id: string) {
    const src = AUDIO_ASSETS[VOCAB[id].audio[learning].src];
    if (!src) return;
    player.replace(src);
    player.seekTo(0);
    player.play();
  }

  const [{ items, target }, setRound] = useState(makeRound);
  const [popped, setPopped] = useState<string | null>(null);
  const [wobble, setWobble] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [wins, setWins] = useState(0);

  // One shared bob loop; balloons alternate phase for a lively drift.
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [bob]);

  // Say the target word whenever a fresh round floats in.
  useEffect(() => {
    const t = setTimeout(() => say(target), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  function tap(id: string) {
    if (popped) return;
    say(id);
    if (id === target) {
      setPopped(id);
      setWins((w) => w + 1);
      setCount((n) => n + 1);
      sfx.play("pop");
      setTimeout(() => {
        setPopped(null);
        setRound(makeRound());
      }, 700);
    } else {
      setWobble(id);
      setTimeout(() => setWobble((w) => (w === id ? null : w)), 400);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Назад" : "Back"}
          style={styles.back}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{known === "bg" ? "Балони" : "Balloons"}</Text>
        <View style={styles.countPill} accessibilityLabel={known === "bg" ? `Спукани: ${count}` : `Popped: ${count}`}>
          <Text style={styles.countEmoji}>🎈</Text>
          <Text style={styles.countNum}>{count}</Text>
        </View>
      </View>

      <CharacterBubble
        character={hitar}
        text={known === "bg" ? "Спукай балона, който чуеш!" : "Pop the balloon you hear!"}
      />

      <View style={styles.promptRow}>
        <AudioButton
          onPress={() => say(target)}
          accessibilityLabel={known === "bg" ? "Чуй пак" : "Hear again"}
          size={72}
        />
      </View>

      <View style={styles.field}>
        {items.map((id, i) => {
          const v = VOCAB[id];
          const img = vocabImage(id);
          const gone = popped === id;
          const translateY = bob.interpolate({
            inputRange: [0, 1],
            outputRange: i % 2 === 0 ? [0, -14] : [-14, 0],
          });
          return (
            <Animated.View key={id} style={[styles.balloonSlot, { transform: [{ translateY }] }]}>
              {gone ? (
                <View style={styles.burstHolder}>
                  <SparkleBurst trigger={wins} size={160} distance={70} />
                </View>
              ) : (
                <Pressable
                  onPress={() => tap(id)}
                  accessibilityRole="button"
                  accessibilityLabel={v.labels[learning]}
                  style={[
                    styles.balloon,
                    { backgroundColor: COLORS[i % COLORS.length] },
                    wobble === id && styles.wobble,
                  ]}
                >
                  {img ? (
                    <Image source={img} style={styles.balloonImg} resizeMode="contain" accessibilityIgnoresInvertColors />
                  ) : (
                    <Text style={styles.balloonEmoji}>{v.emoji ?? "🎈"}</Text>
                  )}
                </Pressable>
              )}
            </Animated.View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white, padding: Spacing.lg, gap: Spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 32, color: Colors.darkRed, fontWeight: "800" },
  title: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.tintGreen,
    borderRadius: Radii.round,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.correct,
    minWidth: 56,
    justifyContent: "center",
  },
  countEmoji: { fontSize: 18 },
  countNum: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.darkRed },
  promptRow: { alignItems: "center" },
  field: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    alignItems: "center",
    alignContent: "center",
  },
  balloonSlot: { width: "44%", alignItems: "center", justifyContent: "center", height: 180 },
  balloon: {
    width: 130,
    height: 150,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.white,
  },
  balloonImg: { width: 90, height: 90 },
  balloonEmoji: { fontSize: 64 },
  wobble: { transform: [{ rotate: "-6deg" }] },
  burstHolder: { width: 130, height: 150, alignItems: "center", justifyContent: "center" },
});
