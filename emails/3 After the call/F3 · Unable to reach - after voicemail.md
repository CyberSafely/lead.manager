---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: f3
kind: Email
phase: "3 · After the call"
stage_after_send: Contacted
touch: 2
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# F3 · Unable to reach: after voicemail

**Use case:** Follow-up after a call goes unanswered and you leave a voicemail.

**When it's sent:** Call outcome **Unable to reach**. Counts as touch 2; the lead stays **Contacted**.

**Why:** Gets the offer back in front of the principal in writing, tied to the voicemail and to Mike Nutter's original message.

**Stage after logging as sent:** Contacted

## Notes

- Overlaps with [[E2 · After a call attempt (day 4)]]. See the note there.

## Subject

```text
Missed you by phone: {{school}}'s free year
```

A/B alternate: `Sorry I missed you: free CyberSafely.ai year for {{school}}`

## Body

```text
Hi {{greeting}},

I just left you a voicemail, so here's the written version, easier to skim between meetings.

Following up on Mike Nutter's message: {{school}}'s 5th–9th grade families have a free year of CyberSafely.ai, thanks to our collaboration with MSBA. The family message is written and ready (below), with your sign-up link built in.

All it needs is a forward to your parents. If your office is stretched, reply with your PTA or parent contact and we'll send it ourselves.

Questions? Reply here or call me at {{phone}}.

{{sender}}
CyberSafely.ai
{{phone}}

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}
```

## What changed and why

- **Removed "Which would work best for you?"** Per Torino, the email states a default and a fallback.
- **Added the family message below the signature** so they can act straight from this email, without digging up an older one.
- **"Easier to skim between meetings"** shows you understand a principal's day.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Sorry I missed you: free CyberSafely.ai year for {{school}}

Hi {{greeting}},

I tried to reach you by phone and left a short voicemail. I'm following up on Mike Nutter's message about free CyberSafely.ai access for Missouri's 5th through 9th grade families.

I wanted to make sure you received the information and see if you have any questions. If {{school}} is interested, we can either send the information directly to your families or give your office everything it needs to send it.

Which would work best for you? Just reply, or call me at {{phone}}.

{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
