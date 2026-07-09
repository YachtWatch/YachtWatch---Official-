---
name: document-changes
description: Document work in the shared dev log before pushing or merging to main, written so the other founder's Claude can pick it up cold. Use this whenever the user is about to push/merge, says "document this", "log what we did", "update the devlog", finishes a feature, or parks an unfinished feature. ALWAYS run before pushing to main.
---

# Document Changes

This repo is worked on by two founders (Josh + cofounder), each driving their own Claude on their own machine. The two Claudes **cannot talk directly** — they coordinate only through committed files. Your job here is to write documentation clear enough that the *other* Claude, starting with zero context, can understand what was done and why.

Two shared logs live in `docs/`:
- **`docs/DEVLOG.md`** — features/fixes that SHIPPED (merged or pushed to main). The running history.
- **`docs/ROADMAP.md`** — features that are BUILT BUT PARKED (on a branch, not merged) or planned. The backlog.

## When invoked

### Step 1 — Figure out what changed
- Run `git log --oneline <last-documented-commit>..HEAD` and `git diff --stat` to see what's new since the last DEVLOG entry. The most recent DEVLOG entry header notes the last commit it covered — start from there.
- If unsure what the change accomplishes or *why*, ask the user briefly rather than guessing. The "why" is the most valuable thing to capture and the hardest to recover later.

### Step 2 — Decide which log
- **Shipping to main / pushing now?** → write to `docs/DEVLOG.md`.
- **Built but intentionally NOT merging yet** (e.g. needs more work, risky for App Store, missing permissions)? → write to `docs/ROADMAP.md` and make sure the code is on a clearly-named `feature/*` branch (not main). Recommend opening a GitHub Draft PR via `gh` so the code + discussion are preserved.

### Step 3 — Write the entry

Prepend a new entry to the top of the relevant log (newest first). Use this exact structure so it's parseable by another Claude:

```markdown
## YYYY-MM-DD — <short feature title>
- **Author:** <Josh | cofounder>
- **Commit/PR:** <commit hash or PR #; covers commits X..Y>
- **Branch:** <branch name; "main" if merged>
- **What changed:** <plain-English summary of the behaviour change>
- **Why:** <the reason / decision behind it — this is the important part>
- **Key files:** <`path/to/file.tsx` links, with one-line notes on each>
- **How to verify:** <how someone would confirm it works>
- **Gotchas / follow-ups:** <anything fragile, unfinished, or that the other dev must know. "None" if truly none.>
```

For a ROADMAP (parked) entry, also add:
- `- **Status:** parked` and `- **Blockers / open questions:** <what's unresolved before it can ship>`

### Step 4 — Writing rules (so the other Claude understands cold)
- Assume the reader has **zero context** — no shared memory, no knowledge of the conversation that produced the change. Spell out the "why."
- Reference files as clickable paths, e.g. `src/context/SubscriptionContext.tsx`.
- Be concrete about behaviour ("publishing a schedule now skips the paywall until 2026-09-01"), not vague ("improved subscriptions").
- Keep each entry tight — a few lines per field. Link to the PR/branch for deep detail rather than pasting code.
- Never delete or rewrite old entries; only prepend new ones. The log is append-only history.

### Step 5 — Confirm
- Show the user the entry you wrote and which log it went to.
- If they're pushing now, remind them the doc change should be included in the same commit/push so the other founder sees it immediately.

## Important
- Do NOT push or merge on the user's behalf unless they explicitly ask — your job is the documentation, they control the push.
- If `docs/DEVLOG.md` or `docs/ROADMAP.md` is missing, create it from the templates already in `docs/`.
