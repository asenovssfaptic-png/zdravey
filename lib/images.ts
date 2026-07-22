import type { ImageSourcePropType } from "react-native";

// AUTO-GENERATED registry — painted art from scripts/generate-art.mjs.
// Components fall back to emoji/avatars for any id NOT listed here.
// Re-run the generator to add more; drop a hand-approved PNG at the same
// path to replace a placeholder with no code change.

export const VOCAB_IMAGES: Record<string, ImageSourcePropType> = {
  "fruit.apple": require("../assets/img/vocab/fruit_apple.jpg"),
  "fruit.banana": require("../assets/img/vocab/fruit_banana.jpg"),
  "fruit.grapes": require("../assets/img/vocab/fruit_grapes.jpg"),
  "fruit.pear": require("../assets/img/vocab/fruit_pear.jpg"),
  "animal.cat": require("../assets/img/vocab/animal_cat.jpg"),
  "animal.dog": require("../assets/img/vocab/animal_dog.jpg"),
  "animal.bird": require("../assets/img/vocab/animal_bird.jpg"),
  "animal.fish": require("../assets/img/vocab/animal_fish.jpg"),
  "fruit.orange": require("../assets/img/vocab/fruit_orange.jpg"),
  "fruit.strawberry": require("../assets/img/vocab/fruit_strawberry.jpg"),
  "fruit.watermelon": require("../assets/img/vocab/fruit_watermelon.jpg"),
  "fruit.lemon": require("../assets/img/vocab/fruit_lemon.jpg"),
  "animal.cow": require("../assets/img/vocab/animal_cow.jpg"),
  "animal.horse": require("../assets/img/vocab/animal_horse.jpg"),
  "animal.sheep": require("../assets/img/vocab/animal_sheep.jpg"),
  "animal.pig": require("../assets/img/vocab/animal_pig.jpg"),
  "family.mother": require("../assets/img/vocab/family_mother.jpg"),
  "family.father": require("../assets/img/vocab/family_father.jpg"),
  "family.grandma": require("../assets/img/vocab/family_grandma.jpg"),
  "family.grandpa": require("../assets/img/vocab/family_grandpa.jpg"),
  "body.hand": require("../assets/img/vocab/body_hand.jpg"),
  "body.eye": require("../assets/img/vocab/body_eye.jpg"),
  "body.nose": require("../assets/img/vocab/body_nose.jpg"),
  "body.mouth": require("../assets/img/vocab/body_mouth.jpg"),
  "place.sea": require("../assets/img/vocab/place_sea.jpg"),
  "place.mountain": require("../assets/img/vocab/place_mountain.jpg"),
  "place.river": require("../assets/img/vocab/place_river.jpg"),
  "place.forest": require("../assets/img/vocab/place_forest.jpg"),
  "place.city": require("../assets/img/vocab/place_city.jpg"),
  "place.village": require("../assets/img/vocab/place_village.jpg"),
};

export const CHARACTER_IMAGES: Record<string, ImageSourcePropType> = {
  "pizho": require("../assets/img/char/pizho.jpg"),
  "penda": require("../assets/img/char/penda.jpg"),
  "baba_marta": require("../assets/img/char/baba_marta.jpg"),
  "hitar_petar": require("../assets/img/char/hitar_petar.jpg"),
  "samodiva": require("../assets/img/char/samodiva.jpg"),
  "krali_marko": require("../assets/img/char/krali_marko.jpg"),
  "zmey": require("../assets/img/char/zmey.jpg"),
  "kuker": require("../assets/img/char/kuker.jpg"),
  "kuma_lisa": require("../assets/img/char/kuma_lisa.jpg"),
};

export function vocabImage(id?: string): ImageSourcePropType | null {
  return (id && VOCAB_IMAGES[id]) || null;
}

export function characterImage(id?: string): ImageSourcePropType | null {
  return (id && CHARACTER_IMAGES[id]) || null;
}
