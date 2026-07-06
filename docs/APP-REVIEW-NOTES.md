# App Store — App Review Notes

**Prepared by:** Josh + his Claude Code session, 2026-07-06.
**For:** the cofounder (and their Claude) / whoever submits the next build — pull this before you submit.
**Why it exists:** ready-to-paste text for **App Store Connect → App Review Information → Notes**, plus the checks that make the notes true. Written to pre-empt the v1.2 rejections (Submission ID `c1690c4c-45b3-4c13-85a3-b0033504cf52`, reviewed 26 & 31 Mar 2026) — which were **all** subscription/IAP-related. This submission ships **free with no IAP**, which is what clears them.

---

## 1. Paste this into "App Review Information → Notes"

```
YachtWatch is a watch-scheduling and crew-management tool for yacht captains and
crew. Captains create a vessel, generate watch schedules, and manage crew; crew
join a vessel with a code and view their assigned watches. It is an operational
scheduling tool only — NOT a navigation, safety, maritime-compliance, or
emergency-monitoring app.

This version is offered completely free. It contains NO in-app purchases and NO
auto-renewable subscriptions, and no purchase, subscription, or pricing screen is
reachable anywhere in the app. (A subscription is planned for a later release and
will be submitted separately at that time.)

Demo captain account:
  Email:    <FILL IN — a working demo captain login>
  Password: <FILL IN>

Demo crew: sign up with a new account in-app and join with vessel code 3R6DKD,
or use:
  Email:    <FILL IN — optional demo crew login>
  Password: <FILL IN>

Steps to review the core flow:
  1. Sign in as the demo captain.
  2. Create a vessel (or use the existing one).
  3. Generate a watch schedule and publish it.
  4. (Crew) Sign up, join with the vessel code above, view assigned watches.

Account deletion: users can permanently delete their account and all associated
data from Settings > Delete Account (this fully deletes the account, not just a
sign-out).

Notifications are used only for watch reminders and crew join approvals.
```

---

## 2. Make the notes TRUE before submitting (manual — App Store Connect)

The v1.2 rejection happened because the build was submitted **with** in-app purchases attached and the reviewer couldn't find them. So the single most important check:

- [ ] **No in-app purchases attached to this version.** Confirm none of the old tier products (*Monthly 1-5 Crew*, *Monthly 6-10 Crew*, *Yearly 1-5 Crew*, *Yearly 6-10 Crew*) are in "Waiting for Review" tied to this build. → clears Guideline 2.1(b).
- [ ] **Fill in the demo credentials** above and verify they actually log in on a fresh device.
- [ ] **Privacy Policy URL** set in App Store Connect (the app has a policy page at `/privacy-policy` → yachtwatch.co).
- [ ] **App Privacy answers** updated for the PostHog/Sentry analytics added on 28 Jun: declare Usage Data, Diagnostics, Identifiers; set Precise Location = **No**. (See `PRE-SUBMISSION.md` item 2.)
- [ ] Because the app is free with no IAP, you do **NOT** need the Paid Apps Agreement or a Terms of Use (EULA) link for this submission — those only become required in September when the subscription is switched on.

## 3. Deferred to the September paywall release (NOT this submission)
- Re-attach the single IAP (`com.yachtwatch.pro.vessel.monthly`).
- Fix `CustomPaywall` so the **billed amount** is the most prominent price element (v1.2 rejection 3.1.2(c): the monthly calculated price was shown more conspicuously than the billed amount).
- Add Terms of Use (EULA) + subscription title/length/price + privacy links in the paywall flow.
- Accept the Paid Apps Agreement in App Store Connect → Business.

---

_See also: `PRE-SUBMISSION.md` (full pre-submission checklist), `DEVLOG.md` (the free-until-2026-09-01 subscription-bypass decision)._
