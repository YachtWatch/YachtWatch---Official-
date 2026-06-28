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

_No parked features logged yet. Example of something that belongs here: the **weather feature** — if built on a `feature/weather` branch but held back from main because it needs location permissions and is unproven, add an entry here pointing at that branch + its Draft PR._
