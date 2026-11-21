# UniRide UniStay — mobile

A blank, reusable **Expo (SDK 54) + Expo Router + TypeScript** starter. It contains no
product/business logic: copy it, rename it, and build the next app on top.

## Requirements

- Node.js 20+
- npm (or yarn/pnpm)
- Expo Go on a device, or an Android/iOS emulator

## Run

```bash
npm install
npm start          # then press a / i / w
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
```

## Structure

```
app/                 file-based routes (expo-router)
  _layout.tsx        providers + navigation stack
  index.tsx          starter home screen
  +not-found.tsx     unknown-route screen
components/          Screen (safe-area shell) + Button primitives
constants/theme.ts   colours, spacing, radius, font sizes (light + dark)
hooks/use-theme.ts   system light/dark tokens
assets/images/       placeholder icons — replace with real artwork
```

Path alias `@/*` maps to the project root, e.g. `import { Button } from '@/components/button'`.

## Make it your own

1. Rename the identity in `app.json`:
   `name`, `slug`, `scheme`, `ios.bundleIdentifier`, `android.package`.
2. Rename in `package.json`: `name`.
3. Replace `assets/images/*.png` with real artwork (same file names keeps `app.json` valid).
4. Adjust `constants/theme.ts` first — every component reads its colours/spacing from there.
5. Add new screens as files under `app/`; nested folders become nested routes.
6. Native folders (`android/`, `ios/`) are intentionally absent. Generate them when needed:

```bash
npx expo prebuild
```

## Notes

- `metro.config.js` keeps Metro caches inside the project (`.metro-cache`,
  `.metro-file-map-cache`) instead of the OS temp folder — handy on Windows machines where
  the temp path is shared or restricted.
- `eas.json` is a minimal EAS Build profile set. Run `npx eas init` to attach a project.
- `.env` files are git-ignored; expose values through `app.json` → `extra` or `expo-constants`.
