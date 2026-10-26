---
date: 2026-10-15
type: draft
outcome: "02"
status: draft
template_id: e0b
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[E0 · Curiosity opener - question only (day 0)]]"
---
# E0B · Curiosity opener: group send, BCC 25 (day 0)

**Use case:** The same email as [[E0 · Curiosity opener - question only (day 0)]], written for **Bulk email → one Outlook draft, up to 25 in BCC**. Everyone gets identical text, so it has **no personal tokens** (`{{greeting}}`, `{{first}}`, `{{school}}`). Those would fill in with the first school's details for all 25. Only `{{sender}}` and `{{phone}}` are used, because they come from Settings and are the same for everyone.

**When it's sent:** Day 0 to Cold principals, in batches of up to 25. Use [[E0 · Curiosity opener - question only (day 0)]] when sending one by one (more personal, better deliverability).

**After a reply:** same as E0. Reply personally with the school's name, then send E1 or R1. No reply: day 4 call + E2, day 10 E3.

**Stage after logging as sent:** Contacted

## Differences from E0

- "Hi {{greeting}}" → "Hello,"
- "{{school}}'s 5th through 9th graders" → "your 5th through 9th graders", and "{{school}}" → "your school"
- One line added: "I'm putting the same question to a group of Missouri principals this week". It says plainly that this is a group send, and it makes replying feel like sharing an answer, not starting a sales call.
- An unsubscribe line is added just above the signature, because this is a bulk cold send.

## Subject

```text
How many phones are in your students' backpacks right now?
```

Alternates: `A quick question about your 5th–9th graders` · `Who's on hall duty after 3 PM?`

## Body

```text
Hello,

Quick question about your students: how many of your 5th through 9th graders do you think have a phone in their backpack right now? (I'm guessing the honest answer is "most of them.")

Your staff can see the hallways, the cafeteria and, on a good day, the back row of the bus. The group chat at 10 PM is harder for anyone to see.

So I'm curious, and I'm putting the same question to a group of Missouri principals this week: how is children's safety monitored within your school? And once the hallway moves online after the last bell, who keeps an eye on it? Counselors, parents, or someone else?

I ask because I'm with CyberSafely.ai. Through a collaboration with MSBA, Missouri parents of 5th through 9th graders can use our parent-run app for a full year with no payment required. The school wouldn't need to run or monitor anything. Before I tell you more, I'd love to hear how your school handles this today.

A one-line reply is plenty. If this isn't your area, tell me who handles it and I'll bother them instead.

If you'd rather not hear from me, reply "unsubscribe" and I'll take you off my list.

Thanks,
{{sender}}
{{title}}, CyberSafely.ai
{{phone}}
{{mailing_address}}
```

## Open before sending

- ⚠️ **Needs approval:** the MSBA collaboration, "grades 5–9", "a full year", "no payment required" and "parent-run app". The approved-claims list is still UNAPPROVED.
- ⚠️ **Billing check:** if parents enter a card for the free year, change "no payment required" to "at no cost to the school or families for the first year".
- ⚠️ **Always BCC, never To or CC.** Otherwise 25 principals see each other's addresses.
- ⚠️ **Real postal address (blocker).** Replace `[CyberSafely.ai mailing address]` with the company's physical address from Torino. Commercial email can't go out without one (CAN-SPAM).
- ⚠️ **Honor unsubscribes.** Any "unsubscribe" or "no thanks" reply goes on a do-not-contact list the same day (the legal limit is 10 business days). In the app, mark it Declined so E2, E3 and the day 4 call are cancelled.
- ⚠️ **Send from a cybersafely.ai address** you actually check, not Gmail or the Foundation domain. The unsubscribe works by reply.
- ⚠️ **BCC mechanics:** put your own address in To, and check Outlook's recipient limit before pasting 25.
- ⚠️ Check against Mike Nutter's and the MSBA lists so no principal gets two first emails.
- Optional (claims-guard): say who's writing earlier, e.g. move "I'm with CyberSafely.ai" closer to the top. It isn't required, because the company is named in the body and the signature, and moving it weakens the curiosity opening.

## Refinement notes

- 
