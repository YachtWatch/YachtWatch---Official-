# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (localhost:5173)

# Build & Type Check
npm run build        # tsc + vite build → dist/

# Lint (warnings treated as errors)
npm run lint         # ESLint on all .ts/.tsx files

# Testing
npx vitest           # Run unit tests (watch mode)
npx vitest run       # Run unit tests once (CI mode)
npx vitest run src/lib/scheduler.test.ts  # Run a single test file
npx playwright test  # Run e2e tests (requires dev server running)

# Native (requires Capacitor CLI)
npm run build && npx cap sync ios     # Build then sync to iOS
npm run build && npx cap sync android # Build then sync to Android
npx cap open ios     # Open Xcode
npx cap open android # Open Android Studio
```

## Architecture

**YachtWatch** is a yacht crew management app for captains and crew. Captains create vessels, generate watch schedules, manage crew applications, and export crew manifests. Crew members join via a vessel code, view their assigned watches, and check in. Targets web (Vercel) and native iOS/Android (Capacitor).

### Stack (exact versions from package.json)

| Layer | Package | Version |
|---|---|---|
| UI Framework | react / react-dom | ^18.2.0 |
| Language | typescript | ^5.3.3 |
| Bundler | vite + @vitejs/plugin-react | ^5.0.12 / ^4.2.1 |
| Routing | react-router-dom | ^6.21.3 |
| Database/Auth | @supabase/supabase-js | ^2.90.1 |
| Native bridge | @capacitor/core + cli | ^8.2.0 / ^8.1.0 |
| Subscriptions | @revenuecat/purchases-capacitor | ^12.3.0 |
| Styling | tailwindcss | ^3.4.1 |
| UI Primitives | @radix-ui/react-slot, lucide-react | ^1.2.4, ^0.309.0 |
| PDF export | jspdf + jspdf-autotable + html2canvas | ^4.1.0, ^5.0.7, ^1.4.1 |
| Testing | vitest + @playwright/test | ^4.0.17, ^1.58.2 |

**Capacitor plugins in use:** app, camera, filesystem, haptics, ios, android, keyboard, local-notifications, network, preferences, push-notifications, share, splash-screen, status-bar (all ^8.x).

### State Management

Three React Contexts drive the app — providers are nested in `src/App.tsx` in this order (outermost first): `ThemeProvider → ToastProvider → DataProvider → AuthProvider → SubscriptionProvider`.

1. **`AuthContext`** (`src/contexts/AuthContext.tsx`) — Supabase auth session, user profile (id, firstName, lastName, email, role, vesselId, nationality, passportNumber, dateOfBirth, reminder1/2). Caches profile in localStorage for instant load; runs parallel DB queries on login to minimise cold-start.
2. **`DataContext`** (`src/contexts/DataContext.tsx`, ~1 032 lines) — All Supabase CRUD: vessels, crew, schedules, join requests, check-ins. Realtime subscriptions live here. This is the largest file in the project.
3. **`SubscriptionContext`** (`src/context/SubscriptionContext.tsx`) — RevenueCat state: subscription status, offerings, purchase/restore flows. Note the singular `context/` path (not `contexts/`).

> ⚠️ Two context folders exist. `AuthContext` and `DataContext` live in `src/contexts/` (plural). `SubscriptionContext` lives in `src/context/` (singular). Match the existing folder when adding new contexts — do NOT consolidate without a migration. This is a known wart, scheduled for cleanup.

### Routing & Role-Based Access

`src/App.tsx` defines all routes. `ProtectedRoute` guards auth; role is checked via `allowedRoles` prop.

```
/                     → RootRedirect (LandingPage on web; /dashboard or /auth/login on native)
/auth/login|signup|forgot-password|reset-password|confirm
/dashboard            → DashboardIndex (redirects captain → /dashboard/captain, crew → /dashboard/crew)
/dashboard/captain                        (captain only)
/dashboard/captain/generate-schedule      (captain only)
/dashboard/captain/export-crew            (captain only)
/dashboard/crew                           (crew only)
/profile | /settings | /subscription | /diagnostics  (any authenticated user)
```

All pages except `LandingPage` and `LoginPage` are `React.lazy()` code-split.

### Folder Conventions

```
src/
├─ assets/                  Static assets (images, icons)
├─ components/
│  ├─ ui/                   Radix-based primitives (button, card, dialog, input, switch, ios-picker, Toast, ProfileDropdown, BottomTabs)
│  ├─ subscription/         CustomPaywall.tsx
│  ├─ ScheduleMatrixView.tsx
│  ├─ SailboatLoader.tsx    Suspense fallback — the custom sailboat animation
│  ├─ BottomTabs.tsx        Tab nav: dashboard | schedule | crew
│  ├─ ProtectedRoute.tsx    Auth + role guard
│  ├─ NotificationListener.tsx  Realtime listener (mounted globally in App.tsx)
│  ├─ OfflineBanner.tsx
│  ├─ TimezoneWarningBanner.tsx
│  └─ ...
├─ context/                 SubscriptionContext.tsx  ← singular, different from contexts/
├─ contexts/                AuthContext.tsx, DataContext.tsx
├─ hooks/
│  ├─ useNotifications.ts   Supabase Realtime: profile, schedule, join-request changes
│  └─ useWatchLogic.ts      Current/next watch slot, time remaining, check-in status
├─ lib/
│  ├─ supabase.ts           Supabase client (reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
│  ├─ scheduler.ts          Watch schedule generation algorithm (has unit tests)
│  ├─ time-utils.ts         Timezone-aware helpers (has unit tests)
│  ├─ audio-utils.ts
│  ├─ watchLogic.ts         Watch-logic utilities (distinct from the hook)
│  └─ utils.ts              cn() helper (clsx + tailwind-merge)
├─ pages/
│  ├─ auth/                 LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage
│  ├─ captain/              CaptainDashboard, CaptainScheduleView, CaptainCrewView,
│  │                        ScheduleGeneratorWizard, CrewExportWizard
│  └─ crew/                 CrewDashboard, CrewScheduleView, CrewListView
├─ services/
│  ├─ NotificationService.ts   Capacitor LocalNotifications wrapper (watch reminders)
│  └─ PrintService.ts          jspdf + html2canvas PDF export (crew manifests, A4 landscape)
```

### Database

Supabase PostgreSQL with Row-Level Security. Key tables:
- `profiles` — extends Supabase auth users (role, vessel_id, nationality, passport_number, date_of_birth, reminder1/2)
- `vessels` — yacht data with `join_code` for crew invitations
- `vessel_members` — crew-vessel relationships (`watch_leader` flag)
- `join_requests` — status: pending | approved | rejected
- `schedules` — watch slots array (anchor/navigation/dock watch types)

Migration scripts live in `scripts/` (SQL files). RLS policies ensure users only access their vessel's data.

### Platform Detection

Use `Capacitor.isNativePlatform()` to branch between native and web behaviour. **Native-only features:** RevenueCat purchases, LocalNotifications, StatusBar styling, SplashScreen control.

### Environment Variables

Vite exposes variables with prefixes: `VITE_`, `SUPABASE_`, `REVENUECAT_`, `APP_URL`.

Required:
- `VITE_SUPABASE_URL` / `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
- `REVENUECAT_API_KEY_APPLE` / `REVENUECAT_API_KEY_GOOGLE`

## Brand & Styling

- **Primary colour:** `#1B2A6B` (navy) — used as the splash screen background, primary buttons, and throughout the maritime palette
- **SplashScreen config:** `backgroundColor: '#1B2A6B'`, `launchShowDuration: 1000`, `launchAutoHide: false` (manually hidden in code)
- **Tailwind:** dark mode via `class` strategy; CSS-variable-based design tokens in `index.css`; custom `maritime-gradient` and `maritime-dark` background images
- **Icons:** `lucide-react`; anchor logo uses the `<Anchor>` icon from `lucide-react` inline (no custom SVG file in `src/assets/`) — see `LoginPage.tsx` and `LandingPage.tsx`
- **Fonts:** Tailwind default system font stack (`font-sans` → `ui-sans-serif, system-ui, -apple-system, …`); no custom font loaded — confirmed: no `@font-face` in `src/index.css`, no Google Fonts link in `index.html`, no `fontFamily` override in `tailwind.config.js`
- **App ID:** `com.yachtwatch.ios`

## App Identifiers

- **iOS bundle ID:** `com.yachtwatch.ios`
- **App Store ID:** 6760187387 (YachtWatch - Crew Manager)
- **Android package:** `com.yachtwatch.android` (from `android/app/build.gradle`)
- **Deep link scheme:** `yachtwatch://`
- **Universal/App Links:** `join.yachtwatch.co/<CODE>`
- **Web domain:** `yachtwatch.co`

## Key Gotchas

1. **Timezone handling** — `src/lib/time-utils.ts` provides timezone-aware helpers. `TimezoneWarningBanner` warns when the user's local timezone differs from the vessel's configured timezone. Always use the vessel timezone when displaying watch times, not `new Date()` local time.

2. **Deep linking** — Crew join flow supports the custom scheme `yachtwatch://join/[CODE]` and web URL `/join/[CODE]`. The `CrewDashboard` registers an app URL open listener via `@capacitor/app` to handle this on native. Do not change the route shape without updating both.

3. **RevenueCat** — Only initialised on `Capacitor.isNativePlatform()`. Calling RevenueCat APIs on web will throw. Always guard with `isNativePlatform()` before any `Purchases.*` call.

4. **SplashScreen** — `launchAutoHide: false` means the splash will stay visible forever if `SplashScreen.hide()` is not called explicitly. It is called inside `AuthContext` after the initial auth state resolves.

5. **PDF export (A4 landscape)** — `PrintService.ts` uses `jspdf-autotable` to generate the crew manifest in A4 landscape format. `html2canvas` is used for any chart/image captures. These run in-browser; they do not work in SSR or Node.

6. **DataContext is massive** — `DataContext.tsx` is ~1 032 lines. When editing, be careful of subscription cleanup — each Supabase `channel.subscribe()` must have a corresponding `supabase.removeChannel()` in the cleanup effect.

7. **`context/` vs `contexts/`** — There are two separate directories. `AuthContext` and `DataContext` live in `contexts/` (plural); `SubscriptionContext` lives in `context/` (singular). This is intentional (different authors/times), not a typo.

8. **ESLint strictness** — `npm run lint` treats warnings as errors (`--max-warnings 0`). `@typescript-eslint/no-explicit-any` is turned off project-wide, but `noUnusedLocals` and `noUnusedParameters` are enforced by TypeScript.

9. **DataContext growth** — `DataContext.tsx` is ~44 KB. Prefer extracting new queries into hooks under `src/hooks/` rather than growing the context further. Keep subscription cleanup paired: every `channel.subscribe()` needs a `supabase.removeChannel()` in the cleanup effect.

10. **Crew-list PDF column widths** — `PrintService.ts` generates A4 landscape output with hand-tuned column widths. Don't add columns without re-testing the full PDF layout in-browser.

## Don't Touch (Auto-generated / Fragile)

```
ios/App/Pods/          # CocoaPods — regenerated by pod install
ios/App/App.xcworkspace/
android/build/         # Gradle build output
android/.gradle/
dist/                  # Vite build output (gitignored: yes)
ios/App/CapApp-SPM/Package.resolved  # SPM cache — regenerated by cap sync
node_modules/
```

Do not hand-edit `ios/App/capacitor.config.json` — it is auto-generated by `npx cap sync` from `capacitor.config.ts`.

## Deployment

- **Web:** Vercel. `vercel.json` rewrites all routes to `/index.html` for SPA routing. Auto-deploy branch: TODO: confirm in Vercel dashboard (`vercel.json` has no `git` config).
- **iOS:** Build with `npm run build && npx cap sync ios`, then open Xcode (`npx cap open ios`) and archive/distribute from there. Bundle ID: `com.yachtwatch.ios`.
- **Android:** Build with `npm run build && npx cap sync android`, then open Android Studio (`npx cap open android`) and generate a signed APK/AAB.
- There is no CI/CD pipeline for native builds — releases are manual from Xcode / Android Studio.
