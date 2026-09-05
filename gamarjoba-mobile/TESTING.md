# Testing Gamarjoba! (mobile)

The native iOS + Android app for **Gamarjoba!** — Expo SDK 57 / React
Native 0.86 / expo-router. Fully offline: all 340 audio clips, the
curriculum, stroke data and SFX are bundled; there is no backend, no
account, no analytics, no network call at runtime.

## 1. Prerequisites

- **Node 22** and npm.
- `cd gamarjoba-mobile && npm install`
- The generated content (`content/generated/*`) and the copied mp3s
  (`assets/audio/`) **are committed**, so the app runs immediately.
  Re-run the content bridge **only after editing the web app**
  (`../gamarjoba/data.js`, `audio-map.js`, `strokes.js`, or the mp3s):

  ```
  npm run build:content   # validates + regenerates content & assets
  npm run build:icon      # regenerates the borjgali icons (rarely needed)
  ```

  The web app at `../gamarjoba` is the single source of truth — never edit
  files under `content/generated/` by hand.

## 2. Testing on your phone with Expo Go

The app uses only Expo-Go-compatible modules (no custom native code), so
the whole app runs in Expo Go:

1. Install **Expo Go** from the App Store / Play Store.
2. On your machine: `cd gamarjoba-mobile && npx expo start`
3. Scan the QR code:
   - **iPhone**: with the Camera app → opens in Expo Go.
   - **Android**: with the scanner inside Expo Go.
4. Phone and computer must be on the **same Wi-Fi**. If the connection
   fails (hotel/office networks), restart with `npx expo start --tunnel`.

## 3. What to check on a real device

- **Audio through the silent switch** (iPhone): words must still play with
  the mute switch on (`playsInSilentMode` is set — verify it).
- **Tracing feel**: `Letters → Write it` — drawing must be smooth, must
  NOT scroll the page, and "▶ Watch it draw" must animate stroke order.
- **Big targets**: every tappable control is at least 48dp — try it with a
  child's aim, not yours.
- **Talkback / VoiceOver**: every control announces a label; answers are
  announced after each tap.
- **Positive-only**: get answers wrong on purpose — the app must only ever
  reveal + speak the right answer, re-queue a gentle retry, and still
  award ≥1 star on exams. No hearts, timers, locks, or failure screens.
- **Offline**: enable airplane mode — everything must keep working.

## 4. Store builds with EAS

One-time setup on your machine:

```
npm i -g eas-cli
eas login
cd gamarjoba-mobile
eas init        # links the app to your Expo account (keeps slug "gamarjoba")
```

**Internal test builds** (installable via QR / TestFlight):

```
eas build --profile preview --platform android   # .apk for direct install
eas build --profile preview --platform ios       # requires an Apple Developer account
```

**Production + submission:**

```
eas build --profile production --platform android
eas build --profile production --platform ios
eas submit -p ios        # → App Store Connect / TestFlight
eas submit -p android    # → Play Console (internal testing track first)
```

Store-listing notes:

- Category: **Education / Kids**. Age rating: suitable for all ages.
- Privacy questionnaires: **no data collected** — the app stores progress
  on-device only (AsyncStorage), has no accounts, ads, trackers, or
  network access. Answer "No" to every data-collection question.
- The bundle ids are configured in `app.json` (`ge.gamarjoba.app`);
  `production` builds auto-increment the version (`autoIncrement`).

## 5. Local checks (CI-equivalent)

```
npm run typecheck    # tsc --noEmit — strict, no errors
npm test             # jest: content integrity, exercise engine, store
npm run lint         # expo lint — no errors
npm run build:web    # static web export to dist/ (react-native-web)
```

The web export is a handy smoke test: `npx -y serve -s dist` and click
through the app in a browser (audio needs one user gesture first).
