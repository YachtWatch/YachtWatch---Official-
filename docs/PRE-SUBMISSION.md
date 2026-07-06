# YachtWatch — Pre-Submission Checklist (iOS App Store)

Working list toward the first App Store submission. Derived from a full-branch audit
(2026-07-01) plus follow-up verification. Status legend: ✅ done in code · 🔧 needs a
manual/archive/App Store Connect action · 🟡 recommended but not a hard blocker.

Branch for the code fixes: `fix/pre-submission-blockers`.

---

## Blockers — must be resolved before submitting

### ✅ 1. Real account deletion (Apple Guideline 5.1.1(v))
- **Was:** `deleteAccount()` deleted profile rows then signed out, leaving the Supabase
  Auth user alive — not a real deletion.
- **Now:** new Edge Function `supabase/functions/delete-account/index.ts` deletes the
  user's app data **and** the auth identity via the service role; `AuthContext.deleteAccount`
  invokes it and no longer silently signs out on failure (Settings shows an error instead).
- **Captain deletion:** a schema diagnostic (2026-07-02) found `vessels.captain_id` is the only
  other user reference and there are **no FK cascades**. So the function also deletes a captain's
  owned vessel(s) + the vessel-scoped rows (`schedules`, `vessel_members`, `join_requests`) — crew
  keep their accounts but lose access to that vessel. Crew deletion was already complete.
- 🔧 **Action required:** **deploy the function** — `supabase functions deploy delete-account`
  (needs the project linked; service-role/anon/url env are auto-injected at runtime).
  Then verify end-to-end: Settings → Delete Account → confirm the user is gone from
  Supabase Auth (dashboard → Authentication → Users), not just the `profiles` row.

### 🔧 2. Privacy manifest + App Store Connect "App Privacy" answers
- **✅ Code:** `ios/App/App/PrivacyInfo.xcprivacy` rewritten — removed the stale precise-location
  entry (weather feature is gone) and now declares Email, Name, User ID, Product Interaction
  (PostHog), Crash + Performance data (Sentry), and Other Data (passport/nationality/DOB).
- 🔧 **Action required:** set the matching answers in **App Store Connect → App Privacy** so they
  agree with the manifest, and confirm the public **Privacy Policy** covers PostHog analytics and
  Sentry diagnostics/replay. Manifest and ASC answers **must** match.

### 🔧 3. Production push-notification entitlement
- `ios/App/App/App.entitlements` shows `aps-environment = development`. Xcode normally flips this
  to `production` for an App Store distribution archive.
- 🔧 **Action required:** after archiving, confirm the Release build carries the **production** APS
  entitlement (Xcode → Organizer → export/validate). Do not submit a development push build.

### 🔧 4. Production env vars baked into the build
- `src/lib/supabase.ts` throws on launch if Supabase env vars are missing (no fallback) — a bad
  build **white-screens for every user**. See the "BEFORE BUILDING" section in `CLAUDE.md`.
- 🔧 **Action required:** build on a machine whose `.env` has the production `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` (project `oyukwinukknfgebibsqc`) plus the PostHog/Sentry/RevenueCat keys.
  Confirm the launch console logs `Supabase Client initialized` against `oyukwinukknfgebibsqc`.

---

## High / medium — strongly recommended

### ✅ Sentry session-replay PII masking
- `src/main.tsx` now sets `maskAllText`, `maskAllInputs`, `blockAllMedia` explicitly on
  `replayIntegration()` (replay is error-only). Disclose diagnostics/replay in the privacy answers (#2).

### ✅ Paywall placeholder copy
- `src/components/Paywall.tsx` "Premium Feature 1/2/3" replaced with real benefits.
  🟡 Founders: confirm the copy matches the store listing / subscription terms.

### 🟡 Subscription bypass is intentional — do NOT remove
- `src/context/SubscriptionContext.tsx` `FREE_UNTIL = 2026-09-01` forces `isSubscribed` and skips
  RevenueCat. This is the documented plan: **ship free, do not submit the IAP**, let Apple review
  the app as free (see DEVLOG 2026-06-23). Keep it. Just ensure no purchase UI is reachable during
  review and the IAP stays in "Prepare for Submission". Revisit before September.

### 🟡 Universal Links / crew-join flow
- Verified working: TestFlight universal links prepopulate the join code, and
  `https://join.yachtwatch.co/.well-known/apple-app-site-association` returns 200. iOS is fine —
  just smoke-test on a fresh reviewer device. Android app-links are unconfigured (moot for iOS-first).
- 🟡 The web landing page's App Store badge is fixed on branch `final-touches` (PR #3); the
  **Google Play badge there is still `href="#"`** — remove or wire up when Android ships.

### 🟡 Notification permission prompt timing
- `src/hooks/useNotifications.ts` requests notification permission automatically on mount. Apple
  prefers a contextual, user-initiated prompt. Not a hard blocker; consider a pre-permission screen.

### 🟡 Public source maps
- `vite.config.ts` emits public source maps. Prefer uploading hidden maps to Sentry and deleting
  them from the deployed bundle.

### 🟡 Test runner hygiene
- `npx vitest run` picks up Playwright e2e specs and fails 7 suites (21 unit tests pass). Separate
  the runners before relying on CI.

---

## App Review notes to submit with the build
> **Ready-to-paste version + the checks behind it: [`APP-REVIEW-NOTES.md`](APP-REVIEW-NOTES.md)** (addresses the v1.2 subscription/IAP rejections).
- Demo captain account (with a vessel + crew) and a demo crew account / valid join code.
- Steps: create vessel → add crew → generate schedule → publish.
- YachtWatch is for **watch scheduling / crew operations** — not navigation, safety, or emergency monitoring.
- Notifications are used for watch reminders and join approvals.
- App is submitted **free**; the subscription IAP is intentionally not included in this submission.
