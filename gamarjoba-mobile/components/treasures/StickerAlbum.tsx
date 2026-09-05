/* StickerAlbum — the 30-slot album grid. Owned stickers show emoji +
 * name on a success tile; unowned slots stay a friendly dashed "?" (a
 * promise, never a taunt — Baba grants them in order, so the album
 * always completes). */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";

const C = CURRICULUM;

export interface StickerAlbumProps {
  ownedIds: string[];
}

export function StickerAlbum({ ownedIds }: StickerAlbumProps): React.ReactElement {
  return (
    <View style={styles.grid} accessibilityLabel="Sticker album" accessibilityRole="none">
      {(C.stickers ?? []).map((st) => {
        const owned = ownedIds.includes(st.id);
        return (
          <View
            key={st.id}
            style={[styles.tile, owned && styles.tileOwned]}
            accessibilityRole="image"
            accessibilityLabel={owned ? `Sticker: ${st.name}` : "Sticker not collected yet"}
          >
            <Text style={owned ? styles.emoji : styles.emojiUnknown} accessibilityElementsHidden>
              {owned ? st.emoji : "?"}
            </Text>
            <Text style={styles.name} accessibilityElementsHidden>
              {owned ? st.name : "· · ·"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md - 2,
    marginTop: spacing.sm,
  },
  tile: {
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  tileOwned: {
    backgroundColor: colors.successTint,
    borderStyle: "solid",
    borderColor: colors.success,
  },
  emoji: {
    fontSize: 28,
  },
  emojiUnknown: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.inkSoft,
  },
  name: {
    fontSize: type.body - 6,
    fontWeight: "700",
    color: colors.inkSoft,
    textAlign: "center",
  },
});

export default StickerAlbum;
