# YachtWatch — Dev Log

Running history of features and fixes that **shipped** (merged/pushed to main). Newest first, append-only.
Both founders' Claudes maintain this via the `/document-changes` skill. Entries are written so the *other* founder's Claude can understand the work with zero prior context.

For features that are **built but parked** (not yet merged), see [ROADMAP.md](ROADMAP.md).

---

## 2026-07-23 — Fix: captain's dashboard showing "no active watch" for a live schedule + sticky header scrolling away

- **Author:** Josh
- **Commit/PR:** pending push to `main` (covers uncommitted work as of this entry)
- **Branch:** main
- **What changed:**
  1. **Schedule generation date bug** (`src/pages/captain/ScheduleGeneratorWizard.tsx`, `generateSchedule()`): the date-picker's start/end date (a `"YYYY-MM-DD"` string) was parsed with raw `new Date(startDate)`. JS parses date-only strings as **UTC midnight**, not local midnight. For any captain in a timezone behind UTC, `.setHours()` then builds the whole schedule starting a full calendar day earlier than what was actually picked — enough to push "now" outside every generated slot. Symptom reported live from TestFlight: Navigation (24h rotation) schedule existed and looked correct in the Schedule tab, but the Dashboard tab's "Current Watch Status" / "On Watch Now" cards persistently showed "No active watch" / "No upcoming watches", even after reload. Fixed by switching to the file's existing `parseDateStr(s) => new Date(s + 'T00:00:00')` helper (forces local-midnight parsing), which was already used for the calendar-picker display but not for the actual generation logic. **Note:** this only fixes schedules generated going forward — any schedule already saved to the DB before this fix has the wrong timestamps baked in and must be regenerated (delete + recreate) to self-correct.
  2. **Sticky header breaking app-wide** (`src/index.css`): `html, body { overflow-x: hidden; }` triggered the CSS overflow interop rule that forces `overflow-y: auto` on both elements. Per spec, `body`'s overflow only propagates to become the single page-level scroller when `html` is left at `visible` — since `html` also had `overflow-x: hidden` here, that propagation didn't happen, so `html` and `body` became two independent, competing scroll containers. `position: sticky` headers anchored to the wrong one and never appeared to stick. Confirmed with a Playwright check: header's computed `position` was `sticky`, but it moved by the exact scroll delta (i.e. behaved as `static`). Fix: removed the rule from `html`, kept it only on `body` (its intended purpose — preventing horizontal overscroll — is unaffected). Also normalized `src/pages/captain/CaptainDashboard.tsx` and `src/pages/crew/CrewDashboard.tsx` (2 header instances) from `relative` to `sticky top-0`, matching the pattern already used everywhere else (`SettingsPage.tsx`, `ProfilePage.tsx`, etc.) — those two dashboards were the only pages that hadn't been updated to the sticky pattern.
- **Why:** Both bugs were found live on TestFlight while testing ahead of an App Store Connect submission — the schedule bug would have made the captain dashboard look broken/empty for any real (non-UTC) captain despite a valid schedule existing, and the header bug affected navigation on every scrollable page in the native app.
- **Key files:**
  - `src/pages/captain/ScheduleGeneratorWizard.tsx` — `generateSchedule()` start/end date parsing + the date-range validation check now use `parseDateStr`.
  - `src/index.css` — `overflow-x: hidden` rule scoped to `body` only, not `html`.
  - `src/pages/captain/CaptainDashboard.tsx`, `src/pages/crew/CrewDashboard.tsx` — header `relative` → `sticky top-0` (3 instances total).
