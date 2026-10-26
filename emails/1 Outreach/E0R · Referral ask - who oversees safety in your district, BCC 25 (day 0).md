---
date: 2026-10-16
type: draft
outcome: "02"
status: draft
template_id: e0r
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 1
outbound: true
source: "[[E0B · Curiosity opener - group send, BCC 25 (day 0)]] · [[D2 · Superintendent group send - BCC 25 (day 0)]] · [[C3 · Call script - superintendent]]"
---
# E0R · Referral ask: who oversees safety in your district (BCC 25, day 0)

**Use case:** A bulk email to principals whose main goal is a **warm introduction to the superintendent** (or whoever oversees student safety in the district). The principal is the door, not the destination. One yes from a superintendent reaches every school in the district.

**How to send:** **Bulk email → one Outlook draft, up to 25 in BCC.** Your own address goes in To. No personal tokens (`{{greeting}}`, `{{school}}`, `{{district}}`), because they would fill in with the first school's details for all 25. Only `{{sender}}` and `{{phone}}`.

**The ask, in order of value:**
1. The principal **forwards this email** to the superintendent with a line of their own. That is the warm intro.
2. The principal **replies with who it is**. You then email that person and open with "Your principal at [school] suggested I reach out".
3. Fallback (P.S.): the principal shares their own school's link.

**After a reply:**
- Name or forward → log the overseer in the Lead Manager (Overseers list) and HubSpot, note which principal referred you, then call with [[C3 · Call script - superintendent]] or email them personally (adapt [[D2 · Superintendent group send - BCC 25 (day 0)]] with "{{school}}'s principal suggested I reach out").
- Thank the principal the same day, in one line.
- "I'll handle it myself" → treat as Interested and send [[F1 · Interested - next steps]].
- No / unsubscribe → [[R2 · Not interested]], mark Declined.
- No reply → day 4 call with [[C2 · Front office script - relay a message to the principal]] and ask the same question: "Who oversees student safety for the district?"

**Stage after logging as sent:** Contacted

## Why it's written this way

- **One clear question.** "Who oversees student safety in your district?" is easy to answer in one line and isn't a sales ask.
- **Forwarding is the easiest yes.** It takes 10 seconds, and a forward from a principal is the warm intro you want.
- **Gives the principal a reason to help.** The district rolls it out once, so families across all its schools hear about it together and no principal has to do it alone.
- **It explains the offer briefly.** The principal (and the superintendent reading the forward) gets the full picture: who we are, the free year, what the app does, and that there's nothing to run or sign.
- **Reads well when forwarded.** It opens with "Hello," and has no school-specific lines, so it makes sense to a superintendent who reads it second-hand.

## Subject

```text
Who oversees student online safety in your district?
```

Alternates: `Quick question: who should I talk to in your district?` · `Could you point me to the right person in your district?`

## Body

```text
Hello,

I'm {{sender}} with CyberSafely.ai, and I'm hoping you can point me in the right direction.

Through our collaboration with MSBA, Missouri families of 5th through 9th graders can use CyberSafely.ai free for a full year. It's a parent app that alerts parents when their child may be facing something serious online, like bullying or sextortion. Parents sign up and get the alerts, so there's nothing for a school to run, and there's no contract, no MOU and no cost.

I'd like to bring it to your district as a whole, so families at every school hear about it together and no one principal has to carry it alone. I'm asking a group of Missouri principals the same question this week:

Who oversees student safety in your district? Is it the superintendent, an assistant superintendent, or someone else?

The easiest way to help is to forward this email to them with a quick line from you. Or just reply with their name and I'll reach out and mention that you pointed me their way.

Thank you. I know your inbox is full, and I appreciate it.

{{sender}}
{{title}}, CyberSafely.ai
{{phone}}
{{mailing_address}}

P.S. If you'd rather share it with your own families first, reply "send the link" and I'll send your school's sign-up link and a parent message that's already written.

If you'd rather not hear from me, reply "unsubscribe" and I'll take you off my list.
```

## Before sending

