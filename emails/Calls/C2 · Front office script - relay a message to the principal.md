---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
template_id: c2
kind: Script
phase: "Calls"
stage_after_send: no change
outbound: true
source: "[[Outreach email 2]], [[Outreach email 3]], [[C1 · Call script - principal opened the email]]"
---
# C2 · Front office script: relay a message to the principal

**Use case:** You call the school and reach the receptionist or front office. The goal is a clear message on the principal's desk, plus the name of whoever sends news to families.

**When it's used:** Any outreach call where the principal doesn't pick up directly: the day-4 call, or calls from Torino's opened-email list. If you're put through, switch to [[C1 · Call script - principal opened the email]].

**Why:** Front offices screen out vendors. This call isn't a pitch. It follows up on something the school has already received: Mike Nutter's note about the free year for 5th–9th grade families, arranged through MSBA. Sound like a colleague closing a loop, not someone selling.

## Tone rules

- **Follow up, don't introduce.** Say "following up on Mike Nutter's note", never "I'd love to tell you about…".
- **Words that trip a vendor filter:** offer, deal, demo, opportunity, "quick pitch", "partner with you". Use: follow-up, the free year, MSBA, your families.
- **Under 30 seconds** before the ask. Receptionists are juggling phones, parents and late arrivals.
- **Get their name and use it.** It's polite, and it's who you'll ask for next time. Log it in HubSpot, not the vault.
- **Best times (Central):** about 9:30–11:00 AM and 1:00–2:30 PM. Avoid arrival, lunch and dismissal. That's 10:30 AM–12:00 PM and 2:00–3:30 PM Eastern/PR until Nov 1, then an hour later.

## Script

```text
OPENING
"Hi, good morning! This is {{sender}} with CyberSafely.ai. Who am I speaking with?

Thanks, [name]. I'm following up on an email {{greeting}} received from Mike Nutter, about the free year of CyberSafely.ai that MSBA arranged for your 5th through 9th grade families. Is {{greeting}} available for just a minute?"

IF THEY PUT YOU THROUGH → switch to C1.

IF THE PRINCIPAL IS UNAVAILABLE (most calls)
"No problem at all. Could I leave a quick message for them?

It's {{sender}} from CyberSafely.ai, following up on Mike Nutter's email about the free year for your 5th through 9th grade families. Nothing for the school to sign or pay. The message for parents is already written and ready to go. They can reach me at {{phone}}, or just reply to the email."

[Pause and let them write it down. Offer to spell CyberSafely, and read the number back slowly.]

THE HELPFUL QUESTION (ask every time)
"One more thing, [name], and you'd probably know this better than anyone: who usually sends the parent newsletter or family emails there? Is that the office, a counselor, or the PTA?"

[If they name someone: "Perfect. Would it be all right if I sent them the family message too, so it's ready when {{greeting}} gives the go-ahead?"]

BEST TIME
"When's {{greeting}} usually easiest to catch: mornings, or after lunch?"

CLOSE
"Thank you so much, [name]. I'll send {{greeting}} a short email today too, so it's all in one place. Have a great rest of your day!"
```

## If the front office says…

```text
"What is this regarding?"
→ "I'm following up on an email {{greeting}} got from Mike Nutter, about the free year for your 5th through 9th grade families through MSBA. It's already set up for your school. I'm just making sure it reaches parents."

"Are you selling something?" / "We don't take vendor calls."
→ "Totally understand, you must get a lot of those. There's nothing for the school to buy or sign. It's a follow-up on the free year MSBA arranged for your families. I just want to make sure {{greeting}} saw Mike's email."

"Just send an email."
→ "Happy to. Is {{greeting}}'s email still [their email from HubSpot]? I'll mention that we spoke so it doesn't get lost."

"They're not interested." (from the receptionist)
→ "Understood, thank you for letting me know. Would you mind if I sent one short email, so they have it if anything changes?" Then log it as a front office message, not Declined, unless the principal said it.

"Who's MSBA?"
→ "The Missouri School Boards' Association. They worked with CyberSafely.ai to make this free for 5th through 9th graders statewide."

"What is CyberSafely.ai?"
→ "It's an app for parents. It alerts them early if their child may be facing something serious online, like bullying, so they can step in. The school doesn't run anything. Parents just sign up."
```

## Voicemail (if the line goes to the principal's voicemail instead)

Use [[Voicemail script (~20 s)]].

## After the call

1. **Log it in HubSpot and the Outreach Manager:** activity "Front office message". Add the receptionist's name, the best time to call, and any family-communication contact. **Contact details go in HubSpot only, never in the vault.**
2. **Same day, send the follow-up email.** That's [[E2 · After a call attempt (day 4)]] for the standard sequence, or [[F3 · Unable to reach - after voicemail]] for the opened-email list. Swap the voicemail line for: *"I called today and left a message with your front office, so here's the written version."*
3. If they named a newsletter or family contact, note it on the lead. Send them the family message only after the principal OKs it, or as soon as Torino approves the data-handling wording.
4. **Call back** at the time they suggested. Ask for the receptionist by name: "Hi [name], it's {{sender}} again from CyberSafely.ai…"

## Notes

- ⚠️ "Nothing for the school to sign or pay", "the free year", "already set up for your school" and the one-line product description **need approval** while the approved-claims list is UNAPPROVED. They match the company's own emails ([[Outreach email 2]], [[Outreach email 3]]).
- ⚠️ Confirm with Torino that "Missouri School Boards' Association" is the right name to use for MSBA on calls, and that Mike Nutter's email reached every school on your list.
- If someone mentions a specific student or family, don't take notes. Say "I'm not the right person for that, but I'll make sure someone who is gets back to you", and tell Torino the same day.

## Refinement notes

- 
