import { useRouter } from "expo-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import { puzzleImage } from "@/lib/images";
import { useDirection } from "@/lib/direction";
import { shuffled } from "@/lib/shuffle";

// Игра — пъзел ("Подреди картинката" / Put the picture together). A gentle
// tap-to-swap jigsaw of painted Bulgarian landmarks. Positive-only: no timer,
// no move count, no fail — the finished painting is the reward, guarded by the
// friendly Zmey. Client-only (reads direction from storage).
const GRID = 3;
const emptySubscribe = () => () => {};

interface Scene {
  name: string;
  label: { bg: string; en: string };
}

// The painted scenes available as puzzles (art in assets/img/puzzle, registered
// in lib/images.ts). Labels live here since they're display-only.
const SCENES: Scene[] = [
  { name: "rila_monastery", label: { bg: "Рилски манастир", en: "Rila Monastery" } },
  { name: "nesebar", label: { bg: "Несебър", en: "Nesebar" } },
  { name: "belogradchik", label: { bg: "Белоградчишки скали", en: "Belogradchik Rocks" } },
  { name: "rose_valley", label: { bg: "Розовата долина", en: "Rose Valley" } },
  { name: "plovdiv", label: { bg: "Стария Пловдив", en: "Old Plovdiv" } },
  { name: "pirin_lake", label: { bg: "Пирин", en: "Pirin" } },
];

// A shuffled order that is guaranteed NOT already solved.
function scramble(): number[] {
  const solved = Array.from({ length: GRID * GRID }, (_, i) => i);
  let order = shuffled(solved);
  if (order.every((v, i) => v === i)) order = [...order].reverse();
  return order;
}

export default function PuzzleGameScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <PuzzleContent />;
}

function PuzzleContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const known = direction.known;
  const zmey = CHARACTERS.zmey;
  const { width } = useWindowDimensions();

  const board = Math.min(width - Spacing.lg * 2, 330);
  const tile = board / GRID;

  const [scene, setScene] = useState<Scene>(() => SCENES[0]);
  // order[slot] = index of the piece currently placed in that slot.
  const [order, setOrder] = useState<number[]>(() => scramble());
  const [selected, setSelected] = useState<number | null>(null);

  const solved = useMemo(() => order.every((v, i) => v === i), [order]);
  const img = puzzleImage(scene.name);

  function loadScene(s: Scene) {
    setScene(s);
    setOrder(scramble());
    setSelected(null);
  }

  function reshuffle() {
    setOrder(scramble());
    setSelected(null);
  }

  function tapSlot(slot: number) {
    if (solved) return;
    if (selected === null) {
      setSelected(slot);
      return;
    }
    if (selected === slot) {
      setSelected(null);
      return;
    }
    setOrder((prev) => {
      const next = [...prev];
      [next[selected], next[slot]] = [next[slot], next[selected]];
      return next;
    });
    setSelected(null);
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
        <Text style={styles.title}>{known === "bg" ? "Пъзел" : "Puzzle"}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <CharacterBubble
          character={zmey}
          text={
            solved
              ? known === "bg"
                ? "Браво! Подреди картинката!"
                : "Bravo! You put it together!"
              : known === "bg"
                ? "Докосни две плочки, за да ги размениш."
                : "Tap two tiles to swap them."
          }
        />

        {!img ? (
          <Text style={styles.missing}>{known === "bg" ? "Няма картинка" : "No picture"}</Text>
        ) : solved ? (
          <View style={[styles.boardWrap, { width: board, height: board }]}>
            <Image
              source={img}
              style={{ width: board, height: board, borderRadius: Radii.lg }}
              accessibilityLabel={scene.label[known]}
            />
          </View>
        ) : (
          <View
            style={[styles.board, { width: board, height: board }]}
            accessibilityLabel={known === "bg" ? `Пъзел: ${scene.label.bg}` : `Puzzle: ${scene.label.en}`}
          >
            {order.map((piece, slot) => {
              const homeCol = piece % GRID;
              const homeRow = Math.floor(piece / GRID);
              const correct = piece === slot;
              return (
                <Pressable
                  key={slot}
                  testID="puzzletile"
                  onPress={() => tapSlot(slot)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    known === "bg" ? `Плочка ${slot + 1}` : `Tile ${slot + 1}`
                  }
                  accessibilityState={{ selected: selected === slot }}
                  style={[
                    styles.tile,
                    { width: tile, height: tile },
                    selected === slot && styles.tileSelected,
                    correct && styles.tileCorrect,
                  ]}
                >
                  <Image
                    source={img}
                    style={{
                      width: board,
                      height: board,
                      transform: [{ translateX: -homeCol * tile }, { translateY: -homeRow * tile }],
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.label}>
          <Text style={styles.labelText}>{scene.label[known]}</Text>
        </View>

        <Pressable
          onPress={reshuffle}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Разбъркай отново" : "Shuffle again"}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>
            {solved ? (known === "bg" ? "Още веднъж" : "Play again") : known === "bg" ? "Разбъркай" : "Shuffle"}
          </Text>
        </Pressable>

        {/* Scene chooser — tap a painted place to solve it. */}
        <Text style={styles.chooseTitle}>{known === "bg" ? "Избери картинка" : "Choose a picture"}</Text>
        <View style={styles.thumbs}>
          {SCENES.map((s) => {
            const thumb = puzzleImage(s.name);
            const active = s.name === scene.name;
            return (
              <Pressable
                key={s.name}
                onPress={() => loadScene(s)}
                accessibilityRole="button"
                accessibilityLabel={s.label[known]}
                accessibilityState={{ selected: active }}
                style={[styles.thumbWrap, active && styles.thumbActive]}
              >
                {thumb && <Image source={thumb} style={styles.thumb} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 32, color: Colors.darkRed, fontWeight: "800" },
  title: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  content: { alignItems: "center", gap: Spacing.md, padding: Spacing.lg },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: Radii.lg,
    overflow: "hidden",
    backgroundColor: Colors.darkRed,
  },
  boardWrap: { borderRadius: Radii.lg, overflow: "hidden" },
  tile: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.white,
  },
  tileSelected: { borderWidth: 3, borderColor: Colors.gold },
  tileCorrect: { borderWidth: 1, borderColor: Colors.correct },
  missing: { fontSize: FontSizes.body, color: Colors.textMuted },
  label: { paddingTop: Spacing.xs },
  labelText: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.darkRed },
  button: {
    backgroundColor: Colors.red,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  buttonText: { fontSize: FontSizes.label, fontWeight: "700", color: Colors.white },
  pressed: { transform: [{ scale: 0.97 }] },
  chooseTitle: {
    fontSize: FontSizes.label,
    fontWeight: "800",
    color: Colors.darkRed,
    marginTop: Spacing.md,
  },
  thumbs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: Radii.md,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "transparent",
  },
  thumbActive: { borderColor: Colors.correct },
  thumb: { width: 88, height: 88 },
});
