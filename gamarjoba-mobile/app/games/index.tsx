/* Games hub — 3 cozy games, each entry showing its lifetime counter
 * (rounds only ever go up). Port of the web renderGames. */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import BackLink from "../../components/ui/BackLink";
import EntryCard from "../../components/ui/EntryCard";
import KaText from "../../components/ui/KaText";
import Screen from "../../components/ui/Screen";
import { colors, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { useProgress } from "../../lib/store";

const C = CURRICULUM;

export default function GamesScreen(): React.ReactElement {
  const progress = useProgress();
  const rounds = (id: string) => progress.gameRounds[id] ?? 0;
  const g = C.games;

  return (
    <Screen>
      <BackLink label="Home" href="/" />
      <View style={styles.titleRow}>
        <KaText text={C.strings.games} size={type.h1} speak />
        <Text style={styles.h1}> · Games</Text>
      </View>
      <Text style={styles.intro}>
        Just for fun — everything you find is a little extra XP. Nothing to lose, ever.
      </Text>
      <EntryCard
        emoji={g.findHome.emoji}
        label={g.findHome.title}
        sub={`You’ve found ${rounds("find-home")} things`}
        onPress={() => router.push("/games/find-home" as never)}
        accessibilityLabel={`${g.findHome.title} — you’ve found ${rounds("find-home")} things`}
      />
      <EntryCard
        emoji={g.market.emoji}
        label={g.market.title}
        sub={`${rounds("market")} shopping lists done`}
        onPress={() => router.push("/games/market" as never)}
        accessibilityLabel={`${g.market.title} — ${rounds("market")} shopping lists done`}
      />
      <EntryCard
        emoji={g.safari.emoji}
        label={g.safari.title}
        sub={`${rounds("letter-safari")} safari rounds`}
        onPress={() => router.push("/games/letter-safari" as never)}
        accessibilityLabel={`${g.safari.title} — ${rounds("letter-safari")} safari rounds`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "baseline" },
  h1: { fontSize: type.h1, fontWeight: type.h1Weight, color: colors.ink },
  intro: { fontSize: type.body, color: colors.inkSoft },
});
