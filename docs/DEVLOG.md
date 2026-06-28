# YachtWatch — Dev Log

Running history of features and fixes that **shipped** (merged/pushed to main). Newest first, append-only.
Both founders' Claudes maintain this via the `/document-changes` skill. Entries are written so the *other* founder's Claude can understand the work with zero prior context.

For features that are **built but parked** (not yet merged), see [ROADMAP.md](ROADMAP.md).

---

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
