# YachtWatch — Roadmap / Parked Features

Features that are **built but not yet merged**, or planned and not yet started. Newest first, append-only.
Both founders' Claudes maintain this via the `/document-changes` skill.

**Parked feature = the code lives on its own `feature/*` branch (never merged to main) + ideally a GitHub Draft PR.** This file is the index that points to those branches so they don't get forgotten. When a parked feature ships, move its entry to [DEVLOG.md](DEVLOG.md).

One maintenance habit: every few weeks, merge `main` *into* a long-lived parked branch so it doesn't drift too far and become painful to integrate.

---

<!-- TEMPLATE — copy for each parked feature:

## YYYY-MM-DD — <feature title>
- **Author:** <Josh | cofounder>
- **Status:** parked
- **Branch:** feature/<name>   (Draft PR #<n> if opened)
- **The concept:** <what it does and the idea behind it>
- **What's built so far:** <how far it got>
- **Blockers / open questions:** <what's unresolved before it can ship — e.g. permissions, untested behaviour>
- **How to resume:** <where to start when picking it back up>

-->

## 2026-06-30 — Deep-link join landing page (`/join/:code` web flow)
- **Author:** Josh
- **Status:** parked
- **Branch:** `feature/deep-link-join` (commit `4959994`)
- **The concept:** A web landing page at `/join/:code` that captures an invite code from a tapped universal link **when the app isn't installed**, persists it (`localStorage` `pendingJoinCode`), and redirects to the App/Play store — so after the user installs, the app can auto-join the vessel. The seamless "tap link → install → auto-join" onboarding.
- **What's built so far:** `src/pages/JoinPage.tsx` exists (detects platform, stores `pendingJoinCode`, redirects to store) but is **orphaned** — it is not imported and not added to the router in `src/App.tsx`, so it never renders. Also on the branch: `public/.well-known/` (apple-app-site-association + assetlinks.json) — but these are **redundant**: the live `join.yachtwatch.co` already serves a working AASA (`curl` → 200; iOS universal links already work in TestFlight).
- **Blockers / open questions:**
  1. JoinPage store URLs are placeholders (`id000000000`) — real iOS URL is now known (`id6760187387`), Play URL still needed.
  2. Nothing reads `pendingJoinCode` back after install to complete the auto-join. `CrewDashboard` currently handles codes via the `appUrlOpen` listener + path match + QR scan, **not** via `pendingJoinCode`.
  3. Android app-links aren't configured natively — `AndroidManifest.xml` has no `VIEW` intent-filter, and `assetlinks.json` still has `REPLACE_WITH_YOUR_SHA256_SIGNING_FINGERPRINT`.
  4. **Is it even needed?** The practical no-app case is now covered by the App Store badge on the landing page (shipped 2026-06-30, see DEVLOG). This heavier flow only matters if you want true auto-join-after-install rather than just "get them to the store."
- **How to resume:** `git checkout feature/deep-link-join`; add `<Route path="/join/:code" element={<JoinPage/>} />` in `src/App.tsx` **before** the `*` catch-all; fill real store URLs; add `pendingJoinCode` pickup in `CrewDashboard` after login; for Android add the `VIEW` intent-filter + real signing fingerprint.
- **Why parked, not shipped:** orphaned + placeholder URLs would be dead code on main, and the lightweight badge fix already closes the practical gap. Kept on a branch so the work isn't lost.
