---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: p1
kind: Family message
phase: "Family-facing"
stage_after_send: no change
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# P1 · Family message (forwarded by the school)

**Use case:** The message the school forwards to its 5th–9th grade families.

**When it's sent:** Never sent on its own. It is inserted into E1 and F1 as `{{parent_email}}`.

**Why:** This is what actually drives sign-ups. Families see it as coming from their school, with the school's sign-up link in it.

**Stage after logging as sent:** no change

## Notes

- Used in [[E1 · First email + family message (day 0)]] and [[F1 · Interested - next steps]].
- Contains product claims (alerts, cyberbullying, never collects passwords). These **need approval** while the approved-claims list is UNAPPROVED.

## Subject

```text
Free for {{school}} families: a year of CyberSafely.ai
```

A/B alternate: `A message from {{school}}: a free online-safety resource`

## Body

```text
Dear {{school}} families,

We want every 5th–9th grade family at {{school}} to know about a free resource now available to you.

CyberSafely.ai is a parent app that alerts you early if something concerning comes up in your child's online life, like bullying, grooming, sextortion or exposure to harmful content, so you can step in before it escalates.

It's built to support your judgment, not replace it. It doesn't read your child's private messages or store their passwords. It watches for warning signs and lets you know.

Thanks to a collaboration between CyberSafely.ai and MSBA, Missouri families of 5th–9th graders get one full year free.

Getting started takes a few minutes:
1. Sign up here: {{signup_link}}
2. Add your child.

That's it.

Want a hand? Step-by-step instructions, a short video and free live onboarding calls are here: {{onboarding_page}}

Questions? Reach the CyberSafely.ai team at {{support}}.
```

## What changed and why

- **Rebuilt from the company's parent email** ([[Outreach email 3]]), which Mike Nutter's team wrote and MSBA reviewed.
- **Leads with what the parent gets**, then deals with the main worry (privacy: "support your judgment, not replace it").
- **Subject puts "Free" and the school name first.** Parents open messages from their school.
- "Mike Nutter of Cybersafely and MSBA" became "CyberSafely.ai and MSBA". Parents don't know Mike, but MSBA carries the credibility. ⚠️ Confirm with Torino that the collaboration is with CyberSafely.ai, not the CyberSafely Foundation.
- ⚠️ Every product line here (alerts, what it detects, no private messages or passwords) is from company emails but **needs approval** while the approved-claims list is UNAPPROVED.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Free online-safety app for {{school}} families

Dear {{school}} families,

We're sharing a free resource for families of 5th through 9th graders.

Through a collaboration between CyberSafely.ai and MSBA, Missouri families of 5th–9th graders can use CyberSafely.ai free for one year. CyberSafely.ai is a parent app that alerts you when your child may be facing something serious online, like cyberbullying, so you can step in early. It never collects your child's passwords.

Getting started takes a few minutes:
1. Sign up on the web with this link: {{signup_link}}
2. Add your child and set up the app on their device.

Need help? Step-by-step instructions, a short video and free live onboarding calls are here: {{onboarding_page}}

Questions? Contact the CyberSafely.ai team at {{support}}.
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
