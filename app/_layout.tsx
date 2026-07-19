import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { Colors } from "@/constants/theme";
import { DirectionProvider } from "@/lib/direction";
import { ProgressProvider } from "@/lib/progress";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <DirectionProvider>
      <ProgressProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.white },
          }}
        />
      </ProgressProvider>
    </DirectionProvider>
  );
}
