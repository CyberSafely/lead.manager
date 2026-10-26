---
date: 2026-10-16
type: draft
outcome: "02"
status: draft
template_id: c3
kind: Script
phase: "Calls"
stage_after_send: no change
outbound: true
source: "[[C1 · Call script - principal opened the email]] · [[D1 · District cold intro]]"
---
# C3 · Call script: superintendent

**Use case:** Phone script for superintendents and district overseers, before or after D1.

**Goal of the call:** one yes. The superintendent agrees to get every school's sign-up link into parents' hands. You send the links and the family message today.

**How it flows:** a short opening with the offer, two questions about how they keep students safe online now, then what the app does, the iPad angle, and the close.

## Notes

- Use the same five outcomes as C1, and log them on the overseer record:
  - Interested → [[D4 · Overseer replied - school links + family message]] the same day (each school's sign-up link + the P1 family message).
  - Needs more information → [[F2 · Needs info or not ready - short summary]]
  - Follow-up needed → F2, then call back
  - Not interested → [[R2 · Not interested]]
  - Unable to reach → [[Voicemail script (~20 s)]], then [[D3 · Overseer voicemail follow-up - school sign-up links]] right away.
- The overseer drawer in the Lead Manager lists every school in the district with its principal. Have it open during the call.
- Listen more than you talk in the two questions. Their answers tell you which part of the pitch matters to them.

## Subject

_None (script or blurb)._

## Body

```text
OPENING (about 30 seconds)
"Hi {{greeting}}, this is {{sender}} with CyberSafely.ai. Did I catch you at an okay moment?

I'll be quick. Through our collaboration with MSBA, every 5th through 9th grade family in {{district}} can use CyberSafely.ai free for a full year. CyberSafely.ai is a parent app that alerts parents when their child runs into something dangerous online, like bullying or sextortion. I'd like to get you your schools' sign-up links so your families can start their free year."

QUESTION 1: HOW THEY MONITOR NOW
"Can I ask: how does your district keep an eye on students' safety online today?"
Listen. Then:
"That makes sense. And after the bell, when they're on their own phone at home, how much visibility do parents have?"

QUESTION 2: THEIR TECHNOLOGY
"What technology do your students use? Do your schools have iPads or Chromebooks, and do you use a filter or monitoring tool on them?"
Listen. Then bridge:
"CyberSafely.ai works alongside that. Your filters protect students on school devices and the school network. CyberSafely.ai goes with the child, so parents can get alerts at home as well as at school."

WHAT THE APP DOES (keep it plain)
"Here's how it works. The parent signs up and adds their child. The app runs a smart keyboard on the child's device that checks what's typed across the apps they use for risk signals like bullying, sextortion or self-harm language. If something looks dangerous, the parent gets an alert with how serious it is and enough context to step in. Passwords are never collected, and it's the parent who monitors, not the school, so there's nothing for your staff to run."

THE iPAD ANGLE
"It also works on iPad. If your schools hand out iPads, that's a second way in: the app can go on those devices too, and parents get alerts from the device their child uses for school. If that's interesting, I can walk your tech director through how it would work."

NEXT STEP (ask it as a question, then give the answer)
"So what's the easiest way to get this in front of your parents?"
Let them answer. Then:
"Here's what I'd suggest. I'll email you today with each school's own sign-up link and a parent message that's already written. Your principals forward it in their next parent email or newsletter, and that's it. No contract, no MOU, no cost to the district. Does that work?"

IF YES → mark "Interested / Ready to move forward"
"Great. You'll have the links and the message today. Who's the best person to copy: your communications lead or the principals directly?"
→ Send D4 (school links + the P1 family message). Log any contact names in HubSpot, not in the vault.

IF THEY HAVE QUESTIONS → mark "Needs more information"
Answer only what you know. "If I don't have it, I'll put it in a short summary today." → send F2.

IF NOT READY → mark "Follow-up needed"
"Totally fair. I'll send a one-page summary and the links so they're there when you're ready, and check back in [two weeks]." → send F2, set the call-back.

IF NO → mark "Not interested"
"Understood. Thank you for your time." → send R2.

QUICK ANSWERS
- "Does the district have to sign anything?" → "Nothing. No contract, no MOU, no cost."
- "Is this the school monitoring students?" → "No. Parents sign up and parents get the alerts. The school just shares the link."
- "What about student data?" → "Fair question. I want to give you an accurate answer, so I'll follow up in writing." Don't improvise.
- "We already have a filter." → "Good. Keep it. This adds alerts for parents at home, on the child's own device."

WRAP-UP
"Thanks, {{greeting}}. I'll send everything today."
Ask if they'd like information on the fundraising program. If yes, tick "Wants fundraising info".

NO ANSWER → mark "Unable to reach". Leave the voicemail, then send D3 with the school links right away.
```

## Before using

- ⚠️ **Needs approval (approved-claims is still UNAPPROVED):**
  - the offer (free year, grades 5–9, MSBA collaboration)
  - "no contract, no MOU, no cost"
  - the product description (smart keyboard, any app, bullying / sextortion / self-harm, alerts with severity and context, passwords never collected, parents monitor)
  - "protected at home as well as at school"
  - The product wording comes from the Partner Sales Guide's candidate list.
- ⚠️ **iPad section: confirm with Torino or Neal first.**
  - Confirm the app works on school-managed iPads.
  - Confirm how a school would install it, and whether the charter-school iPad deployment is the model to describe.
  - Until then, keep the iPad part to "it works on iPad" plus the offer of a walkthrough, and don't promise a deployment.
- **"In {{district}}" narrows "every family in Missouri."** Check that the district is covered by MSBA before you say it. Don't call the two "n/a (non-MSBA)" districts.

## Refinement notes

-

---
After refining, run `npm run sync-emails` in the Lead Manager project so C3 shows up in the app. See [[Email Flow]].

---
**Fixes applied (2026-10-16):** cut the unsourced "most districts" line (now a question), softened "in any app" and the at-home/filter coverage lines to "parents can get alerts". Offer, terms, product and iPad lines still need Torino's approval.

## claims-guard review · 2026-10-16
**Verdict:** FAIL

`Company/approved-claims.md` is still UNAPPROVED, so every product claim and term below is a FAIL item: "needs approval from Torino". No PII found (only {{placeholders}}). Entity use is correct (CyberSafely.ai only).

| # | Line / quote | Issue | Fix |
|---|---|---|---|
| 1 | Opening: "every 5th through 9th grade family in {{district}} can use CyberSafely.ai free for a full year" / "Through our collaboration with MSBA" | Offer, grade range, free year and MSBA collaboration are not in the approved list. Terms beyond the Partner Sales Guide. | Needs approval from Torino. Do not use on calls until confirmed. Also confirm the district is MSBA-covered. |
| 2 | Opening: "alerts parents when their child runs into something dangerous online, like bullying or sextortion" | Product claim, unapproved. "Something dangerous" is also fear-leaning. | Needs approval from Torino. After approval, use the approved wording only. |
| 3 | What the app does: "smart keyboard ... checks what's typed, in any app, for risk signals like bullying, sextortion or self-harm language" | Unapproved. "In any app" is an absolute and goes further than the candidate list. | Needs approval from Torino. Drop "in any app" unless the approved list says it. |
| 4 | "the parent gets an alert with how serious it is and enough context to step in" | Unapproved (severity and context alerts). "Enough context to step in" implies an outcome. | Needs approval from Torino. Use the approved alert wording only. |
| 5 | "Passwords are never collected" | Unapproved; "never" is absolute. | Needs approval from Torino. |
| 6 | "it's the parent who monitors, not the school, so there's nothing for your staff to run" | "Parents monitor" is unapproved. "Nothing for your staff to run" is an extra operational promise. | Needs approval from Torino. Remove the staff-workload promise unless confirmed. |
| 7 | Bridge: "goes with the child, so they're protected at home as well as at school" | Protection claim, unapproved; reads as a guarantee. | Needs approval from Torino. Soften to approved wording (for example, "helps parents know"). |
| 8 | "Most districts have strong protection while kids are at school. The gap is what happens after the bell" | Unsupported factual claim with no source or baseline. Mildly fear-framed. | Remove "most districts have strong protection". Ask the question and let them describe their setup. |
| 9 | iPad angle: "the app can go on those devices too, so the device a student uses for school is covered at home as well" | Unconfirmed capability and a deployment implication. Your own note says to confirm with Torino or Neal. | Needs approval from Torino. Until then use only "it works on iPad" plus the walkthrough offer, if even that is confirmed. |
| 10 | Next step and Quick answers: "No contract, no MOU, no cost to the district" / "Nothing. No contract, no MOU, no cost." | Terms and promises not in the Partner Sales Guide. | Needs approval from Torino. Do not state until confirmed. |
| 11 | "We already have a filter" answer: "This covers the hours and devices the filter doesn't reach." | Coverage claim, unapproved; sounds absolute. | Needs approval from Torino. Rephrase to "works alongside" only after approval. |
| 12 | Wrap-up: "information on the fundraising program" | The program is not defined in the approved claims or guide, and could be mixed up with the Foundation (nonprofit). Guide terms are 20% to the school only. | Confirm which entity runs it and that it matches the Partner Sales Guide. Quote no numbers or terms on the call. |
| 13 | "Is this the school monitoring students?" answer: "Parents sign up and parents get the alerts." | Part of the unapproved "parents monitor" claim. | Needs approval from Torino. |

**Minor tone notes (not failing):**
- The grade 8 reading level and calm tone are mostly good. Using "sextortion" and "self-harm" up front may alarm a superintendent, so consider leading with the parent benefit.
- The close is one clear ask. Keep it as the only next step and don't add the iPad walkthrough as a second ask.
- Good: the "student data" answer defers to writing and avoids improvising. Keep it.

**Next step:** get Torino to confirm or remove items 1 to 13, then re-run claims-guard.
