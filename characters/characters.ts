// Character metadata: one job each, used sparingly. Emoji stand in for
// real illustrations until character art is commissioned.

import type { CharacterId, LangCode } from "@/content/content-model";

export interface CharacterMeta {
  id: CharacterId;
  name: Record<LangCode, string>;
  emoji: string;
  color: string;
}

export const CHARACTERS: Record<CharacterId, CharacterMeta> = {
  pizho: { id: "pizho", name: { bg: "Пижо", en: "Pizho" }, emoji: "🤍", color: "#F1EFE8" },
  penda: { id: "penda", name: { bg: "Пенда", en: "Penda" }, emoji: "❤️", color: "#E24B4A" },
  baba_marta: { id: "baba_marta", name: { bg: "Баба Марта", en: "Baba Marta" }, emoji: "👵", color: "#E24B4A" },
  hitar_petar: { id: "hitar_petar", name: { bg: "Хитър Петър", en: "Hitar Petar" }, emoji: "🎩", color: "#F2C14E" },
  samodiva: { id: "samodiva", name: { bg: "Самодива", en: "Samodiva" }, emoji: "🌿", color: "#5FA777" },
  krali_marko: { id: "krali_marko", name: { bg: "Крали Марко", en: "Krali Marko" }, emoji: "🗡️", color: "#A32D2D" },
  zmey: { id: "zmey", name: { bg: "Змей", en: "Zmey" }, emoji: "🐉", color: "#5FA777" },
  kuker: { id: "kuker", name: { bg: "Кукер", en: "Kuker" }, emoji: "🔔", color: "#F2C14E" },
  kuma_lisa: { id: "kuma_lisa", name: { bg: "Кума Лиса", en: "Kuma Lisa" }, emoji: "🦊", color: "#F2C14E" },
};
