/* Screen-reader announcements, reduced-motion, and toasts.
 * Replaces the web app's aria-live region / matchMedia / #toasts. */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "../constants/theme";

/** Polite live announcement for screen-reader users. */
export function announce(msg: string): void {
  if (!msg) return;
  try {
    AccessibilityInfo.announceForAccessibility(msg);
  } catch {
    /* announcements are a nicety */
  }
}

/** Live reduce-motion preference — every decorative animation gates on
 * this (confetti, pops, watch-it-draw autoplay…). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      setReduced(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ *
 * Toasts — 2.6 s, top-of-screen, never block taps. `keep` marks a toast
 * meant to survive one navigation ("XP saved" on exit); since the
 * provider lives above the navigator, toasts naturally persist across
 * screen changes, so `keep` is accepted for API parity.
 * ------------------------------------------------------------------ */

export interface ToastApi {
  toast(msg: string, opts?: { keep?: boolean }): void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

interface ToastItem {
  id: number;
  msg: string;
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((msg: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, msg }]);
    announce(msg);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return React.createElement(
    ToastContext.Provider,
    { value: api },
    children,
    React.createElement(
      View,
      { style: styles.host, pointerEvents: "none" as const },
      toasts.map((t) =>
        React.createElement(
          View,
          { key: t.id, style: styles.toast },
          React.createElement(Text, { style: styles.text }, t.msg)
        )
      )
    )
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: spacing.xl + spacing.xxl,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: spacing.sm,
  },
  toast: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 360,
    marginHorizontal: spacing.lg,
  },
  text: {
    color: colors.surface,
    fontSize: type.body - 1,
    fontWeight: "600",
    textAlign: "center",
  },
});
