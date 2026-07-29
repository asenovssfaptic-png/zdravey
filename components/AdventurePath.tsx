import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { CHARACTERS } from "@/characters/characters";
import { Martenitsa } from "@/components/Martenitsa";
import { Colors, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { LangCode, Lesson, Unit } from "@/content/content-model";
import { UNITS } from "@/content/content-model";
import { mapImage } from "@/lib/images";

// The adventure map: a hero (Pizho & Penda) journeys across the land spot by
// spot. Every lesson is a stop on a winding dotted trail, chunked into regions
// (units) hosted by their folklore character. Spots weave left/right for a
// meandering-path feel. Positive-only: nothing is locked — completed spots wear
// a martenitsa, the current spot carries the hero, upcoming spots are signposts.

const SPOT = 84;
const PAD = Spacing.lg;
const TRAIL_H = 44; // vertical gap between spots the dotted trail climbs
// Horizontal weave: fractions of the lane the successive spots sit at.
const WEAVE = [0.5, 0.74, 0.5, 0.26];

interface Spot {
  lesson: Lesson;
  unit: Unit;
  boss: boolean;
  regionStart: boolean;
}

// Marker left-edge offset (px) for spot i — a gentle weave kept in the left band
// so the flowing label to its right always has room.
function leftFor(i: number, lane: number): number {
  const x = WEAVE[i % WEAVE.length];
  return Math.max(0, Math.min(lane * 0.4, x * 0.55 * lane));
}

function buildSpots(): Spot[] {
  const spots: Spot[] = [];
  for (const unit of UNITS) {
    unit.lessons.forEach((lesson, li) => {
      spots.push({ lesson, unit, boss: lesson.boss === true, regionStart: li === 0 });
    });
  }
  return spots;
}

export function AdventurePath({
  known,
  isDone,
  onOpen,
  onAlphabet,
}: {
  known: LangCode;
  isDone: (lessonId: string) => boolean;
  onOpen: (lessonId: string) => void;
  onAlphabet: () => void;
}) {
  const { width } = useWindowDimensions();
  const lane = Math.min(width, 520) - PAD * 2;
  const spots = buildSpots();
  // The hero stands at the first unfinished spot (or past the end if all done).
  const current = spots.findIndex((s) => !isDone(s.lesson.id));
  const heroIndex = current === -1 ? spots.length : current;

  const land = mapImage("land_banner");

  return (
    <View style={styles.wrap}>
      {/* A little map header to open the journey. */}
      {land && (
        <Image source={land} style={styles.landBanner} resizeMode="cover" accessibilityIgnoresInvertColors />
      )}

      {spots.map((spot, i) => {
        const done = isDone(spot.lesson.id);
        const isHero = i === heroIndex;
        const state: SpotState = isHero ? "current" : done ? "done" : "upcoming";
        const xFrac = WEAVE[i % WEAVE.length];
        // Keep the marker in the left band so the flowing label always fits.
        const left = Math.max(0, Math.min(lane * 0.4, xFrac * 0.55 * lane));
        return (
          <View key={spot.lesson.id}>
            {spot.regionStart && <RegionBanner unit={spot.unit} known={known} />}

            <View style={[styles.spotRow, { width: lane }]}>
              {/* dotted connector climbing from the previous spot */}
              {i !== 0 && !spot.regionStart && (
                <Trail fromLeft={leftFor(i - 1, lane)} toLeft={left} />
              )}
              <Pressable
                onPress={() => onOpen(spot.lesson.id)}
                accessibilityRole="button"
                accessibilityLabel={spot.lesson.title[known]}
                accessibilityState={{ selected: done }}
                style={({ pressed }) => [styles.spotTap, pressed && styles.pressed]}
              >
                <View style={{ width: left }} />
                <SpotMarker state={state} boss={spot.boss} />
                <View style={styles.label}>
                  <Text style={styles.labelText} numberOfLines={2}>
                    {spot.lesson.title[known]}
                  </Text>
                  {done && <Text style={styles.labelStar}>⭐</Text>}
                  {isHero && (
                    <Text style={styles.hereText}>{known === "bg" ? "Ти си тук" : "You are here"}</Text>
                  )}
                </View>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Alphabet stop at the end of the trail. */}
      <RegionBannerRaw
        emoji={CHARACTERS.kuker.emoji}
        title={known === "bg" ? "Азбука" : "Alphabet"}
        color={CHARACTERS.kuker.color}
      />
      <View style={[styles.spotRow, { width: lane }]}>
        <Pressable
          onPress={onAlphabet}
          accessibilityRole="button"
          accessibilityLabel={known === "bg" ? "Азбука" : "Alphabet"}
          style={({ pressed }) => [styles.spotTap, pressed && styles.pressed]}
        >
          <View style={{ width: leftFor(0, lane) }} />
          <View style={[styles.marker, styles.markerAlpha]}>
            <Text style={styles.alphaGlyphs}>{known === "bg" ? "Abc" : "Абв"}</Text>
          </View>
          <View style={styles.label}>
            <Text style={styles.labelText}>{known === "bg" ? "Чуй буквите" : "Hear the letters"}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

type SpotState = "done" | "current" | "upcoming";

function SpotMarker({ state, boss }: { state: SpotState; boss: boolean }) {
  const hero = mapImage("hero");
  const signpost = mapImage("signpost");
  const treasure = mapImage("treasure");

  const ring =
    state === "current" ? styles.ringCurrent : state === "done" ? styles.ringDone : boss ? styles.ringBoss : styles.ringUpcoming;

  let content;
  if (state === "current") {
    content = hero ? (
      <Image source={hero} style={styles.markerImg} accessibilityIgnoresInvertColors />
    ) : (
      <Text style={styles.markerEmoji}>🧭</Text>
    );
  } else if (boss) {
    content = treasure ? (
      <Image source={treasure} style={styles.markerImg} accessibilityIgnoresInvertColors />
    ) : (
      <Text style={styles.markerEmoji}>🗝️</Text>
    );
  } else if (state === "done") {
    content = <Martenitsa size={48} />;
  } else {
    content = signpost ? (
      <Image source={signpost} style={styles.markerImg} accessibilityIgnoresInvertColors />
    ) : (
      <Text style={styles.markerEmoji}>📍</Text>
    );
  }

  return <View style={[styles.marker, ring, state === "upcoming" && styles.markerDim]}>{content}</View>;
}

// Three stepping-stone dots climbing from the previous marker's centre to this
// one's (fromLeft/toLeft are marker left-edge offsets in px).
function Trail({ fromLeft, toLeft }: { fromLeft: number; toLeft: number }) {
  const fromC = fromLeft + SPOT / 2;
  const toC = toLeft + SPOT / 2;
  return (
    <View style={styles.trail} pointerEvents="none">
      {[0.2, 0.5, 0.8].map((t) => {
        const x = fromC + (toC - fromC) * t;
        return <View key={t} style={[styles.trailDot, { left: x - 5, top: t * TRAIL_H - 5 }]} />;
      })}
    </View>
  );
}

function RegionBanner({ unit, known }: { unit: Unit; known: LangCode }) {
  const host = CHARACTERS[unit.host];
  return <RegionBannerRaw emoji={host.emoji} title={unit.theme[known]} color={host.color} />;
}

function RegionBannerRaw({ emoji, title, color }: { emoji: string; title: string; color: string }) {
  return (
    <View style={styles.region}>
      <View style={[styles.regionBadge, { backgroundColor: color }]}>
        <Text style={styles.regionEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.regionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingBottom: Spacing.xl },
  landBanner: {
    width: "100%",
    height: 150,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  region: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    alignSelf: "stretch",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  regionBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.round,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  regionEmoji: { fontSize: 24 },
  regionTitle: { fontSize: FontSizes.title, fontWeight: "800", color: Colors.darkRed },
  spotRow: {
    minHeight: SPOT + TRAIL_H,
    justifyContent: "center",
  },
  spotTap: {
    flexDirection: "row",
    alignItems: "center",
  },
  pressed: { transform: [{ scale: 0.97 }] },
  marker: {
    width: SPOT,
    height: SPOT,
    borderRadius: Radii.round,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    backgroundColor: Colors.white,
  },
  markerImg: { width: "100%", height: "100%" },
  markerEmoji: { fontSize: 40 },
  markerDim: { opacity: 0.92 },
  ringDone: { borderColor: Colors.correct, backgroundColor: Colors.tintGreen },
  ringCurrent: { borderColor: Colors.gold },
  ringUpcoming: { borderColor: Colors.textMuted },
  ringBoss: { borderColor: Colors.darkRed },
  markerAlpha: { borderColor: Colors.red },
  alphaGlyphs: { fontSize: 30, fontWeight: "800", color: Colors.red },
  // Label pill flows to the right of the marker and fills the remaining width.
  label: {
    flex: 1,
    marginLeft: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.red,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  labelText: { fontSize: FontSizes.body, fontWeight: "800", color: Colors.darkRed },
  labelStar: { fontSize: 18 },
  hereText: { fontSize: 13, fontWeight: "700", color: Colors.correct },
  trail: {
    position: "absolute",
    top: -TRAIL_H / 2,
    left: 0,
    right: 0,
    height: TRAIL_H,
  },
  trailDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
    opacity: 0.7,
  },
});
