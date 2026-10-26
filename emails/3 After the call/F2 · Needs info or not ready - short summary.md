---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: f2
kind: Email
phase: "3 · After the call"
stage_after_send: no change
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# F2 · Needs info / not ready: short summary

**Use case:** Short summary for a principal who needs more information or isn't ready.

**When it's sent:** Call outcome **Needs more information** (lead → Engaged) or **Follow-up needed** (lead stays Contacted; call back later).

**Why:** Leaves a one-screen summary they can come back to, plus answers to whatever they asked on the call.

**Stage after logging as sent:** no change

## Notes

- Fill in or delete the `[Answers to the questions…]` line.

## Subject

```text
{{school}}'s free year, on one page
```

A/B alternate: `Summary: free CyberSafely.ai year for {{school}} families`

## Body

```text
Hi {{greeting}},

Thanks for your time today. Here's the one-page version to keep on hand.

- What it is: a parent app that alerts parents early if their child may be facing something serious online, like bullying, grooming or sextortion.
- The offer: through CyberSafely.ai's collaboration with MSBA, every 5th–9th grade family in Missouri gets one year free.
- What it takes from {{school}}: no contract, no MOU, no cost. One forward to families, or we send it for you.
- Your sign-up link: {{signup_link}}

[Answers to the questions they asked on the call. Delete if none.]

When you're ready, reply here or call me at {{phone}}. I'll check back in [two weeks] either way.

{{sender}}
CyberSafely.ai
```

## What changed and why

- **"On one page" in the subject** promises something skimmable they can save.
- **A set check-in date** ("either way") keeps the follow-up in your hands, not theirs.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Summary: free CyberSafely.ai year for {{school}} families

Hi {{greeting}},

Thank you for speaking with me. As promised, here's a short summary to keep on hand.

- What it is: CyberSafely.ai is an app for parents. It alerts them when their child may be facing something serious online, like cyberbullying, so they can step in early.
- The offer: through a collaboration with MSBA, families of every 5th through 9th grader in Missouri can use it free for one year.
- What it takes from the school: nothing to sign and no cost. Forward one ready-made message to families, or we can send it for you.
- Your school's sign-up link: {{signup_link}}

[Answers to the questions they asked on the call. Delete if none.]

Whenever you're ready, just reply to this email or call me at {{phone}}.

{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
