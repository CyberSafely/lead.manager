---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: vm
kind: Script
phase: "Calls"
stage_after_send: no change
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# Voicemail script (~20 s)

**Use case:** About 20-second voicemail when a call isn't answered.

**When it's sent:** Day 4 call, or any call from [[C1 · Call script - principal opened the email]] that goes to voicemail.

**Why:** Puts a voice to the email and tells the principal a follow-up email is coming.

**Stage after logging as sent:** no change

## Notes

- Followed by [[E2 · After a call attempt (day 4)]] (standard sequence) or [[F3 · Unable to reach - after voicemail]] (call list).

## Subject

_None (script or blurb)._

## Body

```text
Hi {{greeting}}, this is {{sender}} with CyberSafely.ai, following up on Mike Nutter's note about the free year for your 5th through 9th grade families. The family message is written and ready. All it needs is a forward, and if your office is busy, we'll send it ourselves. I'm sending you a short email now. You can reach me at {{phone}}. Thanks!
```

## What changed and why

- **Opens with Mike Nutter's name** so it isn't mistaken for a cold sales call.
- **"Written and ready" + "we'll send it ourselves"** = delivery happens either way, with no question asked.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Hi {{greeting}}, this is {{sender}} with CyberSafely.ai. I emailed you about a free year of CyberSafely.ai for your 5th through 9th grade families, through MSBA. There's nothing to sign and no cost to the school. All it takes is forwarding one message to families. I'll send a short follow-up email. You can reach me at {{phone}}. Thank you.
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].


- Mention its free for the school. 
- Parent reach out