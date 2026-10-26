---
date: 2026-10-20
type: draft
outcome: "02"
status: draft
template_id: d4
kind: Email
phase: "0 · District overseers"
stage_after_send: Engaged
marks_shared: true
outbound: true
source: "[[F1 · Interested - next steps]] · [[C3 · Call script - superintendent]]"
---
# D4 · Overseer replied: school links + family message

**Use case:** The district version of [[F1 · Interested - next steps]]. Send it when an overseer replies to [[D3 · Overseer voicemail follow-up - school sign-up links]] or [[D1 · District cold intro]], or says yes on the call.

**When it's sent:** After you log **Reply received**, or call outcome **Interested / Ready to move forward** on an overseer. The app suggests D4 instead of F1 for overseers.

**Why:** Gives the district everything in one email: each school's link and the family message, ready for principals to send.

**Stage after logging as sent:** Engaged, marked **shared**. The overseer moves to **Live** by itself once any school in their district reports family sign-ups, so Live still means real sign-ups.

## Notes

- The family message is [[P1 · Family message (forwarded by the school)]] reworded for a whole district: instead of one sign-up link it lists every school's own link (`{{school_links}}`), so it can be forwarded district-wide as is. If you refine P1, copy the change here too.
- Every link sits on its own line with nothing after it, so Outlook and Gmail turn each one into a clickable link.

## Subject

```text
{{district}}: each school's free CyberSafely.ai sign-up link
```

## Body

```text
Hi {{greeting}},

Thank you for getting back to me. Here's everything your schools need to give their 5th–9th grade families a free year of CyberSafely.ai through MSBA.

The family message below is ready to forward as is. It lists each school's own sign-up link, so families pick their child's school. Your principals or your communications office can send it in the next parent email or newsletter. That's it: no contract, no MOU and no cost to the district or the schools.

[If they asked for it, add: "I'm happy to email each principal directly with their school's link and the message." Delete this note.]

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}

———— Message for {{district}} families (ready to forward) ————

Dear {{district}} families,

We want every 5th–9th grade family in {{district}} to know about a free resource now available to you.

CyberSafely.ai is a parent app that alerts you early if something concerning comes up in your child's online life, like bullying, grooming, sextortion or exposure to harmful content, so you can step in before it escalates.

It's built to support your judgment, not replace it. It doesn't read your child's private messages or store their passwords. It watches for warning signs and lets you know.

Thanks to a collaboration between CyberSafely.ai and MSBA, Missouri families of 5th–9th graders get one full year free.

Getting started takes a few minutes:
1. Sign up at your child's school's link:
{{school_links}}
2. Add your child.

That's it.

Want a hand? Step-by-step instructions, a short video and free live onboarding calls are here:
{{onboarding_page}}

Questions? Reach the CyberSafely.ai team: {{support}}
```
