---
date: 2026-10-14
type: draft
outcome: "01"
status: draft
template_id: pt1
kind: Email
phase: "5 · PTA"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[E1C · Cold intro - offer + call request (day 0)]], [[D1 · District cold intro]]"
---
# PT1 · PTA cold intro: ask to send info (BCC send)

**Use case:** First contact with PTA / PTO leaders on the **PTA** list. They aren't all in Missouri, so the email has **no state offer and no MSBA mention**. It introduces CyberSafely.ai, makes the case for online safety, and asks for a short reply so we can start a conversation about onboarding their families.

**How to send:** Bulk from the Lead Manager (PTA → Schools → Bulk email → PT1). Put the addresses in **BCC** and your own address in **To**. It has no names or school merge fields, so one email works for everyone.

**When it's sent:** Day 0. The contact is **Cold**. After logging it moves to **Contacted**.

## Subject

```text
Helping your families stay safer online
```

A/B alternate: `Quick question for your PTA about online safety`

## Body

```text
Hi there,

I'm {{sender}} with CyberSafely.ai. I'm reaching out to PTA and PTO leaders because you're the people families already trust, and online safety is something almost every parent is thinking about right now.

A lot of a child's life happens on a phone now, and it can be hard for parents to know when something is wrong, like bullying or unwanted contact from a stranger.

That's why we built CyberSafely.ai. It's an app for parents that alerts them if their child may be facing something serious online, so they can step in and talk with their child.

I'd love to introduce CyberSafely.ai to your PTA, hear what your parents are asking about online safety, and talk about how we could help your families get set up.

Would you be open to that? Just reply "yes" and I'll send a short overview you can share with your board. From there, we can find a time to talk about what would work best for your families.

Thank you for everything you do for your school's families,
{{sender}}
CyberSafely.ai
{{phone}}
{{mailing_address}}

P.S. If someone else on your board handles family communication, feel free to forward this to them. And if it's not a fit, reply "no thanks" and I won't follow up.
```

## Why it's written this way

- **Works in any state.** No free year, no MSBA, no grade range, no pricing. It's about getting to know the company and starting a conversation.
- **Opens with why them.** PTA leaders are trusted by families. Saying so explains the cold email in one line.
- **Makes the case before the product.** The second paragraph names a worry parents share, without statistics or claims that need a source.
- **The product line is shorter and calmer than E1C's.** It drops "grooming", "sextortion" and "before it escalates", which claims-guard flagged as heavy and unsupported for a cold email to volunteers.
- **One small ask.** Replying "yes" takes one word. The call comes after they reply, not in this email.
- **Two-way.** "Hear what your parents are asking" invites a reply even from someone who isn't ready to commit.
- **BCC-safe.** "Hi there" and no `{{school}}` or `{{first}}` tokens, so the same text works for every PTA in one Outlook draft.
- **The P.S. handles the wrong person and the opt-out.**

## After a reply

- **"Yes":** send the overview and offer a 15-minute call, then mark them **Engaged** in the app. Ask Torino which overview to send to PTAs outside Missouri, because the Missouri materials ([[P1 · Family message (forwarded by the school)]]) mention the MSBA offer.
- **"No thanks":** mark **Declined**. Don't follow up.

## Open before sending

- ⚠️ **Needs approval:** the product line ("alerts them if their child may be facing something serious online, so they can step in") and "how we could help your families get set up" (the approved-claims list is still UNAPPROVED). If Torino prefers, use the A/B subject, which makes no claim.
- ⚠️ **PTA as a channel:** confirm with Torino that PTAs (including ones outside Missouri) are OK to contact, and what offer or pricing applies outside Missouri before you reply to anyone.
- ⚠️ `[CyberSafely.ai mailing address]` needs a real address (required in commercial email).
- Send in batches of 25 or fewer (the app's BCC limit), mornings Tue–Thu in the recipient's time zone.

## Refinement notes

- 
