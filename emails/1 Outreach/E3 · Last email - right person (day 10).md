---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: e3
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 3
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# E3 · Last email: right person? (day 10)

**Use case:** Last outreach email. Asks whether someone else at the school is the better contact.

**When it's sent:** Day 10, touch 3. Also suggested again for **Nurture** leads (about 30 days later) as a fresh-angle retry.

**Why:** A no-reply often means the wrong person. Asking for a referral (counselor, AP, PTA lead) is easy to answer and keeps the offer open without pressure.

**Stage after logging as sent:** Contacted

## Notes

- No reply after this → the lead moves to **Nurture**.

## Subject

```text
Who handles parent emails at {{school}}?
```

A/B alternate: `Right person for this at {{school}}?`

## Body

```text
Hi {{greeting}},

A principal's inbox is a contact sport, so I'll keep this one short.

Who at {{school}} sends news to families? A counselor, assistant principal or PTA lead is perfect. Reply with a name and I'll take it from there, without adding anything to your plate.

Your 5th–9th grade families' free year is still waiting whenever you're ready.

{{sender}}
CyberSafely.ai
```

## What changed and why

- **Subject is a direct, easy question.** Questions in subject lines get replies, and naming a role is lower effort than a yes.
- **A little wit** ("a contact sport") to stand out at touch 3 while acknowledging how busy they are.
- **"Without adding anything to your plate"** removes the main reason to ignore it: more work.
- ⚠️ "Still waiting whenever you're ready" assumes the offer has no deadline. Confirm with Torino.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Right person for this at {{school}}?

Hi {{greeting}},

This is my last note for now. Is someone else at {{school}} better placed to share a free online-safety resource with families? A counselor, assistant principal or PTA lead works just as well. If you point me to them, I'll take it from there.

If the timing isn't right, the free year is still available whenever it's useful. Just reply.

{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
