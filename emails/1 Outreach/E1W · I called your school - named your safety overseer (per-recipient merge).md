---
date: 2026-11-06
type: draft
outcome: "02"
status: draft
template_id: e1w
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 2
outbound: true
source: "[[E2 · After a call attempt (day 4)]] · [[C2 · Front office script - relay a message to the principal]] · [[F4 · Voicemail follow-up - free for your families, group send BCC 25]]"
---
# E1W · I called your school: named your safety overseer (per-recipient merge)

**Use case:** A warm-feeling outreach email to a batch of principals that opens with the call you already made to each school — naming the front-office person who answered and the overseer they pointed you to. The goal is to land as someone already woven into the school, not a cold stranger. Each principal sees *their* school's names, pulled from that lead's **contacts**.

**How to send: per-recipient, NOT a BCC-25 group send.** This email has personal tokens that differ per school (`{{call_intro}}`, `{{overseer}}`, `{{gatekeeper}}`, `{{greeting}}`, `{{school}}`), so every recipient must get their own rendered copy. Use the drawer's **"one by one from Gmail"** (best deliverability, under ~30) or **"Export merge CSV"** (YAMM / GMass) send. **Do not use the "Open Outlook draft + copy BCC" button** — BCC sends one identical body to everyone and would show the same names, or the fallbacks, to all of them. Skip the **HubSpot** copy too: it doesn't carry these computed tokens.

**Where the names come from:** each lead's **School contacts** (drawer → contact card). `{{overseer}}` is the contact whose role reads Tech / safety / overseer (e.g. a "Tech" contact named David Taylor). `{{gatekeeper}}` is the Front-office / reception / secretary / admin contact (the person who picks up the phone). Add these to a lead before sending so the names show.

**Soft fallback (no blanks, ever):** `{{call_intro}}` rewrites itself per lead:
- Both on file → *"I recently called {{school}} and spoke with {gatekeeper}, who let me know that {overseer} is the person who oversees online safety for your students."*
- Only the overseer → *"…to ask who oversees online safety for your students, and learned it's {overseer}."*
- Only the front-office contact → *"…and spoke with {gatekeeper} about who oversees online safety for your students."*
- Neither → *"I recently called {{school}} to ask who oversees online safety for your students."*

So a lead with no contacts still gets a true, clean sentence. Standalone `{{overseer}}` falls back to "whoever oversees online safety" and `{{gatekeeper}}` to "your front office".

**Stage after logging as sent:** Contacted

## Subject

```text
Following up on my call to {{school}}
```

A/B alternate: `A free year for {{school}} families — and keeping it out of your hallways`

## Body

```text
Hi {{greeting}},

{{call_intro}}

I'm {{sender}} with CyberSafely.ai, and I wanted to reach you directly because I think this is a good fit for {{school}} — and because it won't cost your school a thing.

Here's why it matters for you: so much of what lands on a school's plate each day actually starts at home, online — the group chats, the late-night conflicts, the bullying that spills over. By the time it reaches your hallways or your counselor's office, it's already your problem to manage. CyberSafely.ai is a parent app that gives families an early heads-up when their child may be facing something serious online, so parents can step in at home before it ever walks through your doors.

Through our collaboration with MSBA, every family at {{school}} can use CyberSafely.ai free for a full year. There's no contract and no cost to the school. The one thing that makes it free for your parents is that it comes through you — through {{school}}.

I'd love to get this in front of {{overseer}} and make it effortless for your team. If you can point me that way, or just reply here, I'll take care of the rest and send everything ready to forward to families.

Thank you for all you do for your students and families.

Warmly,
{{sender}}
{{title}}, CyberSafely.ai
{{phone}}
{{mailing_address}}

If you'd rather not hear from me, reply "unsubscribe" and I'll take you off my list.
```

## Notes

- **The whole point is integration.** The opening names the gatekeeper and the overseer together, so the principal sees you've already been through their front office and know who runs safety. Keep that first sentence (`{{call_intro}}`) — it's what makes the email warm instead of cold.
- **Same offer, same order as the rest of the batch:** who you are → why it matters for the school (home trouble becoming school trouble) → the free year through MSBA → no cost to the school → the easy next step.
- **Only call what you actually did.** The soft fallback keeps the sentence honest for leads with no contacts on file; don't hand-edit a name in that you didn't get on a real call.

## Before sending

- ⚠️ **Needs Torino's approval** (approved-claims is still UNAPPROVED), as with C1–C4s, D1–D3 and F4: the offer (MSBA collaboration, free full year) and "no contract, no cost".
- ⚠️ **Per-recipient only.** Use "one by one from Gmail" or "Export merge CSV". Never the BCC button or HubSpot for this template.
- ⚠️ **Check each lead's contacts** before sending, so `{{overseer}}` / `{{gatekeeper}}` name the right people. Leads with none still send cleanly via the fallback.
- ⚠️ **MSBA coverage:** send only to MSBA-covered districts. Skip the "n/a (non-MSBA)" ones.
- ⚠️ **Real postal address:** set it in Profile so `{{mailing_address}}` isn't the placeholder (CAN-SPAM).
- ⚠️ **Honor unsubscribes the same day:** mark the lead Declined.
- Log the send on each lead in the Lead Manager and in HubSpot.

## Refinement notes

-
