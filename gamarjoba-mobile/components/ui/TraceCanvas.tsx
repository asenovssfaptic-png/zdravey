/* TraceCanvas — finger-tracing surface for one Mkhedruli letter.
 *
 * All geometry lives in the strokes' 0–100 box via an SVG viewBox, so
 * every device renders identically. Layers:
 *   1. faint template (the letterform stroked from LETTER_STROKES data,
 *      or a faint glyph fallback for a letter without stroke data),
 *   2. "Watch it draw" progress (accent, stroke by stroke),
 *   3. numbered start dots + direction arrows per stroke,
 *   4. the child's ink (accent polylines).
 *
 * Tracing is DOING, never judged: any mark counts, Clear is free, and
 * watching the letter draw itself also counts as tracing (keyboard/motor
 * accessibility) — except the once-per-letter-per-session auto demo,
 * which is a gift, never a gate, and never counts.
 *
 * Ref API (frozen contract): { getStrokeCount, clear, watch(done?, {auto}) }.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Path, Polygon, Text as SvgText } from "react-native-svg";

import { colors, radii } from "../../constants/theme";
import { LETTER_STROKES } from "../../content/generated/strokes";
import type { Letter, StrokePoints } from "../../content/types";
import { useReducedMotion } from "../../lib/announce";

export interface TraceCanvasHandle {
  getStrokeCount(): number;
  clear(): void;
  watch(done?: (() => void) | null, opts?: { auto?: boolean }): void;
}

export interface TraceCanvasProps {
  letter: Letter;
  /** Play the stroke-order demo once per letter per app session. */
  autoDemo?: boolean;
  onFirstStroke?: () => void;
  /** Fires true while a finger is down — parents disable scrolling. */
  onDrawStateChange?: (drawing: boolean) => void;
}

/** letters whose auto demo already played this session (in-memory on
 * purpose — the persistent store stays additive-only). */
const autoWatched: Record<string, boolean> = {};

const TEMPLATE_COLOR = "rgba(43, 35, 32, 0.14)"; // ink at 14%
const TEMPLATE_WIDTH = 13; // units — thick round-cap brush ≈ glyph weight
const INK_WIDTH = 6; // units

function polyD(pts: StrokePoints): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
}

function strokeLen(pts: StrokePoints): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return L;
}

