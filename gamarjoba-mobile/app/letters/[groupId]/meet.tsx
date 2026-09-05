/* Meet the letters — swipeable deck with auto letter audio + Finish.
 * Port of the web renderMeet: Finish records the group (append-only),
 * +15 XP first time / +5 after, Georgian praise, toast, back to Letters. */

import React from "react";
import { StyleSheet, Text } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import MeetDeck from "../../../components/letters/MeetDeck";
import BackLink from "../../../components/ui/BackLink";
import Screen from "../../../components/ui/Screen";
import { colors, type } from "../../../constants/theme";
import { useToast } from "../../../lib/announce";
import { playPraise, stopAll } from "../../../lib/audio";
import { alphaGroupById } from "../../../lib/exercise-engine";
import { addXp, pushOnce } from "../../../lib/store";

export default function MeetScreen(): React.ReactElement {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = alphaGroupById(String(groupId));
  const { toast } = useToast();

  if (!group) return <Redirect href="/letters" />;

  const finish = () => {
    stopAll();
    const first = pushOnce("lettersMeetDone", String(groupId));
    addXp(first ? 15 : 5);
    playPraise();
    toast("Group done! 🎉", { keep: true });
    if (router.canGoBack()) router.back();
    else router.replace("/letters" as never);
  };

  return (
    <Screen>
      <BackLink label="Letters" href="/letters" />
      <Text style={styles.h1} accessibilityRole="header">
        {group.title} · Meet the letters
      </Text>
      <MeetDeck group={group} onFinish={finish} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: type.h1,
    fontWeight: type.h1Weight,
    color: colors.ink,
  },
});
