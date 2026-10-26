---
date: 2026-10-15
type: draft
outcome: "02"
status: draft
template_id: e0
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[2026-10-15-principal-cold-email-p1]]"
---
# E0 · Curiosity opener: question only (day 0)

**Use case:** First contact with a cold principal when the only goal is a **reply**. It asks about their students and how child safety is monitored, and mentions MSBA and no payment only to explain why we're asking. It doesn't pitch the product, include the family message or ask for a call.

**When it's sent:** Day 0, as an alternative to [[E1 · First email + family message (day 0)]] or [[E1C · Cold intro - offer + call request (day 0)]]. The lead is **Cold**. Good for an A/B test against E1C in the next batch.

**After a reply:** thank them and mirror one thing they said, then send E1 (family message + link), or [[R1 · Has questions or wants a call]] if they want to talk. If they name someone else, email that person. No reply: day 4 call + [[E2 · After a call attempt (day 4)]], day 10 [[E3 · Last email - right person (day 10)]].

**Stage after logging as sent:** Contacted

## Notes

- claims-guard reviewed it Oct 15. No PII, pricing or entity problems. The tone fixes are in. It suggested dropping "within the school"; that phrase was kept on purpose, and "the school wouldn't need to run or monitor anything" makes clear the app is parent-run.
- Set the company mailing address in the app's **Profile** tab. It fills `{{mailing_address}}` (required in commercial email).
- Draft and reasoning: [[2026-10-15-principal-cold-email-p1]]. Section index: [[Principals]].

## Subject

```text
How many phones are in {{school}}'s backpacks right now?
```

Alternates: `A quick question about your 5th–9th graders` · `Who's on hall duty after 3 PM?`

## Body

```text
Hi {{greeting}},

Quick question about your students: how many of {{school}}'s 5th through 9th graders do you think have a phone in their backpack right now? (I'm guessing the honest answer is "most of them.")

Your staff can see the hallways, the cafeteria and, on a good day, the back row of the bus. The group chat at 10 PM is harder for anyone to see.

So I'm curious: how is children's safety monitored within the school? And once the hallway moves online after the last bell, who keeps an eye on it? Counselors, parents, or someone else?

I ask because I'm with CyberSafely.ai. Through a collaboration with MSBA, Missouri parents of 5th through 9th graders can use our parent-run app for a full year with no payment required. The school wouldn't need to run or monitor anything. Before I tell you more, I'd love to hear how {{school}} handles this today.

A one-line reply is plenty. And if this isn't your area, tell me who handles it and I'll bother them instead.

Thanks,
{{sender}}
{{title}}, CyberSafely.ai
{{phone}}
{{mailing_address}}
```

## Open before sending

- ⚠️ **Needs approval:** the MSBA collaboration, "grades 5–9", "a full year", "no payment required" and "parent-run app". The approved-claims list is still UNAPPROVED.
- ⚠️ **Billing check:** if parents enter a card for the free year, change "no payment required" to "at no cost to the school or families for the first year".
- ⚠️ Check against Mike Nutter's and the MSBA lists so no principal gets two first emails.

## Refinement notes

- 
