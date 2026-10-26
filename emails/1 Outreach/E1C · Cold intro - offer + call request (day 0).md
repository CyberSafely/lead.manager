---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
template_id: e1c
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[E1 · First email + family message (day 0)]], [[Outreach email 2]], [[Outreach email 3]]"
---
# E1C · Cold intro: offer + call request (day 0)

**Use case:** First contact with principals who have **not** received Mike Nutter's email (Torino's list of 28). It introduces CyberSafely.ai, the MSBA collaboration and the free year, then asks for a short call about onboarding their families.

**When it's sent:** Day 0, in place of [[E1 · First email + family message (day 0)]] for this group. The lead is **Cold**.

**Why:** These principals have no prior context, so a cold email that asks them to forward something has nothing to stand on. A short call builds the relationship first. On the call you set up delivery ([[C1 · Call script - principal opened the email]] from "The good news" onward), then send [[F1 · Interested - next steps]].

**Stage after logging as sent:** Contacted

## Notes

- **Don't mention Mike Nutter's email** to this group. They haven't seen it.
- **Follow-ups for this group:** [[E2 · After a call attempt (day 4)]] mentions Torino's message and Mike Nutter's email. For these 28, change its "A little about me" line to: *"I'm {{sender}}, and I work with Torino Fitzgerald on the CyberSafely.ai team. I emailed you recently about the free year of CyberSafely.ai for your 5th through 9th grade families."*
- Set the company mailing address in the app's **Profile** tab. It fills `{{mailing_address}}` (required in commercial email).
- Times: Missouri is Central. You're on Eastern/PR time, 1 h ahead until Nov 1, 2 h after.

## Subject

```text
A free year of CyberSafely.ai for {{school}} families
```

A/B alternate: `{{school}} families + MSBA: a free year of online safety`

## Body

```text
Hi {{greeting}},

I'm {{sender}} with CyberSafely.ai, and I'm reaching out with some good news for {{school}}.

Through CyberSafely.ai's collaboration with MSBA, every 5th through 9th grade family in Missouri can use CyberSafely.ai free for one full year. That includes your families at {{school}}.

CyberSafely.ai is an app for parents. It alerts them early if their child may be facing something serious online, like bullying, grooming or sextortion, so they can step in before it escalates.

For your school, it's simple: no contract, no MOU, no cost. We've already written the message for families and set up {{school}}'s own sign-up link. My job is to make getting it to your parents as easy as possible.

I'd love 15 minutes to walk you through it and plan how we get your families onboarded. I promise it'll be the shortest meeting on your calendar this week.

Just reply with a day and time that works for you (Central time is perfect) and the best number to reach you, and I'll call you then.

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}
{{mailing_address}}

P.S. If someone else at {{school}} handles family communication, I'm happy to talk with them instead. Just point me their way. And if this isn't a fit, reply "no thanks" and I won't follow up.
```

## Why it's written this way

- **Very similar to E1.** It uses the same offer lines, the same company product wording ([[Outreach email 3]]) and the same MSBA reassurance ("no contract, no MOU, no cost"), so all outreach sounds like one voice.
- **Leads with good news, not a pitch.** "Reaching out with some good news for {{school}}" frames it as something they already have, not something to buy.
- **One clear ask: reply with a time.** It's not "let me know if you're interested", which is easy to ignore. A specific, small action (a day, a time, a number) gets more replies than an open question.
- **Lowers the cost of the call.** "15 minutes" plus a light line ("the shortest meeting on your calendar this week") makes yes easy.
- **"We've already written the message"** shows the work is done, so the call is about logistics, not convincing.
- **The P.S. does two jobs.** It catches the wrong-person problem early (a referral to whoever handles family communication), and it keeps the opt-out.
- **No delivery choice.** Per Torino, the email doesn't ask whether the school or we should send it. That's settled on the call.

## Open before sending

- ⚠️ The offer lines (free year, grades 5–9, MSBA collaboration, no contract/MOU/cost) and the product line **need approval** while the approved-claims list is UNAPPROVED. They match the company's own emails.
- ⚠️ "Set up {{school}}'s own sign-up link": confirm every school on the list has its own link (or one Missouri link) before you say this.
- ⚠️ Confirm with Torino that sending to principals who haven't had Mike Nutter's email is OK without the MSBA/Mike notice going first.

## Refinement notes

- 
