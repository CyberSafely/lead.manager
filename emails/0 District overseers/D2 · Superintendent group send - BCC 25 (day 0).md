---
date: 2026-10-16
type: draft
outcome: "02"
status: draft
template_id: d2
kind: Email
phase: "0 · District overseers"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[C3 · Call script - superintendent]] · [[E0B · Curiosity opener - group send, BCC 25 (day 0)]] · [[D1 · District cold intro]]"
---
# D2 · Superintendent group send: BCC 25 (day 0)

**Use case:** A cold email to up to 25 superintendents and district overseers in one send. It is the [[C3 · Call script - superintendent]] written as an email, in the question-first style of [[E0B · Curiosity opener - group send, BCC 25 (day 0)]]. It replaces [[D1 · District cold intro]] for districts that haven't had an email yet.

**How to send:** **Bulk email → one Outlook draft, up to 25 in BCC.** Your own address goes in To. Everyone gets the same text, so it has **no personal tokens** (`{{greeting}}`, `{{district}}`, `{{school}}`). Only `{{sender}}` and `{{phone}}` are used, because they come from Settings.

**After a reply:** treat the reply like the call. Their answers to the two questions tell you which part to stress.
- Wants it → email each school's sign-up link (from the overseer drawer) and the [[P1 · Family message (forwarded by the school)]] the same day.
- Has questions → [[F2 · Needs info or not ready - short summary]], or offer a call and use C3.
- Not now → F2, set a call-back in two weeks.
- No → [[R2 · Not interested]], mark Declined.
- No reply → call on day 4 with C3.

**Stage after logging as sent:** Contacted

## Same structure as C3

| C3 call section | D2 email paragraph |
|---|---|
| Opening: who, the offer, one line on the app | Para 1 |
| Question 1: how they monitor now, and after the bell | Question 1 |
| Question 2: their technology and filters | Question 2 |
| Bridge: works alongside the filter | "I ask because…" |
| What the app does | "Here's how it works" |
| iPad angle | One line, no promise |
| Next step asked as a question | "What's the easiest way…?" |
| Quick answers (contract, who monitors) | Folded into the how-it-works and next-step paragraphs |

## What's better than D1

- **It asks, it doesn't announce.** D1 was a heads-up that ended with "nothing is needed from you". D2 opens two questions a superintendent can answer in one line, which is the E0 approach that gets replies.
- **One ask.** It ends with C3's closing question, and the only action is a short reply. The iPad walkthrough is not a second ask (claims-guard flagged this on C3).
- **No district-by-district facts.** It doesn't say "last week I emailed your principals" (only true for some districts), so it is safe for all 25.
- **Uses the softened C3 wording.** "Parents can get alerts at home too", not "protected" or "covers every hour".
- **Says plainly it's a group send.** "I'm writing to a group of Missouri superintendents this week" keeps BCC honest and makes replying feel like sharing an answer.

## Subject

```text
How does your district keep an eye on students online after the bell?
```

Alternates: `Two quick questions about your 5th–9th graders` · `A free year of CyberSafely.ai for your district's families`

## Body

```text
Hello,

I'm {{sender}} with CyberSafely.ai, and I'll keep this short. Through our collaboration with MSBA, Missouri families of 5th through 9th graders can use CyberSafely.ai free for a full year. It's a parent app that alerts parents when their child may be facing something serious online, like bullying or sextortion. I'm writing to a group of Missouri superintendents this week so your schools can each get their own sign-up link.

Before I say more, two quick questions:

1. How does your district keep an eye on students' safety online today? And after the bell, when they're on their own phone at home, how much can parents see?

2. What do your students use: iPads, Chromebooks or both? And do you run a filter or monitoring tool on them?

I ask because CyberSafely.ai works alongside what you already have. School filters cover school devices and the school network. CyberSafely.ai goes with the child, so parents can get alerts at home too.

Here's how it works. The parent signs up and adds their child. A smart keyboard on the child's device checks what's typed for risk signals like bullying, sextortion or self-harm language. If something looks serious, the parent gets an alert. Passwords are never collected, and the parents do the monitoring, not the school. It also works on iPad.

For the district, there's no contract, no MOU and no cost. I send each school its sign-up link and a parent message that's already written, and your principals share it in their next parent email or newsletter.

So what's the easiest way to get this in front of your parents? A one-line reply is plenty. If someone else handles family communication, point me their way and I'll reach out to them.

If you'd rather not hear from me, reply "unsubscribe" and I'll take you off my list.

Thanks,
{{sender}}
{{title}}, CyberSafely.ai
{{phone}}
{{mailing_address}}
```

## Before sending

