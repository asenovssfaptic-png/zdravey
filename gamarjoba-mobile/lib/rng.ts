/* Injectable randomness — every shuffle/pick in the exercise engine takes
 * an optional Rng so tests can run deterministically. */

export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Deterministic mulberry32 PRNG for tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
