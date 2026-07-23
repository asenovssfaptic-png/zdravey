import { useAudioPlayer } from "expo-audio";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CHARACTERS } from "@/characters/characters";
import { CharacterBubble } from "@/components/CharacterBubble";
import { Colors, FontSizes, Radii, Spacing, TouchTarget } from "@/constants/theme";
import { useDirection } from "@/lib/direction";

// Игра — музика ("Повтори мелодията" / Repeat the tune). A gentle glockenspiel:
// five bright pentatonic bars that always play when tapped (a free instrument),
// plus an echo game — Kuker plays a growing tune and the child taps it back.
// Positive-only: any note sounds nice, a wrong tap just gently replays the tune,
// and the melody length only ever grows. No timer, no score, no fail.
const emptySubscribe = () => () => {};

const NOTE_SOURCES: Record<string, number> = {
  c: require("../../assets/audio/notes/c.wav"),
  d: require("../../assets/audio/notes/d.wav"),
  e: require("../../assets/audio/notes/e.wav"),
  g: require("../../assets/audio/notes/g.wav"),
  a: require("../../assets/audio/notes/a.wav"),
};

// Bar order low→high, each a distinct theme colour.
const BARS: { note: string; color: string }[] = [
  { note: "c", color: Colors.red },
  { note: "d", color: Colors.gold },
  { note: "e", color: Colors.correct },
  { note: "g", color: Colors.mapSea },
  { note: "a", color: Colors.darkRed },
];
const NOTES = BARS.map((b) => b.note);
const MAX_LEN = 6;

// Module-level (not called during render) so the linter's purity rule is happy.
function randomNote() {
  return NOTES[Math.floor(Math.random() * NOTES.length)];
}

export default function MusicGameScreen() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <SafeAreaView style={styles.safeArea} />;
  return <MusicContent />;
}

function MusicContent() {
  const router = useRouter();
  const { direction } = useDirection();
  const known = direction.known;
  const kuker = CHARACTERS.kuker;

  const player = useAudioPlayer(null);
  const playNote = useCallback(
    (note: string) => {
      const src = NOTE_SOURCES[note];
      if (!src) return;
      player.replace(src);
      player.seekTo(0);
      player.play();
    },
    [player],
  );

  // Deterministic-first initial note so the SSR shell (never rendered here — we
  // mount-gate) and first client render agree; grows with real randomness after.
  const [tune, setTune] = useState<string[]>(["c"]);
  const [pos, setPos] = useState(0); // how many notes of the tune the child has echoed
  const [flash, setFlash] = useState<string | null>(null);
  const [listening, setListening] = useState(false); // true while the tune auto-plays
  const [celebrate, setCelebrate] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Auto-play the whole tune, lighting each bar, then hand control to the child.
  const playTune = useCallback(
    (seq: string[]) => {
      clearTimers();
      setListening(true);
      setPos(0);
      seq.forEach((note, i) => {
        timers.current.push(
          setTimeout(() => {
            setFlash(note);
            playNote(note);
            timers.current.push(setTimeout(() => setFlash(null), 300));
            if (i === seq.length - 1) {
              timers.current.push(setTimeout(() => setListening(false), 420));
            }
          }, i * 620),
        );
      });
    },
    [clearTimers, playNote],
  );

  // Play the opening tune shortly after mount. Deferred via a timer so we don't
  // call setState synchronously inside the effect body.
  useEffect(() => {
    const id = setTimeout(() => playTune(tune), 350);
    return () => {
      clearTimeout(id);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function grow() {
    const next = [...tune, randomNote()];
    setTune(next);
    setCelebrate(false);
    playTune(next);
  }

  function tapBar(note: string) {
    playNote(note);
    setFlash(note);
    setTimeout(() => setFlash((f) => (f === note ? null : f)), 220);
    if (listening) return; // free-play taps during listening don't count

    if (note === tune[pos]) {
      const nextPos = pos + 1;
      if (nextPos >= tune.length) {
        // Whole tune echoed — celebrate and (unless maxed) grow it.
        setPos(0);
        setCelebrate(true);
        if (tune.length < MAX_LEN) {
          timers.current.push(setTimeout(grow, 1100));
        }
      } else {
        setPos(nextPos);
      }
    } else {
      // Gentle miss — no penalty, just replay the tune to try again.
      setPos(0);
      timers.current.push(setTimeout(() => playTune(tune), 500));
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
        <Text style={styles.title}>{known === "bg" ? "Музика" : "Music"}</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.body}>
        <CharacterBubble
          character={kuker}
          text={
            celebrate
              ? known === "bg"
                ? "Браво! Още по-дълга мелодия!"
                : "Bravo! An even longer tune!"
              : listening
                ? known === "bg"
                  ? "Слушай…"
                  : "Listen…"
                : known === "bg"
                  ? "Повтори мелодията!"
                  : "Repeat the tune!"
          }
        />

        <View style={styles.meterRow}>
          <Text style={styles.meterLabel}>{known === "bg" ? "Мелодия" : "Tune"}</Text>
          <View style={styles.dots}>
            {tune.map((_, i) => (
              <View key={i} style={[styles.dot, i < pos && styles.dotDone]} />
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => playTune(tune)}
          disabled={listening}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Чуй мелодията" : "Hear the tune"}
          style={({ pressed }) => [styles.listenBtn, listening && styles.listenBtnOff, pressed && styles.pressed]}
        >
          <Text style={styles.listenText}>▶ {known === "bg" ? "Чуй пак" : "Hear again"}</Text>
        </Pressable>

        <View style={styles.bars}>
          {BARS.map(({ note, color }, i) => (
            <Pressable
              key={note}
              onPress={() => tapBar(note)}
              accessibilityRole="button"
              accessibilityLabel={known === "bg" ? `Нота ${i + 1}` : `Note ${i + 1}`}
              style={[
                styles.bar,
                { backgroundColor: color, height: 150 + i * 22 },
                flash === note && styles.barFlash,
              ]}
            />
          ))}
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
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 32, color: Colors.darkRed, fontWeight: "800" },
  title: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },
  meterRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, justifyContent: "center" },
  meterLabel: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.darkRed },
  dots: { flexDirection: "row", gap: Spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.textMuted, opacity: 0.4 },
  dotDone: { backgroundColor: Colors.correct, opacity: 1 },
  listenBtn: {
    alignSelf: "center",
    backgroundColor: Colors.gold,
    borderRadius: Radii.round,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  listenBtnOff: { opacity: 0.5 },
  listenText: { fontSize: FontSizes.label, fontWeight: "800", color: Colors.text },
  bars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  bar: {
    flex: 1,
    maxWidth: 64,
    minHeight: TouchTarget.min,
    borderRadius: Radii.md,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  barFlash: { borderColor: Colors.text, opacity: 0.85, transform: [{ scale: 0.96 }] },
  pressed: { transform: [{ scale: 0.97 }] },
});
