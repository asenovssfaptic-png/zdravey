/* DictionaryList — My dictionary: every collected word of the day, in
 * collection order, each with its emoji, tappable Georgian word, translit
 * — meaning line and a 🔊. Append-only, like everything in treasures. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import AudioButton from "../ui/AudioButton";
import EmojiIcon from "../ui/EmojiIcon";
import KaText from "../ui/KaText";

const C = CURRICULUM;

export interface DictionaryListProps {
  /** collected word-of-the-day vocab ids, in collection order. */
  wordIds: string[];
}

export function DictionaryList({ wordIds }: DictionaryListProps): React.ReactElement {
  const words = wordIds.map((id) => C.vocab[id]).filter((w) => !!w);

  if (!words.length) {
    return (
      <Text style={styles.empty}>
        Collect the word of the day on the home screen to start your dictionary!
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {words.map((w) => (
        <View key={w.id} style={styles.row}>
          <EmojiIcon emoji={w.emoji} label={w.en} size={26} />
          <View style={styles.word}>
            <KaText text={w.ka} size={type.body} speak audioId={w.id} />
            <Text style={styles.sub}>
              {w.translit} — {w.en}
            </Text>
          </View>
          <AudioButton audioId={w.id} label={`Hear ${w.en}`} small />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  word: {
    flex: 1,
    gap: 2,
  },
  sub: {
    fontSize: type.body - 4,
    color: colors.inkSoft,
  },
  empty: {
    fontSize: type.body - 2,
    color: colors.inkSoft,
  },
});

export default DictionaryList;
