---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: r1
kind: Email
phase: "2 · Replies"
stage_after_send: Engaged
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# R1 · Has questions / wants a call

**Use case:** Reply when a principal has questions or wants a call.

**When it's sent:** When a principal replies with questions. The lead moves to **Engaged**.

**Why:** Moves the conversation to a short call with concrete time options, which is faster than an email back-and-forth.

**Stage after logging as sent:** Engaged

## Notes

- Times are in **Central** (Missouri). You are on Eastern/PR time: +1 h until Nov 1, +2 h after.
- Fill in the three `[Day, time]` slots before sending.

## Subject

```text
Re: Your {{school}} family message is ready
```

## Body

```text
Hi {{greeting}},

Glad you asked. Ten minutes on the phone will cover it. Do any of these work (Central time)?

- [Day, time]
- [Day, time]
- [Day, time]

If none fit, send me a time and the best number, and I'll call you then.

Meanwhile, the family message from my first email is ready to go whenever you are.

{{sender}}
CyberSafely.ai
```

## What changed and why

- **Subject follows E1's new subject** so the reply stays in the same thread.
- **Specific time slots** remove the scheduling back-and-forth, so they're more likely to book.
- **Last line keeps the action alive** so a question doesn't stall delivery.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Re: Free online-safety app for {{school}} families

Hi {{greeting}},

Thanks for getting back to me. Happy to walk you through it. A quick call takes about 10 minutes. Would one of these work (Central time)?

- [Day, time]
- [Day, time]
- [Day, time]

Or send me a time that suits you and the best number to reach you.

{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
