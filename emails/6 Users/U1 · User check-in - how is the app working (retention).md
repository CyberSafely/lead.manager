---
date: 2026-10-15
type: draft
outcome: "03"
status: draft
template_id: u1
kind: Email
phase: "6 · Users"
stage_after_send: Contacted
touch: 1
outbound: true
source: "Users list (app sign-ups); reviewed by claims-guard 2026-10-15"
---
# U1 · User check-in: how is the app working? (retention)

**Use case:** A personal check-in with people already signed up for CyberSafely.ai (the **Users** list in the Lead Manager). It thanks them, asks how the app is working for their family, and invites a reply. The goal is retention: catch setup problems and frustrations early, and hear what's working.

**How to send:** One email per person from the Lead Manager (Users → open the user → Emails → U1), so `{{greeting}}` uses their first name. **Don't BCC this one.** A personal check-in only works if it reads personal.

**Before sending to a user whose Notes say "Name guessed from email":** check the name. If it doesn't look like a real first name, delete it so the email says "Hi there".

**When it's sent:** The user is **Cold**. After logging it moves to **Contacted**.

## Subject

```text
How's CyberSafely.ai working for you?
```

A/B alternate: `Quick question about your CyberSafely.ai app`

## Body

```text
Hi {{greeting}},

I'm {{sender}} with the CyberSafely.ai team. You signed up for CyberSafely.ai, and I wanted to reach out personally to say thank you and see how it's going.

If you've had a chance to use it, how has it been working for your family so far?

Whatever the answer, I'd really like to hear it. A few lines is plenty:

- Is everything set up the way you want it?
- Has anything been confusing, or not worked the way you expected?
- Is there anything you wish it did?

Just hit reply. I read the replies myself, and if something isn't working, I'll make sure it gets to the right person.

(Please don't include your child's name or any alert details in your reply.)

Thank you for giving us a try,
{{sender}}
CyberSafely.ai
{{phone}}
{{mailing_address}}

P.S. Rather talk it through? Reply with a good time and number and I'll give you a call. And if you'd rather not hear from me, just reply "stop."
```

## Why it's written this way

- **No product claims.** It doesn't describe what the app does. They already use it, so the email asks about their experience instead of selling. That keeps it clear of the UNAPPROVED claims list.
- **One real question, then three easy prompts.** The prompts cover setup, friction and wishes, which are the three things that predict whether someone stays.
- **Personal, from a person.** First name, one sender, "I read the replies myself". Retention check-ins that read like a newsletter get ignored.
- **Doesn't assume they're set up.** "If you've had a chance to use it" fits people who signed up but never finished setup.
- **Protects child privacy.** The line in parentheses keeps child names and alert content out of replies.
- **Neutral to parents.** It speaks to the person and their family, not to moms or dads.
- **Short.** It fits on a phone screen without scrolling much.
- **The P.S. gives a call option and an easy opt-out.**

## After a reply

- **Happy / no issues:** thank them, and mark them **Engaged**. Note anything they like in the user's Notes (no child details).
- **Problem or confusion:** pass it to the support route Torino confirms. Mark **Engaged** and set a next step to check back in a few days. Log the type of issue (setup, alerts, billing…) in Notes so patterns show up across users.
- **Wants a call:** call, then log the outcome.
- **"Stop" or not interested:** mark **Declined**. Don't follow up.
- **No reply:** the app suggests one short personal follow-up after 5 business days. After that, leave them be.

## Open before sending

- ⚠️ **Check with Torino** that Giancarlo should contact existing users directly, and who handles support issues they raise (where to send them, any support email to share).
- ⚠️ `[CyberSafely.ai mailing address]` needs a real address.
- **Feature requests:** reply "Thanks, I'll share this with the team." Don't confirm or deny what the app does or will do.
- ⚠️ **Privacy:** if a parent replies with details about their child or an alert, don't copy them into the vault. Handle it in email or the support system.
- Send a handful a day, mornings Tue–Thu, so replies stay manageable.

## Refinement notes

- 
