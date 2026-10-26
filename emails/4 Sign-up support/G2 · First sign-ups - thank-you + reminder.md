---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: g2
kind: Email
phase: "4 · Sign-up support"
stage_after_send: no change
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# G2 · First sign-ups: thank-you + reminder

**Use case:** Thank-you plus a reminder after the first families sign up.

**When it's sent:** The lead reaches **Live** (first sign-ups on the school's code). Sent once.

**Why:** Thanks the school with a real number and asks for a second push, which catches families who missed the first message.

**Stage after logging as sent:** no change

## Notes

- Embeds [[N1 · Newsletter blurb (~50 words)]] and links the onboarding page.
- `{{signups}}` must be a verified count from the school's code. Never estimate it.

## Subject

```text
{{signups}} {{school}} families are in
```

A/B alternate: `{{school}} families are signing up`

## Body

```text
Hi {{greeting}},

Good news: {{signups}} {{school}} families have signed up for CyberSafely.ai. Thank you for making that happen.

A second reminder can catch the families who missed the first one. Here's a short version for your newsletter, announcements or a text to parents:

{{newsletter}}

Parents who want a hand getting set up can join a free live onboarding call: {{onboarding_page}}

{{sender}}
CyberSafely.ai
```

## What changed and why

- **A number in the subject.** Specific numbers get opened, and it's the school's own win.
- **Credits the principal** ("Thank you for making that happen") before the next ask.
- Check that the app fills `{{signups}}` in the subject line too. If not, use the alternate.
- `{{signups}}` must be a verified count from the school's code.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: {{school}} families are signing up

Hi {{greeting}},

Thank you for sharing CyberSafely.ai with your families. So far, {{signups}} families at {{school}} have signed up.

A second reminder can catch families who missed the first one. Here's a short version for your newsletter, announcements or a text to parents:

{{newsletter}}

Families who need help can join a free live onboarding call: {{onboarding_page}}

{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
