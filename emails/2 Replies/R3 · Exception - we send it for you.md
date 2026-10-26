---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: r3
kind: Email
phase: "2 · Replies"
stage_after_send: Engaged
path: we
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# R3 · Exception: we send it for you

**Use case:** Fallback path: the school hands us a contact, so CyberSafely.ai sends the family message for them.

**When it's sent:** When the principal replies "send it" or sends a PTA/parent contact. The lead moves to **Engaged** on the "we send it" path.

**Why:** Collects the three things needed to send on the school's behalf: parent contacts, approval of the message, and a send date.

**Stage after logging as sent:** Engaged

## Notes

- **Blocked until Torino approves** the line on how parent contacts are used and stored.
- Parent email lists are PII. Never paste them into the vault or prompts. Keep them in HubSpot or the approved system.

## Subject

```text
Re: Your {{school}} family message is ready
```

## Body

```text
Hi {{greeting}},

Done. We'll handle delivery. Here's all I need from your office:

1. Parent or PTA email addresses for your 5th–9th grade families. A spreadsheet with one column of emails is plenty.
2. Your OK on the family message from my first email. It goes out as a message from {{school}}.
3. A send date, if you have one in mind. If not, we'll send it within [X] school days.

[Line on how the contacts are used and stored. Get the approved wording from Torino before sending.]

Once it's out, I'll let you know it landed.

{{sender}}
CyberSafely.ai
```

## What changed and why

- **Opens with "Done."** It confirms the decision instead of re-opening it.
- **Default send date** ("if not, we'll send it within…") so a missing date doesn't stall delivery. Fill in [X].
- **Closes the loop** ("I'll let you know it landed"), which builds trust for the G-emails later.
- Still **blocked** on Torino's data-handling line.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Re: Free online-safety app for {{school}} families

Hi {{greeting}},

Happy to handle it. Here's what I need from your office:

1. Parent or PTA email addresses for your 5th through 9th grade families, as a spreadsheet or list. One column of emails is enough.
2. Your OK on the family message in my first email. It goes out as a message from {{school}}.
3. A preferred send date, if you have one.

[Line on how the contacts are used and stored. Get the approved wording from Torino before sending.]

Best,
{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