- ⚠️ **Ask Torino first.** District outreach was a deliberate choice by him and Neal (see D1). Get his OK on sending to superintendents at all.
- ⚠️ **Needs approval (approved-claims is still UNAPPROVED):**
  - the offer (MSBA collaboration, grades 5–9, free full year)
  - "no contract, no MOU and no cost"
  - the product lines (parent app, alerts, smart keyboard, bullying / sextortion / self-harm, passwords never collected, parents monitor)
  - "works alongside" your filter, and "parents can get alerts at home too"
  - "It also works on iPad": confirm with Torino or Neal, or cut the sentence.
- ⚠️ **Check the sign-up links:** confirm every school in these districts has its own link before you say "each school its sign-up link".
- ⚠️ **MSBA coverage:** send only to MSBA-covered districts. Skip the two "n/a (non-MSBA)" rows.
- ⚠️ **Always BCC, never To or CC.** Otherwise 25 superintendents see each other's addresses.
- ⚠️ **Real postal address (blocker).** Replace `[CyberSafely.ai mailing address]` with the company's physical address (CAN-SPAM).
- ⚠️ **Honor unsubscribes** the same day: mark the overseer Declined so the day 4 call is cancelled.
- ⚠️ **Don't double up:** skip districts that already got D1. Send from a cybersafely.ai address you check.
- Log the send on each overseer record in the Lead Manager and in HubSpot.

## Refinement notes

-

---
## claims-guard review · 2026-10-16
**Verdict:** FAIL

`Company/approved-claims.md` is still UNAPPROVED, so every product claim and term below is a FAIL item: "needs approval from Torino". No PII found (only {{sender}} and {{phone}} placeholders). Entity use is correct (CyberSafely.ai only; MSBA named as collaborator; Foundation not mentioned).

| # | Line / quote | Issue | Fix |
|---|---|---|---|
| 1 | "Through our collaboration with MSBA, Missouri families of 5th through 9th graders can use CyberSafely.ai free for a full year." | Offer, grade range, free year and MSBA collaboration are not in the approved list or the Partner Sales Guide. "Missouri families" is broad and only true for MSBA-covered districts. | Needs approval from Torino. Confirm MSBA is fine with being named and narrow the scope to what MSBA covers. |
| 2 | "A parent app that alerts parents when their child may be facing something serious online, like bullying or sextortion." | Product claim, unapproved. | Needs approval from Torino. Use approved wording only once the list is confirmed. |
| 3 | "School filters cover school devices and the school network. CyberSafely.ai goes with the child, so parents can get alerts at home too." / "works alongside what you already have" | Unapproved coverage and compatibility claim. The statement about the district's own filters is an unsupported factual claim about tools you haven't seen. | Needs approval from Torino. Cut the sentence about what the filters do, or phrase it as a question. |
| 4 | "A smart keyboard on the child's device checks what's typed for risk signals like bullying, sextortion or self-harm language. If something looks serious, the parent gets an alert." | Unapproved (matches pending Sales Guide rows only). | Needs approval from Torino. Use approved wording only. |
| 5 | "Passwords are never collected" | Unapproved, and "never" is an absolute. | Needs approval from Torino. |
| 6 | "the parents do the monitoring, not the school" | Unapproved "parents monitor" claim. | Needs approval from Torino. |
| 7 | "It also works on iPad." | Unconfirmed capability. Your own "Before sending" notes say to confirm with Torino or Neal. | Confirm with Torino or Neal, or cut the sentence. |
| 8 | "there's no contract, no MOU and no cost" | Terms promise beyond the Partner Sales Guide. | Needs approval from Torino. Do not state until confirmed in writing. |
| 9 | "so your schools can each get their own sign-up link" / "I send each school its sign-up link" | Unverified fact for 25 districts. | Verify every school has a link, or change to "I can send sign-up links". |
| 10 | Alternate subject: "A free year of CyberSafely.ai for your district's families" | Offer claim in the subject line (same as item 1). Subjects are the most-read line. | Do not use until item 1 is approved. |
| 11 | Mailing address `[CyberSafely.ai mailing address]` | Placeholder still in the signature. A commercial email needs a real postal address. | Replace with the company's physical address before sending. |

**Passed**
- Entity: CyberSafely.ai is the sender and company. No Foundation mention.
- PII: none. Group send uses BCC and no personal tokens.
- Pricing: no dollar figures, no revenue or commission talk.
- Absolutes: none beyond item 5 ("guarantees", "100%" not used).
- Metrics: none quoted.
- Unsubscribe line is present. Good.

**Tone suggestions (not blocking)**
- Reading level is about grade 8 and the tone is calm. Good.
- Leading with "bullying or sextortion" in paragraph 1 and "self-harm" in the how-it-works paragraph may alarm a superintendent. Consider leading with the parent benefit and keeping the specifics for a reply.
- The ask is one clear step. The aside "point me to someone else" is a gentle alternative, not a second ask. Keep it short. Two questions plus the next-step question is a lot for a one-line reply, so consider asking the next-step question only once.
- Torino's OK on district outreach is still needed (noted in "Before sending").

Not ready to send. Clear items 1-9 (all need Torino's approval) and 11, then re-run claims-guard.