- ⚠️ **Ask Torino first.** Going to superintendents through principals is a district-outreach choice (see [[D1 · District cold intro]]). Get his OK on the approach.
- ⚠️ **Needs approval (approved-claims is still UNAPPROVED):**
  - the offer (MSBA collaboration, grades 5–9, free full year)
  - "no contract, no MOU and no cost"
  - the product line (parent app, alerts, bullying / sextortion)
  - "parents sign up and get the alerts, so there's nothing for a school to run"
- ⚠️ **Sign-up links:** confirm each school has its own link before offering "your school's sign-up link" in the P.S.
- ⚠️ **MSBA coverage:** send only to principals in MSBA-covered districts. Skip the "n/a (non-MSBA)" rows.
- ⚠️ **Always BCC, never To or CC.**
- ⚠️ **Real postal address (blocker)** for `[CyberSafely.ai mailing address]` (CAN-SPAM).
- ⚠️ **Don't double up:** skip principals who already got E0, E0B, E1 or E1C, and districts whose superintendent already got D1 or D2. Check against Mike Nutter's and the MSBA lists.
- **No names in the vault.** When a principal names the superintendent, log it in HubSpot and the Lead Manager, not in vault notes.
- Honor unsubscribes the same day: mark Declined so the day 4 call is cancelled.

## Refinement notes

-

---
## claims-guard review · 2026-10-16
**Verdict:** FAIL

| # | Line / quote | Issue | Fix |
|---|---|---|---|
| 1 | "It's a parent app that alerts parents when their child may be facing something serious online, like bullying or sextortion." | Product claim. approved-claims.md is UNAPPROVED, so this needs approval from Torino. Closest candidate is "instant parent alerts" and "detects cyberbullying, sextortion". | Get Torino's OK, or keep to the candidate wording. |
| 2 | "Parents sign up and get the alerts, so there's nothing for a school to run" | Operating-model claim. It matches the candidate "parents subscribe and parents monitor; not school-operated", but it is unapproved. | Needs approval from Torino. |
| 3 | "Missouri families of 5th through 9th graders can use CyberSafely.ai free for a full year" | Offer and scope are not in the Partner Sales Guide or the claims list. The Guide's only price is $150/year per student, so "free" needs a written source. | Needs approval from Torino. Confirm the offer and that the grade range matches what MSBA covers. |
| 4 | "Through our collaboration with MSBA" | The partnership claim is unverified. The entity (CyberSafely.ai) is correct. | Confirm MSBA agrees to be named. This is more sensitive because the email will be forwarded to superintendents. |
| 5 | "no contract, no MOU and no cost" | Terms promise beyond the guide. A superintendent reading a forward may take "no cost" to mean the district is never charged. | Needs approval from Torino, or cut it. |
| 6 | "your school's sign-up link and a parent message that's already written" (P.S.) | Unverified fact. The "Before sending" note already flags it. | Verify every recipient school has a link, or drop the P.S. offer. |
| 7 | "[CyberSafely.ai mailing address]" | The placeholder is unfilled, so the email can't be sent (CAN-SPAM). The note already marks it a blocker. | Add the real postal address. |
| 8 | Ask structure: forward, or reply with a name, or (P.S.) "send the link" | There are three actions. The tone guidance calls for one clear next step. The main body is fine because the forward and the reply both answer one question. The P.S. adds a separate ask. | Optional. Cut the P.S. link offer, or keep it only if Torino agrees. A tone suggestion, not a fail item. |

**Checked and clear**
- Entity: only CyberSafely.ai is named. The Foundation is not mentioned.
- PII: no child, parent or school-identifying detail, and no alert content. BCC with no personal tokens is correct. The "No names in the vault" note is good.
- Metrics: none in the draft.
- Absolutes and guarantees: none. "Something serious online" is calm and not fear-based. Reading level is fine.
- Pricing: no numbers quoted, so nothing beyond the guide, but see #3 and #5 on "free" and "no cost".

**Blocking:** #1 to #5 (all need Torino's approval while approved-claims is UNAPPROVED), #6 (verify) and #7 (address).
