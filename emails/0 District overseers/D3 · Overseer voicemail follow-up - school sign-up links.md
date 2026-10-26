---
date: 2026-10-20
type: draft
outcome: "02"
status: draft
template_id: d3
kind: Email
phase: "0 · District overseers"
stage_after_send: Contacted
touch: 2
outbound: true
source: "[[F3 · Unable to reach - after voicemail]] · [[C3 · Call script - superintendent]]"
---
# D3 · Overseer voicemail follow-up: school sign-up links

**Use case:** You called a superintendent or district overseer ([[C3 · Call script - superintendent]]), they didn't answer, and you left a voicemail. Send this right away.

**When it's sent:** Call outcome **Unable to reach** on an overseer. The app suggests D3 instead of F3 for overseers. Counts as touch 2; the overseer stays **Contacted**.

**Why:** The links are the whole ask. Putting every school's own sign-up link in the first written follow-up means the district can act without a second exchange, and it says plainly that it's free through MSBA.

**Stage after logging as sent:** Contacted. When they reply, log **Reply received** (moves them to Engaged), then send [[D4 · Overseer replied - school links + family message]].

## Notes

- `{{school_links}}` lists every school in the overseer's district that's in the Lead Manager, one per line, with that school's own sign-up link. A school with no link on file shows `[no sign-up link on file]`. Add the link in the school's drawer before sending, or delete that line.
- Check the district is covered by MSBA before sending (see the C3 note about "n/a (non-MSBA)" districts).

## Subject

```text
Missed you by phone: a free year of CyberSafely.ai for {{district}} families
```

A/B alternate: `Sorry I missed you: {{district}}'s free CyberSafely.ai sign-up links`

## Body

```text
Hi {{greeting}},

I just left you a voicemail, so here's the short written version.

Through CyberSafely.ai's collaboration with MSBA, every 5th–9th grade family in {{district}} can use CyberSafely.ai free for a full year. It's free for the district and your schools too: no contract, no MOU, no cost.

Each of your schools already has its own sign-up link:

{{school_links}}

Families sign up at their school's link and the year is free. All it takes is for each principal to share their link in their next parent email or newsletter, and we've already written that message for them.

Questions? Reply here or call me at {{phone}}.

{{sender}}
CyberSafely.ai
{{phone}}
```
