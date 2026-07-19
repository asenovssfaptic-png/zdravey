import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Progress = collecting martenitsi. This store only ever grows — finishing a
// lesson adds its reward. There is no losable state, no streak, no score to
// drop (see the positive-only rule in CLAUDE.md).

const STORAGE_KEY = "zdravey.progress";

interface ProgressState {
  // Lesson ids the child has finished at least once. One martenitsa each.
  completedLessons: string[];
}

interface ProgressContextValue {
  completedLessons: Set<string>;
  martenitsi: number;
  isLessonComplete: (lessonId: string) => boolean;
  completeLesson: (lessonId: string) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as ProgressState;
        setCompleted(new Set(parsed.completedLessons ?? []));
      } catch {
        // Corrupt/old value — start fresh rather than crash a child's session.
      }
    });
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setCompleted((prev) => {
      if (prev.has(lessonId)) return prev;
      const next = new Set(prev).add(lessonId);
      const state: ProgressState = { completedLessons: [...next] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return next;
    });
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      completedLessons: completed,
      martenitsi: completed.size,
      isLessonComplete: (lessonId: string) => completed.has(lessonId),
      completeLesson,
    }),
    [completed, completeLesson],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within a ProgressProvider");
  return ctx;
}
