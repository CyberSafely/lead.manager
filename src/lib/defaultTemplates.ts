// Built-in emails, used when public/email-templates.js is missing. Copied verbatim from the original app.
import type { Template } from "./types";

export const DEFAULT_TEMPLATES: Template[] = [
 {id:"d1",phase:"0 · District overseers",name:"D1 · District cold intro (heads-up)",to:"contacted",seq:1,subject:"A free year of CyberSafely.ai for {{district}} families",body:
`Hi {{greeting}},

I'm {{sender}} with CyberSafely.ai. I wanted to give you a quick heads-up about some good news for families in {{district}}.

Through CyberSafely.ai's collaboration with MSBA, every 5th through 9th grade family in Missouri can use CyberSafely.ai free for one full year.

CyberSafely.ai is an app for parents. It alerts them early if their child may be facing something serious online, like bullying, grooming or sextortion, so they can step in before it escalates.

I've reached out to principals in your district so their families can sign up. For schools, there's no contract, no MOU and no cost. We've already written the message for families, and each school has its own sign-up link.

Nothing is needed from you. If you'd like a quick 15-minute walkthrough, just reply with a good day and time (Central time) and I'll call you.

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}
[CyberSafely.ai mailing address]

P.S. If this isn't a fit, reply "no thanks" and I won't follow up.`},
 {id:"e1",phase:"1 · Outreach (3 touches)",name:"E1 · First email + family message (day 0)",to:"contacted",seq:1,subject:"Your {{school}} family message is ready",body:
`Hi {{greeting}},

Following up on Mike Nutter's note: through CyberSafely.ai's collaboration with MSBA, every 5th through 9th grade family at {{school}} gets a free year of CyberSafely.ai.

It's a parent app that flags trouble early, like bullying, grooming or sextortion, so parents can step in before it escalates.

We've already done the work. The message for your families is below, with {{school}}'s sign-up link built in. Forward it to your 5th–9th grade parents in your next email or newsletter, and that's it.

Office stretched thin? Reply with your PTA or parent contact and we'll send it ourselves. Either way, your families get it.

It may be the easiest yes on your desk this week: no contract, no MOU, no cost. Just one forward.

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}
[CyberSafely.ai mailing address]

P.S. Not a fit for {{school}}? Reply "no thanks" and I'll close the loop.

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}`},
 {id:"e2",phase:"1 · Outreach (3 touches)",name:"E2 · After a call attempt (day 4)",to:"contacted",seq:2,subject:"Following up on Torino's message: {{school}}",body:
`Hi {{greeting}},

I'm following up on the message Torino Fitzgerald left you about the free year of CyberSafely.ai for {{school}}'s 5th–9th grade families. I'm {{sender}}, on Torino's team at CyberSafely.ai, and I'm your point of contact for getting this to your parents.

I gave you a call today and left a short voicemail, so here's the 30-second version.

Through our collaboration with MSBA, your families have a free year waiting. No contract, no MOU, no cost. The only step left is getting the word to parents.

The family message is below, with {{school}}'s sign-up link built in. Forward it in your next parent email or newsletter, and that's it.

Swamped? Reply "send it" with your PTA or parent contact, and we'll handle delivery.

{{sender}}
CyberSafely.ai
{{phone}}

P.S. Torino and I are working on {{school}}'s rollout together, so a reply to either of us gets it moving. Not a fit? Reply "no thanks" and I won't follow up.

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}`},
 {id:"e3",phase:"1 · Outreach (3 touches)",name:"E3 · Last email: right person? (day 10)",to:"contacted",seq:3,subject:"Who handles parent emails at {{school}}?",body:
`Hi {{greeting}},

A principal's inbox is a contact sport, so I'll keep this one short.

Who at {{school}} sends news to families? A counselor, assistant principal or PTA lead is perfect. Reply with a name and I'll take it from there, without adding anything to your plate.

Your 5th–9th grade families' free year is still waiting whenever you're ready.

{{sender}}
CyberSafely.ai`},
 {id:"r1",phase:"2 · Replies",name:"R1 · Has questions / wants a call",to:"engaged",subject:"Re: Your {{school}} family message is ready",body:
`Hi {{greeting}},

Glad you asked. Ten minutes on the phone will cover it. Do any of these work (Central time)?

- [Day, time]
- [Day, time]
- [Day, time]

If none fit, send me a time and the best number, and I'll call you then.

Meanwhile, the family message from my first email is ready to go whenever you are.

{{sender}}
CyberSafely.ai`},
 {id:"r2",phase:"2 · Replies",name:"R2 · Not interested",to:"lost",subject:"Re: Your {{school}} family message is ready",body:
`Hi {{greeting}},

Understood, and thanks for the quick answer. I won't follow up again.

If things change, or a parent asks you about online safety down the road, just reply here and I'll pick it right back up.

Best,
{{sender}}
CyberSafely.ai`},
 {id:"r3",phase:"2 · Replies",name:"R3 · Exception: we send it for you",to:"engaged",path:"we",subject:"Re: Your {{school}} family message is ready",body:
`Hi {{greeting}},

Done. We'll handle delivery. Here's all I need from your office:

1. Parent or PTA email addresses for your 5th–9th grade families. A spreadsheet with one column of emails is plenty.
2. Your OK on the family message from my first email. It goes out as a message from {{school}}.
3. A send date, if you have one in mind. If not, we'll send it within [X] school days.

[Line on how the contacts are used and stored. Get the approved wording from Torino before sending.]

Once it's out, I'll let you know it landed.

{{sender}}
CyberSafely.ai`},
 {id:"g1",phase:"3 · Sign-up support",name:"G1 · No sign-ups yet (nudge)",to:null,subject:"{{school}}: a 50-word version for parents",body:
`Hi {{greeting}},

Thanks again for sharing CyberSafely.ai with your families. Sign-ups from {{school}} haven't come through yet. Inboxes being what they are, the first message may have been buried.

Here's a 50-word version that fits a newsletter, morning announcement or text to parents:

{{newsletter}}

Or reply with your PTA or parent contact and we'll send it ourselves.

{{sender}}
CyberSafely.ai`},
 {id:"g2",phase:"3 · Sign-up support",name:"G2 · First sign-ups: thank-you + reminder",to:null,subject:"{{signups}} {{school}} families are in",body:
`Hi {{greeting}},

Good news: {{signups}} {{school}} families have signed up for CyberSafely.ai. Thank you for making that happen.

A second reminder can catch the families who missed the first one. Here's a short version for your newsletter, announcements or a text to parents:

{{newsletter}}

Parents who want a hand getting set up can join a free live onboarding call: {{onboarding_page}}

{{sender}}
CyberSafely.ai`},
 {id:"g3",phase:"3 · Sign-up support",name:"G3 · Monthly update",to:null,subject:"{{school}}: {{signups}} families and counting",body:
`Hi {{greeting}},

Your monthly update: {{signups}} {{school}} families have signed up so far.

Got a newsletter, parent night or conference coming up? This blurb is ready to drop in:

{{newsletter}}

And if parents have asked you anything about it, send it my way. I'd rather answer a question than let it stall a sign-up.

{{sender}}
CyberSafely.ai`},
 {id:"p1",phase:"Family-facing (inserted above)",name:"P1 · Family message (forwarded by the school)",to:null,subject:"Free for {{school}} families: a year of CyberSafely.ai",body:
`Dear {{school}} families,

We want every 5th–9th grade family at {{school}} to know about a free resource now available to you.

CyberSafely.ai is a parent app that alerts you early if something concerning comes up in your child's online life, like bullying, grooming, sextortion or exposure to harmful content, so you can step in before it escalates.

It's built to support your judgment, not replace it. It doesn't read your child's private messages or store their passwords. It watches for warning signs and lets you know.

Thanks to a collaboration between CyberSafely.ai and MSBA, Missouri families of 5th–9th graders get one full year free.

Getting started takes a few minutes:
1. Sign up here: {{signup_link}}
2. Add your child.

That's it.

Want a hand? Step-by-step instructions, a short video and free live onboarding calls are here: {{onboarding_page}}

Questions? Reach the CyberSafely.ai team at {{support}}.`},
 {id:"n1",phase:"Family-facing (inserted above)",name:"N1 · Newsletter blurb (~50 words)",to:null,subject:"",body:
`Free for {{school}} families: a year of CyberSafely.ai, through a collaboration with MSBA. The parent app alerts you early if your 5th–9th grader may be facing bullying, grooming or other serious trouble online, so you can step in before it escalates. Sign up in a few minutes: {{signup_link}}`},
 {id:"n2",phase:"Family-facing (inserted above)",name:"N2 · Text / announcement (short)",to:null,subject:"",body:
`{{school}} families: your 5th–9th grader qualifies for a free year of CyberSafely.ai, a parent app that flags online trouble early. Sign up in minutes: {{signup_link}}`},
 {id:"vm",phase:"Calls",name:"Voicemail script (~20 s)",to:null,subject:"",body:
`Hi {{greeting}}, this is {{sender}} with CyberSafely.ai, following up on Mike Nutter's note about the free year for your 5th through 9th grade families. The family message is written and ready. All it needs is a forward, and if your office is busy, we'll send it ourselves. I'm sending you a short email now. You can reach me at {{phone}}. Thanks!`},
 {id:"c1",phase:"Calls",name:"C1 · Call script: principal opened the email",to:null,subject:"",body:
`OPENING
"Hi {{greeting}}, this is {{sender}} with CyberSafely.ai. Did I catch you at an okay moment?

I'm following up on Mike Nutter's message about the free year of CyberSafely.ai for Missouri's 5th through 9th graders. I sent you the details by email and wanted to make sure it's on your radar."

THE GOOD NEWS
"We've already done the work. The message for your families is written, with {{school}}'s sign-up link built in. It just needs to reach your parents."

THE CLOSE (assume the yes; don't ask them to choose)
"The quickest route is a forward in your next parent email or newsletter. If your office is stretched, give me your PTA or parent contact and we'll send it ourselves. Either way, your families get it."

IF YES → mark "Interested / Ready to move forward"
"Perfect. I'll email you everything today." → send F1. If they named a PTA or parent contact, log it in HubSpot, not in the vault.

IF THEY HAVE QUESTIONS → mark "Needs more information"
"Good question." Answer only what you know. "If I don't have it, I'll find out and put it in a short summary today." → send F2.

IF NOT READY → mark "Follow-up needed"
"Totally fair. I'll send a one-page summary so it's there when you are, and check back in [two weeks]." → send F2, set the call-back.

IF NO → mark "Not interested"
"Understood. Thanks for your time. I'll close it out on our end." → send R2.

QUICK ANSWERS
- "Do we sign anything?" → "Nothing. No contract, no MOU, no cost."
- "What does the school have to do?" → "One forward. Or hand us a contact and we'll do it."
- "What about student data?" → "Fair question. I want to give you an accurate answer, so I'll follow up in writing." Don't improvise.

WRAP-UP
Ask if they'd like information on the fundraising program. If yes, tick "Wants fundraising info".

NO ANSWER → mark "Unable to reach". Leave the voicemail, then send F3.`},
 {id:"f1",phase:"4 · After the call",name:"F1 · Interested: next steps",to:"engaged",subject:"{{school}}: everything for your families, ready to go",body:
`Hi {{greeting}},

Great talking with you. As promised, here's everything your 5th–9th grade families need.

The message below is ready to forward, with {{school}}'s sign-up link built in. Send it in your next parent email or newsletter and you're done.

[If they gave you a PTA or parent contact on the call, replace the paragraph above with: "We'll take it from here. We'll get the family list from [contact] and send the message below on {{school}}'s behalf." Then add the data-handling line once Torino approves it. Delete this note.]

Thank you,
{{sender}}
CyberSafely.ai
{{phone}}

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}`},
 {id:"f2",phase:"4 · After the call",name:"F2 · Needs info / not ready: short summary",to:null,subject:"{{school}}'s free year, on one page",body:
`Hi {{greeting}},

Thanks for your time today. Here's the one-page version to keep on hand.

- What it is: a parent app that alerts parents early if their child may be facing something serious online, like bullying, grooming or sextortion.
- The offer: through CyberSafely.ai's collaboration with MSBA, every 5th–9th grade family in Missouri gets one year free.
- What it takes from {{school}}: no contract, no MOU, no cost. One forward to families, or we send it for you.
- Your sign-up link: {{signup_link}}

[Answers to the questions they asked on the call. Delete if none.]

When you're ready, reply here or call me at {{phone}}. I'll check back in [two weeks] either way.

{{sender}}
CyberSafely.ai`},
 {id:"f3",phase:"4 · After the call",name:"F3 · Unable to reach: after voicemail",to:"contacted",seq:2,subject:"Missed you by phone: {{school}}'s free year",body:
`Hi {{greeting}},

I just left you a voicemail, so here's the written version, easier to skim between meetings.

Following up on Mike Nutter's message: {{school}}'s 5th–9th grade families have a free year of CyberSafely.ai, thanks to our collaboration with MSBA. The family message is written and ready (below), with your sign-up link built in.

All it needs is a forward to your parents. If your office is stretched, reply with your PTA or parent contact and we'll send it ourselves.

Questions? Reply here or call me at {{phone}}.

{{sender}}
CyberSafely.ai
{{phone}}

———— Message for {{school}} families (ready to forward) ————

{{parent_email}}`}
];
