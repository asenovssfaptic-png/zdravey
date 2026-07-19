import type { CharacterMeta } from "@/characters/characters";
import type { Exercise } from "@/content/content-model";

// Every exercise component takes the same shape: the exercise data, the
// unit's host character (for the instruction bubble), and a callback to
// advance the lesson. Exercises with a signature character (say_it -> Kuker,
// odd_one_out -> Hitar Petar) override `host` internally.
export interface ExerciseProps {
  exercise: Exercise;
  host: CharacterMeta;
  onDone: () => void;
}

// How long a resolved answer stays on screen before auto-advancing.
export const REVEAL_DELAY_MS = 1400;
