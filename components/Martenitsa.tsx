import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";

// The martenitsa — the app's reward symbol. Two yarn dolls, Pizho (white) and
// Penda (red), joined by a twisted red-and-white cord. Drawn with Views so it
// scales crisply at any size and needs no asset. Replaces the old 🧿, which
// was a blue evil-eye bead — wrong colour and wrong charm for a martenitsa.
export function Martenitsa({ size = 40 }: { size?: number }) {
  const ball = size * 0.44;
  const head = ball * 0.5;
  const cord = size * 0.14;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} accessibilityElementsHidden>
      {/* twisted cord across the top */}
      <View style={[styles.cordRow, { height: cord }]}>
        <View style={[styles.cord, { backgroundColor: Colors.martenitsaWhite, height: cord * 0.5 }]} />
        <View style={[styles.cord, { backgroundColor: Colors.red, height: cord * 0.5 }]} />
      </View>
      <View style={styles.dolls}>
        <Doll body={Colors.martenitsaWhite} outline={Colors.red} ball={ball} head={head} />
        <Doll body={Colors.red} outline={Colors.darkRed} ball={ball} head={head} />
      </View>
    </View>
  );
}

function Doll({ body, outline, ball, head }: { body: string; outline: string; ball: number; head: number }) {
  return (
    <View style={styles.doll}>
      {/* head */}
      <View
        style={{
          width: head,
          height: head,
          borderRadius: head / 2,
          backgroundColor: body,
          borderWidth: 1,
          borderColor: outline,
          marginBottom: -head * 0.25,
          zIndex: 1,
        }}
      />
      {/* body / tassel */}
      <View
        style={{
          width: ball,
          height: ball,
          borderRadius: ball / 2,
          backgroundColor: body,
          borderWidth: 1,
          borderColor: outline,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  cordRow: {
    flexDirection: "row",
    width: "70%",
    borderRadius: 999,
    overflow: "hidden",
  },
  cord: {
    flex: 1,
  },
  dolls: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  doll: {
    alignItems: "center",
  },
});
