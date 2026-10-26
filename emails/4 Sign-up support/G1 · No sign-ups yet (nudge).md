---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: g1
kind: Email
phase: "4 · Sign-up support"
stage_after_send: no change
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# G1 · No sign-ups yet (nudge)

**Use case:** Nudge when a school says it shared the message but no families have signed up.

**When it's sent:** The lead is **Engaged**. The app flags it about 8 days after engagement if no sign-ups have appeared on the school's code.

**Why:** Gives the school a shorter blurb that fits a newsletter, announcement or text, and offers to send it for them.

**Stage after logging as sent:** no change

## Notes

- Embeds [[N1 · Newsletter blurb (~50 words)]] as `{{newsletter}}`.

## Subject

```text
{{school}}: a 50-word version for parents
```

A/B alternate: `Sign-up link for {{school}} families`

## Body

```text
Hi {{greeting}},

Thanks again for sharing CyberSafely.ai with your families. Sign-ups from {{school}} haven't come through yet. Inboxes being what they are, the first message may have been buried.

Here's a 50-word version that fits a newsletter, morning announcement or text to parents:

{{newsletter}}

Or reply with your PTA or parent contact and we'll send it ourselves.

{{sender}}
CyberSafely.ai
```

## What changed and why

- **Subject names the deliverable** (a 50-word version), so the value is clear before it's opened.
- **No blame.** "Inboxes being what they are" explains the zero without suggesting the school failed.
- **The fallback is a statement, not a question.**

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Sign-up link for {{school}} families

Hi {{greeting}},

Thanks again for sharing CyberSafely.ai. We haven't seen sign-ups from {{school}} families yet, so here's a short version for a newsletter, morning announcement or text to parents:

{{newsletter}}

Would you like us to send it for you instead? Just reply.

{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
