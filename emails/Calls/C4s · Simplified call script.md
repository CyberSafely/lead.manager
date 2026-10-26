---
date: 2026-10-26
type: draft
outcome: "02"
status: draft
template_id: c4s
kind: Script
phase: "Calls"
stage_after_send: no change
outbound: true
source: "ncs.md (Giancarlo's simplified script) · [[C1 · Call script - principal opened the email]] · [[C2 · Front office script - relay a message to the principal]]"
---
# C4s · Simplified call script

**Use case:** The default script when calling schools. It's short and works with whoever picks up: the front office or the principal.

**When it's used:** Any call to a school on the principal list. In the Calls tab, pick the school (or press **Script** on its row) and the principal's name, school and district are filled in for you.

**Goal of the call:** get the sign-up link to the principal and agree on the easiest way for it to reach families.

## Notes

- If you're put through to the principal, keep going with the same script. For a longer conversation, switch to [[C1 · Call script - principal opened the email]].
- Use the same five outcomes as C1:
  - Interested → [[F1 · Interested - next steps]]
  - Needs more information → [[F2 · Needs info or not ready - short summary]]
  - Follow-up needed → F2, then call back
  - Not interested → [[R2 · Not interested]]
  - Unable to reach → [[Voicemail script (~20 s)]] + [[F3 · Unable to reach - after voicemail]]

## Subject

_None (script or blurb)._

## Body

```text
OPENING
"Hi, this is {{sender}} with CyberSafely.ai. How are you today?"

THE ASK
"I'm hoping to speak with {{first}} {{last}}. It's about Mike Nutter's email on the free year of CyberSafely.ai for {{school}}'s families. It's an app that helps parents keep their kids safe online."

WHY YOU'RE CALLING
"Through our collaboration with MSBA, every 5th through 9th grade family in Missouri, including {{district}}, can use it free for a full year. There's no cost to the school or to families."

THE CLOSE
"I'd just like to get {{first}} the sign-up link for {{school}}, so your families can take advantage of it. It's already set up. All we need is the best way to get it to your parents."

IF PUT THROUGH → repeat the ask to the principal, then:
"The quickest route is a forward in your next parent email or newsletter. If your office is busy, give me your PTA or parent contact and we'll send it ourselves." → mark the outcome, send the follow-up email.

IF NOT AVAILABLE
"No problem. What's the best email or time to reach {{first}}? I'll send the link and a short summary today." → log what they said in the call note, send F3.

QUICK ANSWERS
- "Do we sign anything?" → "Nothing. No contract, no cost."
- "What about student data?" → "Fair question. I'll follow up in writing so you have an accurate answer." Don't improvise.

NO ANSWER → mark "Unable to reach". Leave the voicemail, then send F3.
```

## What changed and why

- **Spelling and grammar fixed**, and "CS" written out as CyberSafely.ai.
- **(name) → merge fields.** `{{first}} {{last}}`, `{{school}}` and `{{district}}` fill in from the lead you pick in the Calls tab.
- **"Every single child in the state of Missouri" → "every 5th through 9th grade family in Missouri".** This matches the offer in C1–C3 and D1 (grades 5–9).
- **"Protects children from cyber threats" → "helps parents keep their kids safe online".** A softer claim, in line with the claims-guard notes on C3, which flagged protection claims as unapproved.
- **Branches added** for put-through, not available and no answer, using the same five outcomes as C1.

## Before using

- ⚠️ The offer (free year, grades 5–9, MSBA collaboration) and "no cost" still need Torino's approval, as with C1–C3 (approved-claims is UNAPPROVED).

## Original (ncs.md, Oct 26)

<details><summary>Show</summary>

```text
Hello, My name is Gianarlo With CS. How are you today?

I am looking to speek with (name) regaurding an email from Mike Nutter having to do with your schools free year of our application that protects children from cyber threats.

Through our collbaroation with MSBA weve have secured a free year of use for every single child in the state of Missouri.

What id like to do is get in touch with (name) to get him/ her the link so youre families can take advantage of the offer weve curated. There is no cost for missouri schools and families. Its simply a matter of establishing the best way for your families to be able to take advantage of what is already in place.
```

</details>
