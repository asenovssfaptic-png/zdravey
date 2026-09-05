/* Root layout — gesture root, store hydration (splash held until the
 * save is loaded), toasts, and the plain stack (no tab bar: Home is the
 * hub, parity with the web app). After hydration the day is recorded so
 * home's "Day N" hero and the daily gift always agree. */

import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput } from "react-native";

import * as SplashScreen from "expo-splash-screen";

import { colors } from "../constants/theme";
import { ToastProvider } from "../lib/announce";
import { hydrate, recordTodayPlayed } from "../lib/store";

/* Cap OS font scaling: type still grows for accessibility (up to 1.6x)
 * but fixed-size tiles/slots never clip at the iOS 3x sizes. */
type TextWithDefaults = typeof Text & { defaultProps?: { maxFontSizeMultiplier?: number } };
(Text as TextWithDefaults).defaultProps = {
  ...(Text as TextWithDefaults).defaultProps,
  maxFontSizeMultiplier: 1.6,
};
(TextInput as TextWithDefaults).defaultProps = {
  ...(TextInput as TextWithDefaults).defaultProps,
  maxFontSizeMultiplier: 1.6,
};

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden (fast refresh) */
});

export default function RootLayout(): React.ReactElement | null {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    hydrate()
      .then(() => {
        recordTodayPlayed(); // before first render: "Day N" must be current
      })
      .finally(() => {
        if (alive) setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
          <StatusBar style="dark" />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
