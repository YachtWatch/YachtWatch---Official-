# YachtWatch — Dev Log

Running history of features and fixes that **shipped** (merged/pushed to main). Newest first, append-only.
Both founders' Claudes maintain this via the `/document-changes` skill. Entries are written so the *other* founder's Claude can understand the work with zero prior context.

For features that are **built but parked** (not yet merged), see [ROADMAP.md](ROADMAP.md).

---

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
