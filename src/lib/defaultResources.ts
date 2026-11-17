// Built-in resources, seeded once into S.resources (see migrate() in store.ts). They sync like any resource in the
// cloud build and can be edited or deleted in the app — a deleted one won't come back unless RES_SEED is bumped.
// Bump RES_SEED when you add new entries here so they reach existing installs.
import type { Resource } from "./types";

export const RES_SEED = 3;

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
  {
    id: "res-big-districts",
    title: "Focus on the biggest districts (and the top 10 to optimize)",
    tags: "districts, strategy, priorities",
    body: `Missouri has 562 school districts, but its students are concentrated in a small number of them. Source: DESE School Directory, Nov 2026 (886,000 students in total).

How concentrated it is
- The 10 largest districts hold about 21% of all Missouri students (186,000).
- The 20 largest hold about 35% (309,000).
- The 40 largest hold about 49%, nearly half (433,000).
- The 50 largest hold about 54% (479,000).
So roughly 7% of districts reach about half of the state's families. One large district can equal dozens of small ones.

What this means for outreach
- Spend the most effort where the families are. A strong relationship in one big district is worth more than a dozen cold calls to small ones.
- In big districts, go to the district office, not each school. Guidance counselors rarely have decision-making power. The people who can say yes oversee all the schools: the head of student services, the technology head (CTO/CIO), and the safety and security lead. The superintendent is already on the Overseer list.
- Make every call land on a named person. The goal is that no call to a big district goes to a general front desk.

What a "robust" big-district lead looks like
- 1 to 5 district leaders on the CTOs list, each with name, title, direct phone and email (whenever the district publishes one).
- Linked to the district by its District ID, so they show under the district in the Graph next to the superintendent.
- If a district publishes only phone numbers, ask for the email on the call and add it. HubSpot matches people by email, so phone-only contacts don't come through.

The top 10 districts to optimize (students, area, website)
1. Springfield R-XII: 24,500 students, Springfield (sps.org, not the address DESE lists)
2. North Kansas City 74: 21,700, Kansas City north (nkcschools.org)
3. Rockwood R-VI: 19,300, west St. Louis County (rsdmo.org)
4. Columbia 93: 18,400, Columbia (cpsk12.org)
5. Wentzville R-IV: 17,800, St. Charles County (wentzville.k12.mo.us)
6. Lee's Summit R-VII: 17,700, Kansas City metro (lsr7.org)
7. St. Louis City (Saint Louis Public Schools): 17,200, St. Louis (slps.org)
8. Francis Howell R-III: 16,900, St. Charles County (fhsdschools.org)
9. Parkway C-2: 16,600, west St. Louis County (parkwayschools.net)
10. Hazelwood: 16,400, north St. Louis County (hazelwoodschools.org)

Next in line (11 to 20): Fort Zumwalt, Kansas City 33, Blue Springs, Independence, Liberty, Park Hill, St. Joseph, Fox C-6, Mehlville, Ferguson-Florissant.

Tip: plan call days by area. Kansas City (North Kansas City, Lee's Summit, plus KC 33, Blue Springs, Independence, Liberty, Park Hill), St. Louis city and county (St. Louis City, Rockwood, Parkway, Hazelwood), and St. Charles (Wentzville, Francis Howell, Fort Zumwalt) each make a full day.`,
  },
];
