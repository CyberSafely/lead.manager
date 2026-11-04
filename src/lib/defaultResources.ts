// Built-in resources, seeded once into S.resources (see migrate() in store.ts). They sync like any resource in the
// cloud build and can be edited or deleted in the app — a deleted one won't come back unless RES_SEED is bumped.
// Bump RES_SEED when you add new entries here so they reach existing installs.
import type { Resource } from "./types";

export const RES_SEED = 2;

export const DEFAULT_RESOURCES: Resource[] = [
  {
    id: "res-district-graph",
    title: "Graphing contact relationships within a district",
    tags: "districts, strategy, graph",
    body: `A district isn't a single contact — it's a web of people. The superintendent (or district overseer) sits at the top, usually a technology/CTO lead sits alongside, each school has its principal, and inside every school are the individual people you actually reach. The district graph lays that whole web out visually so you can see it at a glance instead of reading through notes.

Why it's useful
- See the decision structure instantly: who sits above whom, which schools belong to the district, and where you have a live human versus just a stock principal line.
- Spot the gaps: a school with no named contact, a district with no superintendent on file, a principal with no influencer warmed up yet. Gaps are your next calls.
- Plan the path to a yes: outreach flows upward — influencer → principal → district. The graph shows the shortest route and who can vouch to whom.
- Keep the team aligned: anyone can open a district and understand the relationships in seconds, and see who's already engaged and at what stage before they pick up the phone.

Why it matters
Schools are a referral and forwarding channel, not a one-shot sale. Winning a district usually means warming an influencer who loops in the principal, who forwards the message to families. The relationships ARE the pipeline — mapping them turns a pile of names into a strategy, and makes it obvious where one warm contact can unlock several schools in the same district.`,
  },
  {
    id: "res-school-roles",
    title: "Roles within a school: influencer, gatekeeper, decision maker",
    tags: "calls, strategy, process",
    body: `Almost every school call runs into three roles. Knowing which one you're talking to changes what you say and what you're trying to get.

The gatekeeper — front office, receptionist, admin assistant
- Who they are: the first voice on the main line. Their job is to filter and route calls.
- The reality: ask for "the principal regarding CyberSafely" and you get sent to voicemail roughly 98% of the time — and a cold lead stays cold.
- How to interact: don't pitch them, and don't ask for the principal. Ask for the right person by role ("Who oversees technology or student safety?") so you walk away with a name, an extension, and a transfer to a live person. Be brief, warm and respectful — they decide whether you get through at all.

The influencer — tech overseer, guidance counselor, a "Dr.", a passionate teacher
- Who they are: the person who actually picks up and cares about the mission. You'll be in touch with them about 80% of the time.
- How to interact: this is where you explain what CyberSafely does and what the MSBA has granted the school. Win them over — they carry the message inward. Capture their name, direct extension and email under "People at this school."
- Why: principals' inboxes are flooded. A trusted internal voice gets the idea actually read.

The decision maker — principal, or district overseer
- Who they are: the person who signs off or forwards to families. The real yes.
- How to interact: loop them in LATER, once the influencer is warm and can introduce you or vouch for you. Going straight at them cold almost always dead-ends.

Why a strategically planned process is essential
- These are distinct people with separate names, emails and extensions — treat them that way, not as one entry called "the school."
- The sequence matters: gatekeeper → influencer → decision maker. Skipping steps (cold-calling the principal) wastes the lead.
- A repeatable process means every call ends with a new name, extension and email plus a clear next step, instead of another voicemail. Across hundreds of schools, that process is the difference between building momentum and collecting a stack of cold leads.`,
  },
  {
    id: "res-export-hubspot",
    title: "Exporting data and working with HubSpot",
    tags: "data, hubspot, export, process",
    body: `How contact data leaves the Lead Manager and how it lines up with HubSpot. The short version: there is no automatic connection to HubSpot. Data moves by a CSV a person exports and hands over, or a CSV a person imports back in. Everything happens on the Data tab, and every button there applies to the list selected at the top (Principals, Overseers, CTOs, PTA, Campaigns, Users, Affiliates).

Three things people call "sync" — only one touches HubSpot today
- CSV round-trip (this is the HubSpot path): you export a CSV and send it to the HubSpot admin, or you import a HubSpot export back in. Manual, nothing sent automatically.
- A direct HubSpot API connection: designed but NOT built. It would still require a person to approve each change before anything is sent. Until it exists, use the CSV round-trip.
- Team sync (cloud build): every change saves automatically to CyberSafely's own shared database so teammates see it. This is NOT HubSpot — it never leaves the team's systems.

The export buttons (Data tab)
- Export CSV: every contact in the current list, full detail (stage, touches, calls, sign-ups). Includes Record ID and Email so HubSpot can match rows on re-import. This file contains names, emails and call notes — treat it as sensitive and keep it out of the Obsidian vault.
- Export counts only (no PII): per-district stage counts and sign-up totals, no names or emails. This is the safe one to attach to a status email or share.
- HubSpot test batch: the one built for sending contacts to the HubSpot admin. See below.

The HubSpot test batch — how to send a small, safe set
1. Go to the Schools tab and narrow the filter (district, stage, search) to the people you want to send.
2. On the Data tab, open "HubSpot test batch" and choose a count (1–20).
3. It takes the first N contacts from that filter, with three guardrails:
   - Email required: HubSpot matches on email, so contacts without one are left out (and counted).
   - No duplicate emails: only the first contact per email address is kept.
   - Family/student screening: any call note that looks like it mentions a student, parent, family, email or phone is held back (exported blank) unless you tick the box confirming it's safe, or open the record and edit the note first.
4. Send the downloaded file to the HubSpot admin. Deals are created in HubSpot, never from here.

Bringing a HubSpot export back in
- In HubSpot: Contacts, your Missouri view, Export, CSV. Import it on the Data tab (Principals list).
- Re-importing matches on Record ID first, then email, then name + district. A match updates the contact's details but keeps its stage, history, calls and sign-ups. No match adds a new contact.
- Heads-up on "Company": in this portal HubSpot's Company column is MSBA (the list source), not the school. The importer knows this and prefers the District / Associated Company column instead.

Rules that shape all of this
- Nothing leaves automatically. Every export is a download you click; every handoff is a file a person sends.
- The general Notes field never exports. Call notes do appear in the full Export CSV, which is why the test batch screens them before anything goes to HubSpot.
- Keep exported CSV and backup files outside the Obsidian vault — they contain real names and emails.

For the full technical detail (exact export columns, the planned API connection, open questions), see docs/export-and-hubspot.md and docs/database.md in the project.`,
  },
];
