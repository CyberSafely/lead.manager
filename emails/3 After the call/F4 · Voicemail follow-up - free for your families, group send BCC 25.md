---
date: 2026-10-27
type: draft
outcome: "02"
status: draft
template_id: f4
kind: Email
phase: "3 · After the call"
stage_after_send: Contacted
touch: 2
outbound: true
source: "[[D3 · Overseer voicemail follow-up - school sign-up links]] · [[C4s · Simplified call script]] · [[Voicemail script (~20 s)]] · [[F3 · Unable to reach - after voicemail]]"
---
# F4 · Voicemail follow-up: free for your families (group send, BCC 25)

**Use case:** You've called a batch of principals and district overseers, reached nobody and left voicemails. This email sends the same message to all of them at once. It covers the same points as [[C4s · Simplified call script]], in writing, and leads with the good news: the year is free, and the sign-up link is already set up.

**How to send:** **Bulk email → one Outlook draft, up to 25 in BCC.** Put your own address in To. Everyone gets the same text, so the email has **no personal tokens** (`{{greeting}}`, `{{school}}`, `{{district}}`, `{{signup_link}}`). It uses only `{{sender}}`, `{{title}}`, `{{phone}}` and `{{mailing_address}}`, which come from Profile / Settings. Principals and overseers can go in the same send.

**When it's sent:** The same day as the voicemails, after the call outcome **Unable to reach**. Use it in place of [[F3 · Unable to reach - after voicemail]] (principals) or [[D3 · Overseer voicemail follow-up - school sign-up links]] (overseers) when you're sending to a group rather than one person. Counts as touch 2. The lead stays **Contacted**.

**Why:** It reads as good news being passed along, not a pitch. There's nothing to buy, sign or set up, and the link is ready. The only ask is a one-line reply, so you can send each school its own link and the parent message.

**After a reply:** log **Reply received** (moves them to Engaged), then send the school's own link the same day:
- Principal → [[F1 · Interested - next steps]] (includes the sign-up link and the family message).
- Overseer → [[D4 · Overseer replied - school links + family message]] (every school's link).
- Has questions → [[F2 · Needs info or not ready - short summary]].
- Not interested or "unsubscribe" → [[R2 · Not interested]], mark **Declined** the same day.

**Stage after logging as sent:** Contacted

## Subject

```text
Good news for your families: a free year of CyberSafely.ai
```

A/B alternates: `Following up on my voicemail: free for your 5th–9th grade families` · `Your families' sign-up link is ready`

## Body

```text
Hello,

I'm {{sender}} with CyberSafely.ai. I left you a voicemail today, so here's the short written version.

The good news: through our collaboration with MSBA, every 5th through 9th grade family in your school or district can use CyberSafely.ai free for a full year. It's a parent app that helps families keep their kids safe online.

There's nothing to buy and nothing to sign. It's free for families and free for your school: no contract, no cost.

We've already set up a sign-up link for your families. All we'd like to do is help you share it with your parents. Most schools add it to their next parent email or newsletter, and we've written that message for you.

Just reply to this email and I'll send your school's link and the parent message, ready to forward. If someone else handles parent communication, point me their way and I'll take it from there.

Thanks, and have a great week.

{{sender}}
{{title}}, CyberSafely.ai
{{phone}}
{{mailing_address}}

If you'd rather not hear from me, reply "unsubscribe" and I'll take you off my list.
```

## Notes

- **The link isn't in the email on purpose.** Each school has its own link, and a BCC send can't personalize it. Saying the link is ready, then sending it on reply, keeps the email honest for all 25 people and gets you a reply you can track.
- **Same points as C4s, in the same order:** who you are, the free year through MSBA, no cost to the school or families, the link is ready, and the easiest way to get it to parents.
- **Tone:** passing along good news. There's no product pitch and no list of features, and nothing that sounds alarming. Keep it that way if you edit it.

## Before sending

- ⚠️ **Needs Torino's approval** (approved-claims is still UNAPPROVED), as with C1–C4s and D1–D3: the offer (MSBA collaboration, grades 5–9, free full year) and "no contract, no cost".
- ⚠️ **Check the sign-up links:** every school in the batch (and every school under each overseer) should have its link on file before you say it's set up.
- ⚠️ **MSBA coverage:** send only to MSBA-covered districts. Skip the "n/a (non-MSBA)" ones.
- ⚠️ **Always BCC, never To or CC.** Otherwise everyone sees each other's addresses.
- ⚠️ **Real postal address:** set it in Profile so `{{mailing_address}}` doesn't show the placeholder (CAN-SPAM).
- ⚠️ **Honor unsubscribes the same day:** mark the lead Declined.
- Log the send on each lead in the Lead Manager and in HubSpot.

## Refinement notes

-
