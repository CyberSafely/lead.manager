---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: e1
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# E1 · First email + family message (day 0)

**Use case:** First contact with a principal. Delivers the offer and a ready-to-forward family message in one email.

**When it's sent:** Day 0. The lead is **Cold** (not contacted yet). The app suggests it for every new lead.

**Why:** One email gives the school everything it needs: the offer, the reassurance (no contract, no MOU, no cost) and the family message with the sign-up link built in. Delivery is already decided: the school forwards it, or we send it if they hand us a contact. The principal is never asked to choose.

**Stage after logging as sent:** Contacted

## Notes

- Embeds [[P1 · Family message (forwarded by the school)]] as `{{parent_email}}`.
- Set the company mailing address in the app's **Profile** tab. It fills `{{mailing_address}}` (required in commercial email).
- Next step in the app: day 4 call. No answer → [[Voicemail script (~20 s)]] + [[E2 · After a call attempt (day 4)]].

## Subject

```text
Your {{school}} family message is ready
```

A/B alternate: `Following up on Mike Nutter's note: {{school}}`

## Body

```text
Hi {{greeting}},

Following up on Mike Nutter's note: through CyberSafely.ai's collaboration with MSBA, every 5th through 9th grade family at {{school}} gets a free year of CyberSafely.ai.

It's a parent app that flags trouble early, like bullying, grooming or sextortion, so parents can step in before it escalates.

We've already done the work. The message for your families is below, with {{school}}'s sign-up link built in. Forward it to your 5th–9th grade parents in your next email or newsletter, and that's it.

Office stretched thin? Reply with your PTA or parent contact and we'll send it ourselves. Either way, your families get it.

It may be the easiest yes on your desk this week: no contract, no MOU, no cost. Just one forward.

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}
{{mailing_address}}

P.S. Not a fit for {{school}}? Reply "no thanks" and I'll close the loop.

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}
```

## What changed and why

- **No choice question.** The old ending asked "Would you rather we send it for you…?". Now it gives one action (forward it) with a fallback (we send it). The decision is already made: families get it either way.
- **Opens on Mike Nutter's note.** Principals already got his message, so the first line ties into something they recognize. That's continuity, not a cold pitch.
- **Subject implies the work is done** ("is ready"). Ownership words ("Your {{school}}") and the school name lift opens. Test it against the alternate.
- **Michelle Kruse's (MSBA) reassurance** is kept, compressed to "no contract, no MOU, no cost". It sits right before the ask, where it lowers the risk of saying yes.
- **Product line uses the company's own wording** from Torino's emails (bullying, grooming, sextortion, before it escalates).
- **The opt-out moved to a P.S.** P.S. lines get read, and it keeps the main body on the yes.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Free online-safety app for {{school}} families

Hi {{greeting}},

I'm {{sender}} with CyberSafely.ai. Through a collaboration with MSBA, families of every 5th through 9th grader in Missouri can use CyberSafely.ai free for one year. That includes families at {{school}}.

CyberSafely.ai is an app for parents. It alerts them when their child may be facing something serious online, like cyberbullying, so they can step in early.

There's nothing to sign and no cost to the school. The only ask: forward the message below to your 5th–9th grade families, by email, newsletter or however you usually reach them. Your school's sign-up link is already in it.

Would you rather we send it for you, or have questions first? Just reply, and I'm happy to do a quick call.

If this isn't a fit for {{school}}, reply "no thanks" and I won't follow up.

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}
{{mailing_address}}

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
