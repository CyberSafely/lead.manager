# Exporting data and working with HubSpot

How lead data leaves the Lead Manager, how it comes back in, and how HubSpot fits on
either side. This is the practical companion to [`database.md`](./database.md), which
covers the cloud database and the longer-term HubSpot API design. Here the focus is on
**what exists today** and the exact rules it follows.

Written from `src/lib/csv.ts` (the import/export logic) and `src/views/Data.tsx` (the
screen that runs it). Last reviewed Nov 4, 2026.

---

## The short version

There are two different things people mean by "sync with HubSpot," and they work very
differently:

1. **Today — CSV round-trip (built, local or cloud).** A human exports a CSV from the
   Lead Manager, hands it to HubSpot (or imports a HubSpot CSV back in). Nothing is sent
   automatically. This is how data moves between the two systems right now.
2. **Later — a HubSpot API connection (design only).** A Supabase Edge Function would
   talk to HubSpot directly, behind per-contact approval. Not built; see
   [`database.md` §4](./database.md#4-hubspot-connection-design) and the open questions
   there.

A **third** kind of sync is internal and unrelated to HubSpot: the **cloud build**
mirrors every change to the team's own Supabase database ([`src/sync.ts`](../src/sync.ts),
[`database.md` §3](./database.md#3-how-the-app-syncs)). That is team-to-team sync, not a
HubSpot path.

Everything below is on the **Data** tab, and every action there applies to **the list
selected at the top** (Principals, Overseers, CTOs, PTA, Campaigns, Users, Affiliates) —
switching lists changes what imports and exports touch.

---

## 1. What's built today

All four of these live on the **Data** tab. All run entirely in the browser; the only
file that leaves is a download the user triggers.

| Action | What it produces | Function |
|---|---|---|
| **Export CSV** | Every contact in the current list, full column set (incl. pipeline, calls) | `toCsv()` |
| **Export counts only (no PII)** | Per-district stage counts and sign-up totals, no names | `aggCsv()` |
| **HubSpot test batch** | The first 1–20 contacts *with an email* from the current filter | `hubspotBatch()` + `toCsv()` |
| **Back up / Restore** | Full JSON of everything (not a HubSpot format) | `backup()` / `migrate()` |

CSV **import** (the reverse direction) is the "Import … (CSV)" and "Import activity log"
cards — covered in [§3](#3-the-round-trip-export--hubspot--re-import).

### Export CSV (full)

The main export. One row per contact in the current list, in a fixed 30-column order
built for HubSpot to match and re-import. It includes **Record ID** and **Email** so
HubSpot can line rows up with existing contacts. See the full column contract in
[§2](#2-the-column-contract).

> **PII note.** The full export *does* include the **Call Note** column (`call.note`),
> which can contain details a caller typed. It does **not** include the general
> **Notes** field (`lead.notes`) — that has no column and never leaves this way. The
> HubSpot test batch below is the safer path when sharing externally, because it screens
> call notes.

### Export counts only (no PII)

`aggCsv()` — one row per district: school count, a column per stage, and parent
sign-up / activated totals. No names, emails, or phone numbers. This is the safe thing
to attach to a status email or drop in a shared folder. Sign-up totals honor the honest-
metrics rule (CLAUDE.md #4): a district with no reported numbers shows
`not yet measurable`, never `0`.

### HubSpot test batch

This is the piece built specifically for the **first HubSpot handoff** (N.'s rules,
[`database.md` §4 phase 0](./database.md#phase-0-test-batch-by-csv-ns-guidance-oct-2026)).
It is the same columns as Export CSV, but with three guardrails for sending contacts
externally:

- **Selection.** It takes the first *N* (1–20) contacts from the **Schools tab's current
  filter**. You narrow the filter first (district, stage, search) to choose who goes in,
  then pick the count. This is how you send a small test batch instead of the whole list.
- **Email required + de-duplicated.** HubSpot matches on email, so contacts with no email
  are left out (and counted), and only the first contact per email address is kept
  (later duplicates are counted and dropped).
- **Family / student screening.** Each candidate's call note is checked against the
  `FAMILY` pattern (words like *student, child, parent*, plus anything that looks like an
  email or phone number). A flagged note is **held back (exported blank)** unless a person
  ticks the box confirming it's safe — or opens the record and edits the note. This
  enforces "no student or family details in notes" from the phase-0 rules.

The download is `hubspot-test-batch-YYYY-MM-DD.csv`. Deals are never created from here —
N. owns deals in HubSpot.

### Back up / Restore (JSON, not HubSpot)

`backup()` writes the entire store (`S`) as JSON — leads, history, templates, settings.
This is the safety net, not a HubSpot format. **Restore** behaves differently per build:

- **Local build:** replaces this browser's data after a confirm.
- **Cloud build:** replaces the **whole team's** shared database after a confirm (earlier
  versions are kept in the database's history). It refuses a backup with duplicate record
  ids.

Always **Back up** before any import, reset, or restore. (Reset and activity-log import
auto-download a backup first.)

---

## 2. The column contract

`toCsv()` emits these 30 columns, in this order, for both **Export CSV** and the
**HubSpot test batch**. N. maps them on the HubSpot side, so **this order and these
names must stay stable** — treat changing them as a breaking change for the HubSpot
import.

| # | Column | Source (`Lead` field) | Notes |
|---|---|---|---|
| 1 | Record ID | `hubspotId` | HubSpot's object id; primary match key on re-import |
| 2 | Email | `email` | Secondary match key; HubSpot de-dupes on it |
| 3 | Phone Number | `phone` | Formatted `(xxx) xxx-xxxx` when 10 digits |
| 4 | First Name | `first` | |
| 5 | Last Name | `last` | |
| 6 | Job Title | `jobtitle` | |
| 7 | School | `school` | |
| 8 | District | `district` | |
| 9 | HubSpot Owner | `owner` | |
| 10 | Stage | `stage` → display name | e.g. `new` exports as "Cold", `lost` as "Declined" |
| 11 | Outreach Touches | `seq` | Position in the email sequence |
| 12 | Shared With Families | `shared` | `yes` / blank |
| 13 | Who Sends | `path` | "We send" / "School forwards" |
| 14 | Next Step | `nextAction` | |
| 15 | Next Due | `nextDue` | |
| 16 | Touches | derived | Count of non-stage, non-note activity entries |
| 17 | Last Touch | derived | Date of the last such entry |
| 18 | Referral Code | `code` | |
| 19 | Sign-up Link | `regLink` | |
| 20 | Parent Signups | `families.signups` | |
| 21 | Activated | `families.activated` | |
| 22 | Counts As Of | `families.asOf` | |
| 23 | Call Outcome | `call.status` → display name | |
| 24 | Call Date | `call.ts` | Date only |
| 25 | Caller | `call.by` | |
| 26 | Call Note | `call.note` | **Blanked for flagged notes in the test batch** |
| 27 | Wants Fundraising Info | `call.fundraising` | `yes` / blank |
| 28 | Campaigns | `campaign` | |
| 29 | State | `state` | |
| 30 | District ID | `districtId` | Links principals ↔ overseers/CTOs |

Columns 10–27 are **pipeline/call fields** the Lead Manager owns. In the planned API
sync these would become HubSpot custom properties (`cs_stage`, `cs_outreach_touches`, …);
see [`database.md` §4 phase B](./database.md#phase-b-app--hubspot-behind-approval).

---

## 3. The round trip: export → HubSpot → re-import

The two systems are kept in step by exporting from one and importing into the other, by
hand. The import side (`importCsv()`) is built to accept a HubSpot export directly.

**Importing a HubSpot export (Principals list):**
- HubSpot path is *Contacts → your Missouri view → Export → CSV*.
- Columns are auto-matched: `Record ID`, `First/Last Name` (or `Name`), `Email`,
  `Phone Number`, `Job Title`, `School`, company, `Contact owner`, `Notes`.
- **Matching order on re-import:** Record ID → email → first + last + district. A match
  updates the existing lead; no match adds a new one. **Stage, history, calls, and
  sign-ups are preserved** on an update — only contact fields are overwritten, and
  `notes` only fills when empty.

**The MSBA "Company" gotcha (important).** In this portal, HubSpot's **Company** column
holds *MSBA* (the list source), not the school or district. So the importer deliberately
prefers a real `District` / `Associated Company` column and only falls back to `Company`.
This is also the open [bug in the "Copy HubSpot version" email button](./database.md#bug-to-fix-along-the-way),
where `{{school}}`/`{{district}}` currently resolve to the MSBA company — fix pending a
decision on which HubSpot property holds the school.

**Other lists have their own import rules** (Overseers/CTOs match on District ID, PTA and
Users split names and keep org names, Affiliates match on handle + platform). Those are
documented inline on each Import card and aren't HubSpot-specific.

**Activity-log import** (`applyActivityLog()`) is a separate CSV path for back-filling
past emails and calls in bulk: columns `Name`/`Email`, `Action` (an email id like `e1`,
or `voicemail`), `Date`, `Note`. Rows already logged on the same date are skipped, so
re-importing is safe.

---

## 4. The rules that constrain all of this

These come straight from CLAUDE.md and the vault, and they're why the HubSpot path looks
the way it does:

- **Nothing leaves automatically** (rule 5). Every export is a download a person clicks;
  every HubSpot handoff is a file a person sends. The only automatic network traffic is
  the cloud build's sync to the team's *own* Supabase database.
- **No real contact data in code, tests, or commits** (rule 6). Exports contain PII, so
  the UI warns to keep CSV and backup files **outside the Obsidian vault**.
- **Call notes are screened before external sharing** (test batch), and the general Notes
  field never exports at all.
- **Honest metrics** (rule 4): counts-only exports show `not yet measurable` rather than
  a misleading `0`.

---

## 5. The planned API connection (not built)

The CSV round-trip is deliberately manual. The design to replace the CSV steps with a
direct, approval-gated HubSpot API connection lives in
[`database.md` §4](./database.md#4-hubspot-connection-design):

- **Architecture:** browser → Supabase Edge Function `hubspot` (holds the private-app
  token) → HubSpot API. The token never reaches the browser; the function checks team
  membership.
- **Phase A (read-only):** pull Missouri contacts into a staging table, show a "HubSpot
  changes" review screen, apply with the same rules as the CSV import. Safe to build
  first — nothing goes out.
- **Phase B (write, behind approval):** draft pipeline updates as HubSpot custom
  properties into a `hubspot_outbox`, a person approves a before/after diff per contact,
  only approved rows send.

Building any of this requires amending CLAUDE.md rule 5 (to allow the one proxy) and
answers to the [open questions](./database.md#open-questions) — portal/access, approval
sign-off, conflict ownership, pull scope, and the school-vs-company property mapping.

---

## Where things live

| | |
|---|---|
| Export / import / batch logic | [`src/lib/csv.ts`](../src/lib/csv.ts) |
| The Data tab UI | [`src/views/Data.tsx`](../src/views/Data.tsx) |
| Cloud (team) sync — not HubSpot | [`src/sync.ts`](../src/sync.ts) |
| Full database + HubSpot design | [`docs/database.md`](./database.md) |
| Cleaning scripts that produce import CSVs | `scripts/clean-*.py` |
