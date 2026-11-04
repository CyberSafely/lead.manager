// Built-in resources, seeded once into S.resources (see migrate() in store.ts). They sync like any resource in the
// cloud build and can be edited or deleted in the app — a deleted one won't come back unless RES_SEED is bumped.
// Bump RES_SEED when you add new entries here so they reach existing installs.
import type { Resource } from "./types";

export const RES_SEED = 1;

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
];
