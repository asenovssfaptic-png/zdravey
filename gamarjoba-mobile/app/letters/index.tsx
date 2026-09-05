/* Letters path — 6 groups × meet / write / read / exam nodes.
 * Port of the web renderLettersPath: every node is always tappable;
 * done/next are highlights, never locks. */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import BackLink from "../../components/ui/BackLink";
import KaText from "../../components/ui/KaText";
import PathNode from "../../components/ui/PathNode";
import Screen from "../../components/ui/Screen";
import StarRow from "../../components/ui/StarRow";
import { colors, minTarget, spacing, type } from "../../constants/theme";
import { CURRICULUM } from "../../content/generated/curriculum";
import { alphaGroupById, recipeQuestionCount } from "../../lib/exercise-engine";
import { useProgress } from "../../lib/store";

const C = CURRICULUM;

export default function LettersPathScreen(): React.ReactElement {
  const progress = useProgress();

  // the first not-done node gets the "Up next" pill — a highlight, never a lock
  const seq: { key: string; done: boolean }[] = [];
  C.lettersPath.groups.forEach((g) => {
    seq.push({ key: `meet-${g.groupId}`, done: progress.lettersMeetDone.includes(g.groupId) });
    seq.push({ key: `trace-${g.groupId}`, done: progress.lettersTraceDone.includes(g.groupId) });
    if (g.steps.read) {
      seq.push({ key: `read-${g.groupId}`, done: progress.lettersReadDone.includes(g.groupId) });
    }
    seq.push({ key: `exam-${g.groupId}`, done: (progress.lettersExamStars[g.groupId] ?? 0) >= 1 });
  });
  const nextKey = seq.find((s) => !s.done)?.key ?? null;

  return (
    <Screen>
      <BackLink label="Home" href="/" />
      <View style={styles.titleRow}>
        <KaText text={C.strings.letters} size={type.h1} />
        <Text style={styles.h1}> · Letters</Text>
      </View>
      <Text style={styles.intro}>
        Meet the letters, trace them, then take a friendly exam — group by group, easy to hard.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Browse all letters"
        onPress={() => router.push("/alphabet" as never)}
        style={styles.browse}
      >
        <Text style={styles.browseText}>Browse all letters →</Text>
      </Pressable>

      {C.lettersPath.groups.map((g) => {
        const group = alphaGroupById(g.groupId);
        if (!group) return null;
        const meetDone = progress.lettersMeetDone.includes(g.groupId);
        const traceDone = progress.lettersTraceDone.includes(g.groupId);
        const readDone = progress.lettersReadDone.includes(g.groupId);
        const examStars = progress.lettersExamStars[g.groupId] ?? 0;
        const examDone = examStars >= 1;
        const groupTag = `group ${g.order}, ${group.title}`;
        const meetNext = nextKey === `meet-${g.groupId}`;
        const traceNext = nextKey === `trace-${g.groupId}`;
        const readNext = nextKey === `read-${g.groupId}`;
        const examNext = nextKey === `exam-${g.groupId}`;
        const examQs = recipeQuestionCount(g.steps.exam.recipe);
        return (
          <React.Fragment key={g.groupId}>
            <Text style={styles.groupTitle}>
              {g.order} · {group.title}
            </Text>
            <PathNode
              face={<KaText text={group.letters[0].ka} size={20} />}
              title={g.steps.meet.title}
              sub={g.steps.meet.sub ?? `${group.letters.length} letters`}
              done={meetDone}
              next={meetNext}
              onPress={() => router.push(`/letters/${g.groupId}/meet` as never)}
              accessibilityLabel={
                `${g.steps.meet.title} — ${groupTag}` +
                (meetDone ? ", completed" : meetNext ? ", up next" : "")
              }
            />
            <PathNode
              face="✍️"
              title={g.steps.write.title}
              sub={g.steps.write.sub ?? "Trace each letter"}
              done={traceDone}
              next={traceNext}
              onPress={() => router.push(`/letters/${g.groupId}/trace` as never)}
              accessibilityLabel={
                `${g.steps.write.title} — ${groupTag}` +
                (traceDone ? ", completed" : traceNext ? ", up next" : "")
              }
            />
            {g.steps.read ? (
              <PathNode
                face="📖"
                title={g.steps.read.title}
                sub={g.steps.read.sub ?? "Syllables & tiny words"}
                done={readDone}
                next={readNext}
                onPress={() => router.push(`/letters/${g.groupId}/read` as never)}
                accessibilityLabel={
                  `${g.steps.read.title} — ${groupTag}` +
                  (readDone ? ", completed" : readNext ? ", up next" : "")
                }
              />
            ) : null}
            <PathNode
              face="🏅"
              title={g.steps.exam.title}
              sub={examStars > 0 ? <StarRow earned={examStars} /> : `About ${examQs} questions`}
              done={examDone}
              next={examNext}
              onPress={() => router.push(`/letters/${g.groupId}/exam` as never)}
              accessibilityLabel={
                `${g.steps.exam.title} — ${groupTag}` +
                (examDone ? `, completed, best ${examStars} of 3 stars` : examNext ? ", up next" : "")
              }
            />
          </React.Fragment>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "baseline" },
  h1: { fontSize: type.h1, fontWeight: type.h1Weight, color: colors.ink },
  intro: { fontSize: type.body, color: colors.inkSoft },
  browse: {
    minHeight: minTarget,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
  },
  browseText: { fontSize: type.body, fontWeight: "700", color: colors.accentDeep },
  groupTitle: {
    fontSize: type.h2,
    fontWeight: type.h2Weight,
    color: colors.ink,
    marginTop: spacing.sm,
  },
});