- **How to verify:** Generate a fresh Navigation schedule as a captain in a UTC-behind timezone (or any timezone) — the dashboard should immediately show an active/upcoming watch matching the picked date. Scroll any page with a header (Dashboard, Schedule, Crew tabs, Settings, Profile, etc.) — the YachtWatch logo + hamburger/profile menu should stay pinned to the top while only content below scrolls. Verified locally with `npm run dev` against production Supabase data + a Playwright script measuring header `boundingBox()` before/after a 2000px scroll (returns to `y: 0` after the fix, was `y: -2000` before).
- **Gotchas / follow-ups:** Any schedule created before this fix (on any captain's vessel) still has bad timestamps and needs to be regenerated — this isn't a data migration, it's a "tell captains to hit regenerate" issue. `npm run build` + `npm run lint` + `tsc --noEmit` all pass clean.

## 2026-07-06 — Pre-submission fixes: real account deletion, privacy accuracy, review notes ⚠️ (PR #4, NOT yet merged)
- **Author:** Josh
- **Commit/PR:** **PR #4** (`fix/pre-submission-blockers`); covers `c12fd41`..`eb158ad`. Companion: **PR #3** (`final-touches`) = landing-page App Store badge fix.
- **Branch:** `fix/pre-submission-blockers` — **NOT yet merged to main.** Merge PR #3 + #4 and build from merged main, or none of this is in the binary.
- **What changed:**
  - **Real account deletion (Apple 5.1.1(v)):** new Edge Function `supabase/functions/delete-account/index.ts` deletes the user's app data **and their Supabase Auth identity** via the service role; `AuthContext.deleteAccount` now invokes it (was client-only, which left the auth user alive). Captain deletion also deletes their owned vessel + vessel-scoped rows (`schedules`, `vessel_members`, `join_requests`) and nulls crew `profiles.vessel_id` so crew return to the join page. **Crew accounts / profiles / passport data are never deleted.**
  - **Privacy manifest** (`ios/App/App/PrivacyInfo.xcprivacy`) rewritten: removed stale precise-location (weather feature is gone), declared the PostHog/Sentry/identity data now collected.
  - **Privacy policy page** discloses analytics + diagnostics (generic categories, no vendor names).
  - **Sentry replay masking** made explicit; **Paywall** `Premium Feature 1/2/3` placeholders replaced.
  - Added `docs/PRE-SUBMISSION.md` (checklist + a "SUBMISSION HANDOFF — read first" block) and `docs/APP-REVIEW-NOTES.md` (paste-ready App Store review notes).
- **Why:** Prep for the next App Store submission. The v1.2 rejections (Submission `c1690c4c`, Mar 2026) were **all** subscription/IAP. This build ships **free with no IAP** (see the FREE_UNTIL decision), which clears them — so the reviewer now gets *deeper* into the app, where account deletion (5.1.1(v)) and privacy accuracy become the gating items. That's what this work covers.
- **Key files:** `supabase/functions/delete-account/index.ts` (deployed), `src/contexts/AuthContext.tsx`, `src/pages/SettingsPage.tsx`, `ios/App/App/PrivacyInfo.xcprivacy`, `src/pages/PrivacyPolicyPage.tsx`, `src/main.tsx`, `src/components/Paywall.tsx`, `docs/PRE-SUBMISSION.md`, `docs/APP-REVIEW-NOTES.md`.
- **How to verify:** The delete-account function is **already deployed to prod (`oyukwinukknfgebibsqc`) and end-to-end tested** (throwaway signup → invoke → auth user returns 403 afterwards = gone). After merge + build: Settings → Delete Account removes the user from Supabase dashboard → Authentication → Users. `npm run build` + lint pass.
- **Gotchas / follow-ups:**
  - **The function is deployed but INERT until PR #4 merges + a new build ships** — the app code that calls it lives in this PR.
  - **App Store Connect:** submit with **NO in-app purchase attached** (attaching the old tier IAPs caused the v1.2 2.1(b) rejection); update App Privacy answers (Usage/Diagnostics/Identifiers, Precise Location = No); build with the production `.env`. Ordered steps at the top of `docs/PRE-SUBMISSION.md`; reviewer notes in `docs/APP-REVIEW-NOTES.md` (fill in `<FILL IN>` demo creds).
  - **September (paywall on):** fix CustomPaywall price prominence (v1.2 3.1.2(c)), add EULA/Terms, accept Paid Apps Agreement, re-attach the single IAP.
  - Minor: this entry may create a trivial merge conflict with PR #3's 2026-06-30 DEVLOG entry (both prepend) — keep both, newest first.
  - **Update 2026-07-16:** PR #3 and PR #4 merged into `main` (cofounder + Claude). Both are now live on `main`, no longer pending.

## 2026-06-30 — Landing-page App Store badge now links to the live store (+ .env.example)
- **Author:** Josh
- **Commit/PR:** covers `7e48199`..`6499836`
- **Branch:** final-touches (pending merge to main)
- **What changed:** The "Download on the App Store" badge in the `LandingPage` hero previously had `href="#"` (a dead link). It now points to `https://apps.apple.com/app/id6760187387`. Also added `.env.example` — a template documenting the required build env vars (placeholders only, no secrets).
- **Why:** A crew member who taps an invite link (`join.yachtwatch.co/join/<CODE>`) **without the app installed** gets bounced by the SPA catch-all to the web landing page — there is no `/join` web route. Previously every download CTA on that page was a dead `#`, so they had no working path to install. The badge now gives them one. Chosen as the lightweight fix over finishing the heavier JoinPage store-redirect flow (see ROADMAP "Deep-link join landing page").
- **Key files:** `src/pages/LandingPage.tsx` — iOS App Store badge anchor now has the real `href` + `target="_blank"`; `.env.example` — new doc template.
- **How to verify:** Load the landing page on web; the App Store badge links to `id6760187387`. ⚠️ That URL **404s until the public App Store listing goes live** — the app is currently TestFlight-only (Apple lookup API returns `resultCount: 0`). It resolves automatically once released; no code change needed. Verified web-only: the badge is unreachable in the native app (`RootRedirect` bypasses `LandingPage` on native) and is absent from the `dist/` build — **zero App Store submission impact** (confirmed by building and grepping `dist/`).
- **Gotchas / follow-ups:** The **Google Play badge** next to it is still `href="#"` (dead) — left as-is for the iOS-first launch; wire it up when Android ships. The iOS badge link 404s during the TestFlight window before public release — decided (Josh) to leave it since it self-heals the moment the app goes live.

## 2026-06-23 — Supabase fallback removed — env vars now REQUIRED at build time ⚠️
- **Author:** cofounder
- **Commit/PR:** part of the `83077c4` push (security/cleanup batch)
- **Branch:** main
- **What changed:** `src/lib/supabase.ts` no longer has hardcoded `FALLBACK_URL`/`FALLBACK_ANON_KEY`. It now reads Supabase URL + anon key purely from env vars and **throws on launch** if they're missing. RevenueCat iOS key also moved from hardcoded to `import.meta.env.REVENUECAT_API_KEY_APPLE`.
- **Why:** Removes hardcoded keys and fails loudly instead of silently falling back to the wrong database — directly prevents the "stuck on Initialize Vessel / wrong DB" bug from 2026-06-22. Good change.
- **Key files:** `src/lib/supabase.ts` — now env-only, throws if unset.
- **How to verify:** App launches and logs `Supabase Client initialized` against `oyukwinukknfgebibsqc`; missing env vars produce a thrown error instead of silent wrong-DB.
- **Gotchas / follow-ups:** 🚨 **PUBLISHING REQUIREMENT:** the machine that builds the TestFlight/App Store binary MUST have the production Supabase keys in its `.env` (see the "BEFORE BUILDING" section in CLAUDE.md), or the published app white-screens on launch for all users. The RevenueCat Apple key is not exercised during the free period (RC init skipped until 2026-09-01) but should be set anyway.

## 2026-06-23 — Free access for all users until September 2026
- **Author:** Josh
- **Commit/PR:** `dcd1ed9` (merged to main via `3e29c44`)
- **Branch:** main
- **What changed:** Added a `FREE_UNTIL = 2026-09-01` date gate in `src/context/SubscriptionContext.tsx`. While the current date is before that, `isSubscribed` is forced `true`, RevenueCat init is skipped, and the paywall never appears — publishing a schedule just works. After that date the paywall activates automatically.
- **Why:** Founders want the first users free through the summer with NO card details collected (felt off-putting for early adopters), then switch on the $14.99/mo paywall in September. Replaced the earlier temporary `DEV_BYPASS_PAYWALL` boolean.
- **Key files:** `src/context/SubscriptionContext.tsx` — the date gate + early-return that skips RevenueCat.
- **How to verify:** Run the app, log in as a captain, generate and publish a schedule — it should publish immediately with no paywall.
- **Gotchas / follow-ups:** The App Store IAP (`com.yachtwatch.pro.vessel.monthly`) is deliberately NOT submitted yet — keep it in "Prepare for Submission" so Apple reviews the app as free. Before September: remove/expire the `FREE_UNTIL` gate AND include the IAP in the App Store submission.

## 2026-06-22 — Fix: align local env to the production Supabase project
- **Author:** Josh
- **Commit/PR:** (local env fix; `src/lib/supabase.ts` restored to main's value)
- **Branch:** main
- **What changed:** Confirmed the live/production Supabase project is `oyukwinukknfgebibsqc.supabase.co`. Josh's local `.env` had been wrongly pointing at a second, near-empty project (`egprirahgqiktqdwmwdv`) which is missing the `vessel_members` table and `first_name`/`last_name` columns on `profiles`. Repointed `.env` to production and confirmed `src/lib/supabase.ts` fallback is the production URL.
- **Why:** Pointing at the wrong DB caused real-account login failures and an endless "Initialize Vessel" onboarding loop. The two founders must be on the same database.
- **Key files:** `src/lib/supabase.ts` — hardcoded `FALLBACK_URL`/`FALLBACK_ANON_KEY` must stay on production; `.env` (gitignored, per-machine).
- **How to verify:** On app launch, the `Supabase Client initialized with URL:` console log must read `oyukwinukknfgebibsqc`. Logging in with a real production account should land on the dashboard, not the "Initialize Vessel" screen.
- **Gotchas / follow-ups:** Symptom of wrong-DB = stuck on "Initialize Vessel" every login. The cofounder's `.env` has no Supabase keys at all and relies on the fallback — that's fine as long as the fallback stays on production. The `egprirahgqiktqdwmwdv` project is a trap; do not point at it.