function partialD(pts: StrokePoints, upto: number): string {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    const seg = Math.hypot(dx, dy);
    if (walked + seg > upto) {
      const k = seg ? (upto - walked) / seg : 0;
      d += ` L${pts[i - 1][0] + dx * k} ${pts[i - 1][1] + dy * k}`;
      return d;
    }
    walked += seg;
    d += ` L${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
}

export const TraceCanvas = forwardRef<TraceCanvasHandle, TraceCanvasProps>(function TraceCanvas(
  { letter, autoDemo = false, onFirstStroke, onDrawStateChange },
  ref
) {
  const { width: winWidth } = useWindowDimensions();
  const size = Math.max(220, Math.min(Math.floor(winWidth * 0.8), 300));
  const strokes: StrokePoints[] | null = LETTER_STROKES[letter.ka] ?? null;
  const reduced = useReducedMotion();

  // the child's ink: array of "d" path strings; points kept in a ref
  const [inkPaths, setInkPaths] = useState<string[]>([]);
  const currentPts = useRef<[number, number][]>([]);
  const strokeCount = useRef(0);

  // watch-it-draw progress: strokes fully drawn + partial length of the next
  const [watchProgress, setWatchProgress] = useState<{ upTo: number; partial: number } | null>(
    null
  );
  const watching = useRef(false);
  const raf = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      pending.forEach(clearTimeout);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(
      setTimeout(() => {
        if (alive.current) fn();
      }, ms)
    );
  }, []);

  const clear = useCallback(() => {
    strokeCount.current = 0;
    currentPts.current = [];
    setInkPaths([]);
    setWatchProgress(null);
  }, []);

  const watch = useCallback(
    (done?: (() => void) | null, opts?: { auto?: boolean }) => {
      if (watching.current) return;
      watching.current = true;
      const auto = !!opts?.auto;

      const finishWatch = () => {
        watching.current = false;
        if (!auto) {
          // watching counts as traced (keyboard/motor accessibility)
          strokeCount.current = Math.max(1, strokeCount.current);
        }
        done?.();
        if (auto) {
          // the auto demo settles back to the faint model so the kid
          // traces over a fresh template (skipped once they've drawn)
          later(() => {
            if (watching.current || strokeCount.current > 0) return;
            setWatchProgress(null);
          }, 700);
        }
      };

      if (!strokes || reduced) {
        // reduced motion (or no stroke data): instant full render
        setWatchProgress({ upTo: strokes ? strokes.length : 0, partial: 0 });
        finishWatch();
        return;
      }

      const lens = strokes.map(strokeLen);
      const durs = lens.map((L) => Math.max(600, Math.min(900, 600 + L * 2)));
      let si = 0;
      let t0: number | null = null;

      const frame = (ts: number) => {
        if (!alive.current) {
          watching.current = false;
          return;
        }
        if (t0 === null) t0 = ts;
        const k = Math.min(1, (ts - t0) / durs[si]);
        setWatchProgress({ upTo: si, partial: lens[si] * k });
        if (k < 1) {
          raf.current = requestAnimationFrame(frame);
          return;
        }
        si++;
        t0 = null;
        if (si < strokes.length) {
          later(() => {
            raf.current = requestAnimationFrame(frame);
          }, 160);
        } else {
          setWatchProgress({ upTo: strokes.length, partial: 0 });
          finishWatch();
        }
      };
      raf.current = requestAnimationFrame(frame);
    },
    [strokes, reduced, later]
  );

  useImperativeHandle(
    ref,
    () => ({
      getStrokeCount: () => strokeCount.current,
      clear,
      watch,
    }),
    [clear, watch]
  );

  // once-per-letter-per-session auto demo (a gift, never a gate)
  useEffect(() => {
    if (!autoDemo || reduced || autoWatched[letter.ka]) return;
    autoWatched[letter.ka] = true;
    later(() => watch(null, { auto: true }), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter.ka, autoDemo, reduced]);

  /* ---------------- drawing (responder system) ---------------- */

  const toUnits = (e: GestureResponderEvent): [number, number] => {
    const { locationX, locationY } = e.nativeEvent;
    return [
      Math.round((locationX / size) * 1000) / 10,
      Math.round((locationY / size) * 1000) / 10,
    ];
  };

  const onGrant = (e: GestureResponderEvent) => {
    const p = toUnits(e);
    currentPts.current = [p];
    strokeCount.current++;
    if (strokeCount.current === 1) onFirstStroke?.();
    onDrawStateChange?.(true);
    // a dot so a single tap leaves visible ink
    setInkPaths((paths) => [...paths, `M${p[0]} ${p[1]} L${p[0] + 0.01} ${p[1] + 0.01}`]);
  };

  const onMove = (e: GestureResponderEvent) => {
    const p = toUnits(e);
    const pts = currentPts.current;
    const last = pts[pts.length - 1];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.8) return;
    pts.push(p);
    const d = polyD(pts as StrokePoints);
    setInkPaths((paths) => [...paths.slice(0, -1), d]);
  };

  const onRelease = () => {
    currentPts.current = [];
    onDrawStateChange?.(false);
  };

  /* ---------------- render ---------------- */

  const a11yLabel = strokes
    ? `Tracing area for letter ${letter.ka} — draw over the gray letter, starting each line at its numbered dot, or use the Watch it draw button`
    : `Tracing area for letter ${letter.ka} — draw over the gray letter with your finger, or use the Watch it draw button`;

  return (
    <View
      style={[styles.card, { width: size, height: size }]}
      accessible
      accessibilityLabel={a11yLabel}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onRelease}
      onResponderTerminate={onRelease}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" pointerEvents="none">
        {/* 1 — faint template */}
        {strokes ? (
          strokes.map((pts, i) => (
            <Path
              key={`t${i}`}
              d={polyD(pts)}
              stroke={TEMPLATE_COLOR}
              strokeWidth={TEMPLATE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))
        ) : (
          <SvgText
            x={50}
            y={54}
            fontSize={80}
            fontWeight="600"
            fill={TEMPLATE_COLOR}
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {letter.ka}
          </SvgText>
        )}

        {/* 2 — watch-it-draw progress */}
        {strokes && watchProgress
          ? strokes.slice(0, watchProgress.upTo).map((pts, i) => (
              <Path
                key={`w${i}`}
                d={polyD(pts)}
                stroke={colors.accent}
                strokeWidth={TEMPLATE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))
          : null}
        {strokes &&
        watchProgress &&
        watchProgress.upTo < strokes.length &&
        watchProgress.partial > 0 ? (
          <Path
            d={partialD(strokes[watchProgress.upTo], watchProgress.partial)}
            stroke={colors.accent}
            strokeWidth={TEMPLATE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
        {!strokes && watchProgress ? (
          <SvgText
            x={50}
            y={54}
            fontSize={80}
            fontWeight="600"
            fill={colors.accent}
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {letter.ka}
          </SvgText>
        ) : null}

        {/* 3 — numbered start dots + direction arrows */}
        {strokes
          ? strokes.map((pts, si) => {
              const a = pts[0];
              const b = pts[Math.min(2, pts.length - 1)];
              const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
              const ax = a[0] + Math.cos(ang) * 8.5;
              const ay = a[1] + Math.sin(ang) * 8.5;
              const r = 2.8;
              const tri = [
                [ax + r * Math.cos(ang), ay + r * Math.sin(ang)],
                [ax + r * Math.cos(ang + 2.5), ay + r * Math.sin(ang + 2.5)],
                [ax + r * Math.cos(ang - 2.5), ay + r * Math.sin(ang - 2.5)],
              ]
                .map((p) => p.join(","))
                .join(" ");
              return (
                <React.Fragment key={`g${si}`}>
                  <Polygon points={tri} fill={colors.accentDeep} />
                  <Circle cx={a[0]} cy={a[1]} r={4.8} fill={colors.accent} />
                  <SvgText
                    x={a[0]}
                    y={a[1] + 0.2}
                    fontSize={5.5}
                    fontWeight="700"
                    fill={colors.white}
                    textAnchor="middle"
                    alignmentBaseline="central"
                  >
                    {String(si + 1)}
                  </SvgText>
                </React.Fragment>
              );
            })
          : null}

        {/* 4 — the child's ink */}
        {inkPaths.map((d, i) => (
          <Path
            key={`i${i}`}
            d={d}
            stroke={colors.accent}
            strokeWidth={INK_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
});

export default TraceCanvas;
