---
date: 2026-10-08
type: draft
outcome: "02"
status: draft
refined: 2026-10-08
template_id: e2
kind: Email
phase: "1 · Outreach"
stage_after_send: Contacted
touch: 2
outbound: true
source: "[[Lead Outreach/Outreach Manager.html]]"
---
# E2 · After a call attempt (day 4)

**Use case:** The written follow-up to a call that went to voicemail (or to the front office). It summarizes what you would have said on the call: who you are, why you called, the offer, and the next step.

**When it's sent:** The same day as the call, right after the voicemail. Day 4 in the standard sequence. The lead is **Contacted** with touch 1 done.

**Why:** A voicemail is easy to forget. The email puts the call in writing, introduces you as Torino's point of contact, and gives the principal everything to act on without calling back. CC Torino so his name carries the follow-up.

**Stage after logging as sent:** Contacted

## Notes

- **CC:** Torino at [Torino's CyberSafely.ai email]. Add it in the CC field before sending.
- **If you left a message with the front office** ([[C2 · Front office script - relay a message to the principal]]) instead of voicemail, change the first line to: *"I tried calling earlier today and left a message with your front office. I know a principal's day rarely leaves time to sit by the phone, so I wanted to follow up here too."*
- Fill in `[day]` with when you'll call back (2–3 school days later works well).
- Overlaps with [[F3 · Unable to reach - after voicemail]]. F3 is for principals on Torino's opened-the-email call list; E2 is for the standard sequence. Decide whether you need both.
- Next step in the app: day 10 → [[E3 · Last email - right person (day 10)]].

## Subject

```text
Following up on Torino's message: {{school}}
```

A/B alternate: `Missed you by phone: {{school}}'s free year`

## Body

```text
Hi {{greeting}},

I hope you're having a good week. I tried calling earlier today and left you a quick voicemail. I know a principal's day rarely leaves time to sit by the phone, so I wanted to follow up here too.

A little about me: I'm {{sender}}, and I work with Torino Fitzgerald on the CyberSafely.ai team. You may have seen Torino's message and Mike Nutter's email about the free year of CyberSafely.ai for your 5th through 9th grade families. I'm the person who'll help make that as easy as possible for {{school}}.

Here's the heart of it. Through our collaboration with MSBA, every 5th–9th grade family at {{school}} can use CyberSafely.ai free for a full year. It's an app for parents that gives them a heads-up when their child may be facing something serious online, like bullying, so they can step in early.

The good news for your office is that there's very little to do. There's nothing to sign and nothing to pay, and the message for families is already written, with {{school}}'s sign-up link built in. You'll find it just below. One forward in your next parent email or newsletter, and your families are on their way.

If your plate is already full (and I imagine it is), just reply with the name of whoever handles your family newsletter, whether that's someone in the office, a counselor or the PTA. I'll make sure they have everything ready to go.

I'll try you again on [day], but please don't feel you need to wait for my call. You can reply here anytime or reach me directly at {{phone}}. I'm always happy to answer questions.

Thank you for all you do for your students and families.

Warmly,
{{sender}}
CyberSafely.ai
{{phone}}

P.S. I've copied Torino here, so a reply to either of us will keep things moving. And if this isn't the right fit for {{school}}, just reply "no thanks" and I'll close the loop.

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}
```

## What changed and why

- **Oct 8 (second pass): warmer and fuller.** It opens with a friendly greeting and an understanding line about a principal's day, instead of "here's the written version". The three bullets became short paragraphs, so it reads like a note from a person, not a summary. It closes with a thank-you to the principal and "Warmly".
- **Oct 8: rebuilt as the written version of the call.** It follows the same beats as the call scripts ([[C1 · Call script - principal opened the email]], [[C2 · Front office script - relay a message to the principal]]): who you are → why you called → the offer → the next step → when you'll call again.
- **"Who I am" up front.** It introduces you as Torino's point of contact and ties into the two things the principal may have already seen: Torino's message and Mike Nutter's email.
- **Three bullets summarize the call:** the free year, what it is, and what it takes from the school. A principal can skim them in ten seconds.
- **Same helpful question as the front office script.** "Reply with the name of whoever sends your family newsletter" is easier to answer than a yes, and gets you to the person who actually forwards it. It's a done deal, not a choice (Torino's rule).
- **Says when you'll call again.** That makes the next call expected, not a surprise, and gives them a reason to reply first if another time suits them.
- **Torino CC'd and named in the P.S.** It's the follow-up mention of him from your notes: his name carries weight, and the CC shows the email isn't a cold sales message.
- **Family message below the signature** so they can act from this email alone.
- ⚠️ Check that Torino's message and Mike Nutter's email both reached the principals who get E2. If only one did, drop the other from the "Who I am" line.
- ⚠️ The offer and product lines **need approval** while the approved-claims list is UNAPPROVED. They match the company's emails ([[Outreach email 2]], [[Outreach email 3]]).

## Refinement notes

- 

## Previous version (from the app, Oct 8)

<details><summary>Show</summary>

```text
Subject: Following up: free CyberSafely.ai year for {{school}}

Hi {{greeting}},

I tried to reach you by phone today about the free year of CyberSafely.ai for your 5th through 9th grade families.

The short version: nothing to sign and no cost to the school. Forwarding the family message from my last email is all it takes. Here's your school's sign-up link again: {{signup_link}}

If it's easier, reply "send it" and we'll handle it for you.

If this isn't a fit, reply "no thanks" and I won't follow up.

{{sender}}
CyberSafely.ai
{{phone}}
```

</details>

---
After refining, paste the subject and body back into the Outreach Manager (Templates tab). See [[Email Flow]].


- Add information about Torinos referencing us. As a follow up mention him. 
- copy Torino cybersafely.ai email.