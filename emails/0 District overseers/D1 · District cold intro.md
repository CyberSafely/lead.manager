---
date: 2026-10-13
type: draft
outcome: "02"
status: draft
template_id: d1
kind: Email
phase: "0 · District overseers"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[E1C · Cold intro - offer + call request (day 0)]]"
---
# D1 · District cold intro (BCC send)

**Use case:** A cold intro to the district leaders over the 28 principals emailed last week (11 unique district contacts). It tells them about the offer, says their principals have heard from us, and offers a short call.

**How to send:** Put the district emails in **BCC**. Put your own address in **To**. It has no names or school merge fields, so one email works for everyone.

**Why the district level:** Your Notion tracker records that a superintendent heads-up was being considered. The aim is that district leaders hear about the outreach from us first, not from a principal or the press. The same note warns it must read as a heads-up, not an approval request, because the campaign was redesigned away from asking superintendents first. This draft keeps the call optional for that reason.

## Subject

```text
A free year of CyberSafely.ai for your district's families
```

A/B alternate: `Heads-up: free online-safety year for your 5th–9th grade families`

## Body

```text
Hello,

I'm Giancarlo with CyberSafely.ai. I wanted to give you a quick heads-up about some good news for families in your district.

Through CyberSafely.ai's collaboration with MSBA, every 5th through 9th grade family in Missouri can use CyberSafely.ai free for one full year.

CyberSafely.ai is an app for parents. It alerts them early if their child may be facing something serious online, like bullying, grooming or sextortion, so they can step in before it escalates.

Last week I reached out to principals in your district so their families can sign up. For schools, there's no contract, no MOU and no cost. We've already written the message for families, and each school has its own sign-up link.

Nothing is needed from you. If you'd like a quick 15-minute walkthrough, just reply with a good day and time (Central time) and I'll call you.

Thank you,
Giancarlo Zaccardelli
```

## What's different from the principal email (E1C)

- **Written for BCC.** It opens with "Hello" and has no `{{school}}` or name fields, so it works for every recipient.
- **A heads-up, not an ask.** "Nothing is needed from you" keeps it from reading as an approval request. Sharing it or taking a call are both optional.
- **Mentions the principal outreach.** District leaders hear it from us first, which was the reason for the superintendent email idea.
- **Same offer and product wording as E1C,** so all outreach sounds like one voice.

## Before sending

- ⚠️ **Needs approval:** the offer lines (free year, grades 5–9, MSBA collaboration, no contract/MOU/cost) and the product line. Approved-claims is still UNAPPROVED. The wording matches the company's own emails.
- ⚠️ **Ask Torino first.** District outreach was a choice he and Neal made on purpose ("superintendent alert email: under consideration"). Get his OK before it goes out.
- ⚠️ **Check the sign-up links:** confirm every school has its own link before saying "each school has its own sign-up link". If not, cut that phrase.
- Phone and logo come from the Outlook signature. The body no longer has a mailing address or the "no thanks" P.S.; commercial email needs a postal address, so check the signature covers it.
- **Don't send it to the two "n/a (non-MSBA)" rows.**
- **Sending 11 BCC recipients from Gmail or Outlook** is fine. If you send from HubSpot instead, you get open tracking and an unsubscribe link, so district opens show up for follow-up calls.
- Log the send in the Outreach Manager (one note per district) and in HubSpot.

---
## claims-guard review · 2026-10-13
**Verdict:** FAIL

| # | Line / quote | Issue | Fix |
|---|---|---|---|
| 1 | "an app for parents. It alerts them early if their child may be facing something serious online, like bullying, grooming or sextortion" | Product claim. approved-claims.md is UNAPPROVED, so this needs approval from Torino. "Early" and "grooming" are not in the candidate list. | Get Torino's OK. Meanwhile, stay close to the candidate wording (instant parent alerts; detects cyberbullying, sextortion) or drop "early" and "grooming". |
| 2 | "so they can step in before it escalates" | Outcome promise, not on any list. Implies prevention. | Cut it, or say "so parents can respond". Needs approval either way. |
| 3 | "every 5th through 9th grade family in Missouri can use CyberSafely.ai free for one full year" | Offer and terms are not in the Partner Sales Guide ($150/yr, 20%, 5%) or the claims list. "Every ... in Missouri" is broad. Needs approval. | Confirm the offer and its scope in writing with Torino. Narrow to what MSBA actually covers. |
| 4 | "Through CyberSafely.ai's collaboration with MSBA" | Partnership claim is unverified. Entity use is correct. | Confirm MSBA is OK with being named. |
| 5 | "no contract, no MOU and no cost" | Terms promise beyond the guide. Needs approval. | Get Torino's sign-off on this line, or cut it. |
| 6 | "each school has its own sign-up link" and "Last week I reached out to principals in your district" | Unverified facts. The first is already flagged in "Before sending". The second is only true for districts whose principals were emailed. | Verify both per district before sending. Cut the link phrase if any school lacks one. |
| 7 | "share it with your principals, or have 15 minutes to talk... reply with a good day and time... I'll call you" plus the P.S. offering another contact | More than one next step. The body says "Nothing is needed" and then asks for three things. | Pick one ask, e.g. "Reply with a good day and time (Central) for a 15-minute call." Keep the P.S. opt-out only. |

**Passed**
- Entity: CyberSafely.ai is named as sender and company throughout, MSBA is named as partner, and the Foundation is not mentioned.
- PII: none. The only names are Giancarlo's own signature. Counts (28 principals, 11 contacts) are fine. The placeholders `[phone]` and `[CyberSafely.ai mailing address]` still need real values.
- Pricing: no dollar figures, no revenue or commission talk.
- Absolutes: none ("guarantees", "100%").

**Tone suggestions (not blocking)**
- "bullying, grooming or sextortion" leans a bit fear-based for a cold district note. Consider one softer line such as "helps parents know when their child may need support".
- Reading level is about grade 8. Good.

Not ready to send. Clear items 1-7, and Torino's OK on district outreach (already noted above), first.
