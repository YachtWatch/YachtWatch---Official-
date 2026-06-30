# YachtWatch — Dev Log

Running history of features and fixes that **shipped** (merged/pushed to main). Newest first, append-only.
Both founders' Claudes maintain this via the `/document-changes` skill. Entries are written so the *other* founder's Claude can understand the work with zero prior context.

For features that are **built but parked** (not yet merged), see [ROADMAP.md](ROADMAP.md).

---

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
