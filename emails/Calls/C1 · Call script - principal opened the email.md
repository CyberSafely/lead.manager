---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: c1
kind: Script
phase: "Calls"
stage_after_send: no change
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# C1 · Call script: principal opened the email

**Use case:** Phone script for principals who opened the outreach emails.

**When it's sent:** Calls to principals on the opened-email list, using Torino's five outcome categories (set Oct 7, 2026).

**Why:** Opened-but-no-reply principals are warm. A call confirms they got the information and closes on delivery. Per Torino, we don't ask them to choose who sends.

**Stage after logging as sent:** no change

## Notes

- Outcome → follow-up email:
- Interested → [[F1 · Interested - next steps]]
- Needs more information → [[F2 · Needs info or not ready - short summary]]
- Follow-up needed → [[F2 · Needs info or not ready - short summary]], then call back
- Not interested → [[R2 · Not interested]]
- Unable to reach → [[Voicemail script (~20 s)]] + [[F3 · Unable to reach - after voicemail]]

## Subject

_None (script or blurb)._

## Body

```text
OPENING
"Hi {{greeting}}, this is {{sender}} with CyberSafely.ai. Did I catch you at an okay moment?

I'm following up on Mike Nutter's message about the free year of CyberSafely.ai for Missouri's 5th through 9th graders. I sent you the details by email and wanted to make sure it's on your radar."

THE GOOD NEWS
"We've already done the work. The message for your families is written, with {{school}}'s sign-up link built in. It just needs to reach your parents."

THE CLOSE (assume the yes; don't ask them to choose)
"The quickest route is a forward in your next parent email or newsletter. If your office is stretched, give me your PTA or parent contact and we'll send it ourselves. Either way, your families get it."

IF YES → mark "Interested / Ready to move forward"
"Perfect. I'll email you everything today." → send F1. If they named a PTA or parent contact, log it in HubSpot, not in the vault.

IF THEY HAVE QUESTIONS → mark "Needs more information"
"Good question." Answer only what you know. "If I don't have it, I'll find out and put it in a short summary today." → send F2.

IF NOT READY → mark "Follow-up needed"
"Totally fair. I'll send a one-page summary so it's there when you are, and check back in [two weeks]." → send F2, set the call-back.

IF NO → mark "Not interested"
"Understood. Thanks for your time. I'll close it out on our end." → send R2.

QUICK ANSWERS
- "Do we sign anything?" → "Nothing. No contract, no MOU, no cost."
- "What does the school have to do?" → "One forward. Or hand us a contact and we'll do it."
- "What about student data?" → "Fair question. I want to give you an accurate answer, so I'll follow up in writing." Don't improvise.

WRAP-UP
Ask if they'd like information on the fundraising program. If yes, tick "Wants fundraising info".

NO ANSWER → mark "Unable to reach". Leave the voicemail, then send F3.
```

## What changed and why

- **Removed the choice question** ("Would you prefer that we send it… or would you like your school to send it?"). Per Torino, we make the call. The close now states the default (a forward) and a fallback (we send it) as a done deal.
- **"The good news" beat** shows the work is already done before any ask.
- **Quick answers** for the three objections most likely to stall a yes. The student-data answer stays non-improvised.
- Torino's five outcome categories and the fundraising wrap-up are unchanged.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
OPENING
"Hi {{greeting}}, this is {{sender}} with CyberSafely. How are you?

I'm calling because I recently sent you an email following up on Mike Nutter's message about the free CyberSafely.ai access available to 5th–9th grade students in Missouri.

I just wanted to make sure you received the information and see if you had any questions.

We're trying to make this as easy as possible for schools. If your school is interested, we can either send the information directly to your families, or we can provide everything your office needs to send it.

I'd love to hear what would work best for your school."

IF INTERESTED → mark "Interested / Ready to move forward"
"Great! I can take care of the next steps and send you everything you need. Would you prefer that we send it directly to your families, or would you like your school to send it?"

IF THEY HAVE QUESTIONS → mark "Needs more information"
"Of course. I'm happy to answer any questions, and if there's anything I don't have the answer to right away, I can follow up with you."

IF NOT READY → mark "Follow-up needed"
"Absolutely, I completely understand. I can send you a short summary so you have the information available, and you can reach out to me whenever you're ready."

WRAP-UP
Ask if they'd like information on the fundraising program. If yes, tick "Wants fundraising info".

NO ANSWER → mark "Unable to reach". Leave the short voicemail, then send F3.
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
