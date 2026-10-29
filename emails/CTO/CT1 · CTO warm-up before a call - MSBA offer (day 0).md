---
date: 2026-10-29
type: draft
outcome: "02"
status: draft
template_id: ct1
kind: Email
phase: "CTO"
stage_after_send: Contacted
touch: 1
outbound: true
audience: Missouri district CTOs / technology directors
source: "[[2026-10-27 KC District CTO Call Script]]"
---
# CT1 · CTO warm-up before a call: MSBA offer (day 0)

**Use case:** The first email to a district CTO or technology director on the **CTOs** list. It introduces you and the MSBA family offer before you call.

**Goal:** the CTO knows who you are and what the call is about, and replies with a time.

**Send to:** Missouri districts only (the MSBA offer doesn't apply in Kansas). `{{greeting}}` and `{{district}}` fill in from the CTO's record. Your name, phone and email come from Profile.

**Stage after logging as sent:** Contacted. No reply in 4 business days → [[CT2 · CTO follow-up - no reply (day 4)]].

## Subject

```text
MSBA family offer for {{district}}: 15 minutes?
```

A/B alternate: `Free year of CyberSafely.ai for {{district}} families (via MSBA)`. Don't use it until the offer wording is approved (claims-guard item 1).

## Body

```text
Hi {{greeting}},

I'm {{sender}} with CyberSafely.ai. I help Missouri districts with our MSBA family offer, and I'd like to set up a short call with you. I wanted to introduce myself first so you know what it's about.

The short version: through CyberSafely.ai's collaboration with MSBA, Missouri families of 5th through 9th graders can use CyberSafely.ai free for a full year. For the district, there's no contract, no MOU and no cost.

It's a parent app. Parents sign up, and parents get the alerts. The school's part is sharing a sign-up link with families.

I'm reaching out to you because I'd like to hear how it would fit with your devices and setup, and follow up on any privacy or technical questions you have.

Would you have 15 minutes in the next week or two? Just reply with a time that works, or point me to the right person on your team.

Thank you,
{{sender}}
CyberSafely.ai
{{phone}} · {{sender_email}}
```

## Optional line (only if confirmed)

If the district already received MSBA's email about the offer, add after the first paragraph:

> "You may have seen MSBA's note about this from [sender]. I'm the person helping districts get it to families."

## Before sending

- ⚠️ `approved-claims.md` is still UNAPPROVED. Torino needs to confirm: the MSBA offer (free year, grades 5–9), "no contract, no MOU and no cost", "parents sign up, and parents get the alerts", "the school's part is sharing a sign-up link", the collaboration wording, and the MSBA sender name in the optional line.
- Set your phone and email in **Profile** so `{{phone}}` and `{{sender_email}}` don't show placeholders.

---
## claims-guard review · 2026-10-29
**Verdict:** FAIL

`approved-claims.md` is UNAPPROVED, so every product or offer claim below is a FAIL item: needs approval from Torino. Wording matches the 2026-10-27 call script, so the same approvals clear both.

| # | Line / quote | Issue | Fix |
|---|---|---|---|
| 1 | "Missouri families of 5th through 9th graders can use CyberSafely.ai free for a full year" (also subject 2: "Free year of CyberSafely.ai") | Offer terms, eligibility and "free" are not in the approved list or the Partner Sales Guide ($150/year per student). Pricing beyond the guide. | Get Torino's written confirmation of the MSBA offer, grades and duration. Until then, send only subject 1 or remove the specifics. |
| 2 | "no contract, no MOU and no cost" for the district | Unapproved terms. A CTO could hold us to it. | Needs Torino's confirmation before sending, or cut. |
| 3 | "It's a parent app. Parents sign up, and parents get the alerts." | Matches a pending candidate claim only. Not approved. | Needs approval, or reduce to "a parent-subscribed app". |
| 4 | "The school's part is sharing a sign-up link with families." | Unapproved description of the school's role and obligations. | Confirm with Torino that this is the whole ask. |
| 5 | "get you written answers to any privacy or technical questions" | A commitment to "any" question in writing. Could be held to it. | Soften to "and follow up on any privacy or technical questions you have", and confirm someone owns written answers. (Done in the body above.) |
| 6 | "before anything goes out to families" | Implies nothing reaches families until the district is consulted. This is a promise. | Confirm it matches MSBA's actual rollout, or drop it. (Not in the body above.) |
| 7 | "through CyberSafely.ai's collaboration with MSBA" and the optional MSBA line | Partnership claim is unconfirmed. The sender name is a placeholder. | Torino to confirm the collaboration wording. Use the optional line only if verified. |

**Passed:**
- Entity: CyberSafely.ai is named throughout, with no Foundation mix-up.
- PII: none. Contact details come from the Lead Manager.
- Next step: a single ask (a 15-minute call), with the follow-up kept short.

**Tone suggestions (not failing):**
- CTOs will want a hint of substance, such as data handling or device and network impact. Offer to send a one-page privacy and technical summary only once one exists and is approved.
- "Reply with a time, or point me to the right person" is two asks. It's acceptable, but "reply with a time" alone is cleaner.
