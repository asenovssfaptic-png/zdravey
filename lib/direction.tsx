import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DEFAULT_DIRECTION, type Direction } from "@/content/content-model";

const STORAGE_KEY = "zdravey.direction";

interface DirectionContextValue {
  direction: Direction;
  setDirection: (direction: Direction) => void;
}

const DirectionContext = createContext<DirectionContextValue | null>(null);

export function DirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirectionState] = useState<Direction>(DEFAULT_DIRECTION);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setDirectionState(JSON.parse(raw));
    });
  }, []);

  function setDirection(next: Direction) {
    setDirectionState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const value = useMemo(() => ({ direction, setDirection }), [direction]);

  return <DirectionContext.Provider value={value}>{children}</DirectionContext.Provider>;
}

export function useDirection() {
  const ctx = useContext(DirectionContext);
  if (!ctx) throw new Error("useDirection must be used within a DirectionProvider");
  return ctx;
}
