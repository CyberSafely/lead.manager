---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: g3
kind: Email
phase: "4 · Sign-up support"
stage_after_send: no change
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# G3 · Monthly update

**Use case:** Monthly update to a school that has sign-ups.

**When it's sent:** After G2 has been sent (**Live**), then every month while **Active**. The app schedules it about 20 days out.

**Why:** Keeps the school engaged, reports progress, and gives them the blurb for upcoming newsletters, parent nights or conferences.

**Stage after logging as sent:** no change

## Notes

- Embeds [[N1 · Newsletter blurb (~50 words)]].
- `{{signups}}` must be a verified count.

## Subject

```text
{{school}}: {{signups}} families and counting
```

A/B alternate: `{{school}}: monthly CyberSafely.ai update`

## Body

```text
Hi {{greeting}},

Your monthly update: {{signups}} {{school}} families have signed up so far.

Got a newsletter, parent night or conference coming up? This blurb is ready to drop in:

{{newsletter}}

And if parents have asked you anything about it, send it my way. I'd rather answer a question than let it stall a sign-up.

{{sender}}
CyberSafely.ai
```

## What changed and why

- **"And counting"** frames progress as momentum, not a report card.
- **Ties the blurb to their calendar** (newsletter, parent night, conference).
- Same `{{signups}}` checks as G2.

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: {{school}}: monthly CyberSafely.ai update

Hi {{greeting}},

A quick monthly update: {{signups}} families at {{school}} have signed up so far.

If you have a newsletter, parent night or conference coming up, the short blurb below is ready to drop in:

{{newsletter}}

Have families asked you anything we should help with?

{{sender}}
CyberSafely.ai
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].
