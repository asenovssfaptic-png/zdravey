import { useEffect, useState } from "react";

// Fisher-Yates shuffle. Used to randomize tile order so the correct answer
// isn't always in the same spot.
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Shuffling during render is non-deterministic, which breaks static rendering:
// the server pre-renders one order and the client hydrates with another,
// causing a hydration mismatch. This hook renders the deterministic input
// order first (so SSR and the first client render agree), then shuffles once
// after mount — client-only, no mismatch.
export function useShuffled<T>(items: T[]): T[] {
  const [order, setOrder] = useState<T[]>(items);
  useEffect(() => {
    setOrder(shuffled(items));
  }, [items]);
  return order;
}
