---
date: 2026-10-20
type: draft
outcome: "04"
status: draft
template_id: nl1
kind: Email
phase: "7 · Campaigns"
stage_after_send: Contacted
touch: 1
outbound: true
source: "Campaigns list: Sept 2026 newsletter: Suicide Prevention Month (opened), 250 contacts. Pairs with the Online Safety Iceberg carousel (Agents/delierables/2026-10-20 Online Safety Iceberg carousel)"
---
# NL1 · Newsletter re-engagement: group send, BCC 25

**Use case:** People who opened the September newsletter ("September is Suicide Prevention Month. Here's what parents need to know.") but didn't click. That's the **Campaigns** list, campaign *Sept 2026 newsletter: Suicide Prevention Month (opened)*. They're mostly school and district staff in Ohio and Georgia, plus a few in North Carolina. The email follows up with something practical to share with families, and asks one easy question.

**Written for Bulk email → one Outlook draft, up to 25 in BCC.** Everyone gets identical text, so it has **no personal tokens** (`{{greeting}}`, `{{first}}`, `{{school}}`). Those would fill in with the first contact's details for all 25. Only `{{sender}}` and `{{phone}}` are used, because they come from Settings and are the same for everyone.

**When it's sent:** The contact is **Cold**. After logging it moves to **Contacted**.

## How to send all 250, 25 at a time

1. **Campaigns → Schools tab.** Click the campaign's card, and set the stage filter to **Cold**.
2. **Bulk email these 25 with Outlook** → pick **NL1** → **Open Outlook draft + copy 25 BCC**.
3. In Outlook, put **your own address in To**, click **BCC** and paste. Never put the list in To or Cc, where everyone would see everyone's address.
4. Check the draft (link filled in, no `[brackets]` left) and send.
5. Back in the app: **Log as sent for 25**. Those 25 move to Contacted and drop out of the Cold filter, so the next 25 come up on their own.
6. Repeat. That's **10 batches**. Send **2–3 batches a day, at least an hour apart**, mornings Tue–Thu, so it's done in about 4 days. Big bursts from one mailbox look like spam to school email filters, and they also bunch up the replies.

## Subject

```text
A follow-up to our Suicide Prevention Month newsletter
```

A/B alternate: `Something to share with your families: the online safety iceberg`

## Body

```text
Hello,

Thank you for reading our September newsletter on Suicide Prevention Month. It's a hard topic, and I'm following up with the educators who read it to share something practical you can pass along.

We just made a short visual called the Online Safety Iceberg. It helps parents see the parts of their kid's online life they usually can't: private group chats, strangers reaching out, and the things kids keep to themselves, including signs that a child may be struggling. It's five slides in plain language, and you're welcome to share it with families in a newsletter, on social media or at a parent night:
[link to the Online Safety Iceberg post]

I'd also like to hear from you. What online issues are coming up most with the students and families you work with this fall? A one-line reply is plenty, and it helps us make resources that fit what schools are actually seeing. (No student names, please.)

Want to know how CyberSafely.ai helps families? Reply "overview" and I'll send a short one.

If you'd rather not hear from me, reply "unsubscribe" and I'll take you off my list.

Thank you for the work you do,
{{sender}}
{{title}}, CyberSafely.ai
{{phone}}
{{mailing_address}}

If a student is in crisis, they or their family can call or text 988 (Suicide & Crisis Lifeline).
```

## Why it's written this way

- **Built for BCC.** "Hello," replaces the personal greeting, and nothing names a person, school or state. "I'm following up with the educators who read it" says plainly that it's a group send, without saying "you opened our email".
- **One link only.** Several links, attachments or images in a BCC send to school addresses raise spam scores. The carousel is the one link. Send the PNGs only to people who reply asking for them.
- **Plain text, no formatting.** It's what Outlook's draft gives you, and it reads like a note from a person.
- **Opt-out above the signature.** E0B does the same, because this is a bulk send. It's also why the P.S. from the earlier version was folded into the body.
- **Continues what they opened.** The first line names the newsletter they read. The iceberg's deepest level (what kids keep inside) ties straight back to suicide prevention.
- **Gives before it asks.** It offers a free resource, asks one question, and leaves "overview" as an opt-in for anyone interested.
- **No offer, no product claims.** The Missouri MSBA free year doesn't apply to most of this list, and the email doesn't describe features, so it stays clear of the UNAPPROVED claims list.
- **Careful with the topic.** The tone stays calm, with no statistics or scare lines. Keep the 988 line, because the newsletter was about suicide prevention.

## Before sending

- ⚠️ **Post the carousel first**, then replace `[link to the Online Safety Iceberg post]` with the live post's link. The bulk drawer warns you while a `[bracket]` is left.
- ⚠️ Set the company mailing address in the app's **Profile** tab. It fills `{{mailing_address}}` (required in commercial email).
- ⚠️ **Check with Torino** that these out-of-state contacts are ours to follow up with, and what the "overview" reply should contain (approved claims only).
- Run it past `claims-guard` before the first batch.
- **Send the first batch to yourself plus 2–3 colleagues** to check the link, the signature and how it renders on a phone.

## After a reply

Reply personally. You know who wrote back, so use their name.

- **Shares an issue:** thank them, and note the *type* of issue in Notes (bullying, group chats, self-harm language…), never student details. Mark **Engaged**.
- **"Overview":** send the approved one-pager, and mark **Engaged**.
- **Wants to share with families:** send the five PNGs, and mark **Engaged**.
- **"Unsubscribe":** mark **Declined**, and unsubscribe them in HubSpot too, so the newsletter stops as well.
- **Mentions a student at risk:** reply with 988 and point them to their school's counselor or crisis protocol. Don't record any details.
- **Bounces:** mark **Rejected**.
- **No reply:** leave them be until the next newsletter.

## Refinement notes

- 
