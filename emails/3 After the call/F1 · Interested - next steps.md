---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: f1
kind: Email
phase: "3 · After the call"
stage_after_send: Engaged
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# F1 · Interested: next steps

**Use case:** Next steps after a principal says yes on the call.

**When it's sent:** Call outcome **Interested / Ready to move forward**. The lead moves to **Engaged**.

**Why:** Delivers what was promised on the call. The delivery path was settled on the call (default: the school forwards), so the email states it rather than offering options.

**Stage after logging as sent:** Engaged

## Notes

- Delete the option they didn't choose before sending.
- "We send it" line is **blocked until Torino approves** the data-handling wording.
- Embeds [[P1 · Family message (forwarded by the school)]].

## Subject

```text
{{school}}: everything for your families, ready to go
```

A/B alternate: `Next steps: CyberSafely.ai for {{school}} families`

## Body

```text
Hi {{greeting}},

Great talking with you. As promised, here's everything your 5th–9th grade families need.

The message below is ready to forward, with {{school}}'s sign-up link built in. Send it in your next parent email or newsletter and you're done.

[If they gave you a PTA or parent contact on the call, replace the paragraph above with: "We'll take it from here. We'll get the family list from [contact] and send the message below on {{school}}'s behalf." Then add the data-handling line once Torino approves it. Delete this note.]

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}
```

## What changed and why

- **No option to pick.** The old version listed both paths for the principal to choose from. Now the email states the path decided on the call. The default is "forward it"; swap in "we send it" if they gave a contact.
- **"And you're done"** makes the finish line visible.
- **Subject says "ready to go"**: it's complete, with nothing left to decide.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Next steps: CyberSafely.ai for {{school}} families

Hi {{greeting}},

Thank you for speaking with me. As promised, here's everything you need to share CyberSafely.ai with your 5th–9th grade families.

[Keep the option they chose on the call and delete the other.]

Your school sends it: forward the family message below by email, newsletter or however you usually reach families. Your school's sign-up link is already in it.

We send it for you: reply with the parent email addresses for your 5th–9th grade families (one column of emails is enough) and your OK on the message below, and we'll take it from there.
[Line on how the contacts are used and stored. Get the approved wording from Torino before sending.]

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
