# Team database, HubSpot, import and Explore

This document covers the cloud version of the Lead Manager:

- what is in the database and why
- how the data gets there
- how HubSpot, imports and an Explore screen fit on top

It was written from a full read of `legacy/Outreach Manager.html`: every stored field, import and export path, report metric and HubSpot touchpoint.

**Status (Oct 19, 2026):**

- The schema is live in project `sfpnfitrglyqaximhrrq`.
- Your Oct 19 backup is migrated: 758 leads, 590 history entries and 27 templates, each verified identical after the round trip.
- HubSpot and Explore are designs waiting on the decisions in [Open questions](#open-questions).

## 1. What's in the database

Project `sfpnfitrglyqaximhrrq` (us-east-1). The schema is `supabase/migrations/0001_lead_manager.sql`, applied with `npm run db -- apply`.

| Table | One row per | Notes |
|---|---|---|
| `leads` | principal, overseer, campaign contact, PTA contact or app user | Every field the app stores has its own column (list below), plus `extra` for anything else |
| `lead_activities` | entry in a lead's history | `ts`, `type` and `note` exactly as written, plus derived `to_stage`, `call_outcome`, `is_touch` and `at` |
| `lead_history` | earlier version of a lead | The whole lead as JSON, written on every change or delete. This is the undo for team edits |
| `config_history` | earlier version of a template or the team settings | Same idea, for the Emails tab and settings |
| `templates` | email, script or blurb | Order is `pos` |
| `app_state` | (one row) | Team settings, report notes and log, template and vault versions |
| `members` | teammate | Access list. Also holds that person's **sender name, caller and phone** |
| `import_batches` | import or migration | Counts only, never contact data |

### Lead columns

| Group | Columns |
|---|---|
| Contact | `first`, `last`, `title_salutation`, `email`, `phone`, `jobtitle`, `school`, `district`, `district_id`, `state`, `city`, `region`, `level`, `grades`, `owner`, `hubspot_id`, `assigned`, `code`, `reg_link`, `campaign`, `notes` |
| Pipeline | `type` / `list`, `stage`, `seq`, `sent[]`, `path`, `shared`, `next_action`, `next_due` |
| Last call | `call_status`, `call_ts`, `call_by`, `call_prev_stage`, `call_prev_seq`, `call_note`, `call_fundraising` |
| Family sign-ups | `signups`, `activated`, `counts_as_of` |
| Timestamps | `created_at`, `updated_at` |

Generated columns for queries: `email_norm`, `email_domain`, `phone_digits`, `district_norm` (the app's `normD`), `campaigns[]`, `next_due_date`, `call_at`, `signups_n`, `activated_n`, `created_at_ts` and others.

### Rules that keep saved data safe

- **Nothing is reshaped.** A field the app never set is `NULL`, and `""` stays `""`. Dates and times keep the app's exact text; typed copies sit beside them for queries. Any field without a column goes to `extra`.
- **One mapping.** `put_leads()` and `lead_to_json()` convert between the app's JSON lead and the rows. The app's sync, the backup migration and the tests all use them, so they can't drift apart.
- **Refuse rather than drop.** A shape the tables can't hold, such as an unknown key inside `call`, is rejected with an error and never silently dropped.
- **Known normalizations,** none of which changes app behavior:
  - `null` fields come back absent.
  - A missing `activity` comes back as `[]`.
  - An empty `call.prev` is dropped.
  - A template's `to` is always present.
  - `src/lib/cloudShape.ts` mirrors these rules exactly, and the tests check that it does.
- **Report metrics no longer parse text.** In the old app, report numbers come from activity note text (`"Cold → Contacted"`, `"Unable to reach…"`). The database turns these into `to_stage` and `call_outcome` columns, so Explore can count them directly.
- **Access.**
  - Only `members` can read (row-level security). Signed-out visitors get nothing; this was checked against the live project.
  - **Nobody writes tables directly.** Every write goes through functions (`put_leads`, `delete_leads`, `put_templates`, `put_app_state`, `log_import`) that check membership and save the previous version. History can't be skipped or faked, even with a stolen session.
  - A member can change only their own sender, caller and phone.
  - **Admins only:** `forget_leads(ids)` removes a contact for good, including its saved versions, for example on a removal request. `purge_lead_history(before)` drops old versions.

### Personal settings

`sender`, `caller` and `phone` used to be global. In the original app, Torino's call outcomes would record `by: Giancarlo`. Each member now has their own values. A member with none set falls back to the team defaults that the migration copied from your backup. Set them per person with:

```bash
npm run db -- add-member <email> --sender "Full Name" --caller "First"
```

## 2. Getting your data in

1. In the Firefox app, choose **Data → Back up**. Keep the file outside the repo and the vault.
2. `npm run migrate-backup -- ~/Downloads/outreach-backup-YYYY-MM-DD.json`: a **dry run**. It loads the backup inside a transaction, reads every lead back, compares it field by field, and then rolls back. The output is counts and field names only.
3. If it says `✓ verified`, re-run with `--commit --owner <your email>`.

The backup goes through the app's own `migrate()` first, so it gets the same upgrades as **Data → Restore**.

Going forward, **Data → Restore** in the cloud build replaces the shared database for everyone (it asks first). **Data → Back up** still downloads the full JSON.

## 3. How the app syncs

`src/sync.ts`, cloud build only:

- **Uploads.** After each `save()`, changed leads go to `put_leads`, removed ones to `delete_leads`, the template list to `put_templates`, and settings to `app_state` and your member row.
- **Teammates' changes.** These arrive over Realtime. A change from the database replaces the local copy unless you have an unsaved edit to that lead; in that case yours uploads next and wins.
- **Conflicts.** When two people edit the same lead at the same moment, the last save wins and `lead_history` keeps the other version. Templates and team settings are merged per template and per setting, so edits to different ones never overwrite each other.
- **Offline.** Edits are kept in this browser, under the cloud build's own storage key, never the local-only app's `cs-outreach-v1`, together with a sync journal. If the tab closes before they upload, they are uploaded on the next sign-in.
- **A lead the database refuses** (for example, text it can't store) is set aside and named in the header. Everything else keeps syncing. Editing that lead retries it.
- **Email templates.** A browser with an older `email-templates.js` can't replace the team's newer templates: the newer `generated` time wins.
- **Testing.** `tests/sync.e2e.test.ts` runs two teammates' browsers against a real Postgres to cover all of the above.
- **Refresh.** The app re-reads everything after a dropped connection and whenever the tab comes back into view.

## 4. HubSpot connection (design)

HubSpot stays the company's system of record. In the old app, data moves by weekly CSV export and import. The goal is to replace those CSV steps without breaking the vault's rule that **nothing goes out automatically**.

### Architecture

```
browser (signed-in member) ──► Supabase Edge Function "hubspot" ──► HubSpot API
                                 · holds the HubSpot private-app token (Supabase secret, never in the browser)
                                 · checks the caller is in members
                                 · writes only rows a person approved in hubspot_outbox
```

- Use a **private-app token** for the one CyberSafely.ai portal. It's simpler than OAuth and is enough for a 2–3 person team.
- Minimum scopes:
  - Reading: `crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.owners.read`, `crm.lists.read`.
  - Writing: `crm.objects.contacts.write`, needed in phase B only.
- CLAUDE.md rule 5 must be amended to allow this one proxy. Today it allows only the team database.

### Phase 0: test batch by CSV (N.'s guidance, Oct 2026)

N. set HubSpot up to take the Lead Manager export as it is. The API phases below wait until this test works.

- **Export as-is.** Don't reshape columns for HubSpot. N. maps them on the HubSpot side, so keep export column names and order stable from now on.
- **Every contact needs an email.** HubSpot matches and de-duplicates on email. Leave rows without one out of the export, and flag them.
- **Test batch first: 10–20 contacts.** The export needs a way to choose a small subset (selection or filter), not only the whole list.
- **No deals.** The app never creates or updates HubSpot deals. N. owns them. That rules out deal objects in phase B too.
- **No student or family details in notes.** Check `notes` and `call_note` before export. Strip or flag them, and only send them on purpose.
- Sending stays manual: a user-triggered download, sent to N. by a person (rule 5).
- **Built:** Data → **HubSpot test batch** (`hubspotBatch()` / `familyFlag()` in `src/lib/csv.ts`). It exports Export CSV's columns for the first 1–20 contacts with an email in the Schools filter. It leaves out contacts with no email and duplicate emails, and leaves flagged call notes blank unless someone ticks them.

### Phase A: read only, HubSpot → app

| Step | How |
|---|---|
| Pull | Contacts in the Missouri list (Lists API memberships), or contacts with `state = MO`. Includes associated companies (the district) and owners. They go to a staging table, `hubspot_contacts(hubspot_id, properties jsonb, company jsonb, pulled_at)`. |
| Match | Same order as the CSV import: Record ID, then email (case-insensitive, using `email_norm`), then first + last + district. |
| Review | A **"HubSpot changes"** screen lists new contacts, changed fields and contacts that left the list. Nothing changes until someone clicks Apply. |
| Apply | Same rules as the CSV import today. Non-empty HubSpot values overwrite contact fields, except `notes`, which is filled only when empty. Stage, history, calls and sign-ups are never touched. Each apply is logged in `import_batches`. |
| Owners | The owners API fills a `hubspot_owners(id, name, email)` table, so `owner` shows real names and unowned contacts get flagged. |

This phase is safe to build first: nothing leaves the team's systems.

### Phase B: app → HubSpot, behind approval

- Add a `hubspot_outbox(id, lead_id, hubspot_id, kind, payload jsonb, status draft|approved|sent|failed|discarded, created_by, approved_by, sent_at, error)` table.
- The app drafts updates from the pipeline. Example: stage, touches, next step, call outcome and sign-ups, as **custom contact properties**.
- The proposed names are `cs_stage`, `cs_outreach_touches`, `cs_next_step`, `cs_next_due`, `cs_call_outcome`, `cs_call_date`, `cs_parent_signups`, `cs_activated`, `cs_referral_code`, `cs_signup_link` and `cs_district_id`. A HubSpot admin must create them, and they need aligning with N.'s planned decision-status and School ID properties.
- A person reviews a per-contact before/after diff and approves. Only approved rows are sent.
- Optional: send call outcomes as HubSpot **call engagements** instead of re-typing them.

### Bug to fix along the way

In the "Copy HubSpot version" button, `{{school}}` and `{{district}}` both become `{{ contact.company }}`. In this portal, `company` holds **MSBA**, so a HubSpot-pasted email would say "MSBA" where the school should be. Fix it by mapping to a real school or district property once one is chosen (open question 6).

## 5. Data import (design)

- **CSV import** (HubSpot exports, the Notion school list, PTA, users) and **activity-log import** keep the current matching rules. In the cloud build, results sync to the team automatically.
- Planned improvements:
  1. Log each import in `import_batches` (counts only).
  2. Match emails case-insensitively (`email_norm`). Today a hand-edited email with capitals won't match on re-import.
  3. Show a **preview** before applying: X new, Y updated, Z skipped.
- **One person in several lists.** Someone can be both a principal and a newsletter contact. They stay separate leads, as in the app today. Explore can show the overlap through `email_norm` and `email_domain`.
- **Cleaning scripts** (`scripts/clean-*.py`) are unchanged. They produce the CSVs you import.

## 6. Explore (design)

The new views make an **Explore** tab cheap to build, since all the counting runs in the database:

| View | Use |
|---|---|
| `v_leads` | One row per lead with derived fields: `stage_name`, `main_idx`, `touches`, `last_touch_at`, `first_email_at`, `first_call_at`, `has_email`, `has_phone`, `has_reg_link`, `wants_fundraising`, sign-ups |
| `v_activities` | Every history entry with `day_ct` (Central time), `is_email`, `is_call`, `is_talk`, `is_bounce`, `to_stage`, `call_outcome` |
| `v_stage_counts`, `v_district_rollup`, `v_activity_daily` | Ready-made counts for the strip, the dashboard, "by district" and touches per day |

**The screen:**
- Choose leads or activity.
- Filter by list, stage, district, region, campaign, owner, due, call outcome or date range.
- Group by one or two of these, and pick a measure: count, sum of sign-ups, emails, calls or talks.
- See a table and a chart.
- Save named views, and export the counts as CSV. Any export that includes names stays user-triggered (rule 5).

**Honest metrics:** sign-up sums come with `signups_reporting`, the number of leads that reported. When it's 0, the screen shows "not yet measurable".

**Time zones:** the old app mixes UTC dates (dashboard), local dates (report) and ET (report header). The views use Missouri time (`America/Chicago`) for daily buckets.

## Open questions

These need your answers before the HubSpot work. Everything above them is built.

1. **Portal and access.** Is it the CyberSafely.ai portal (not the Foundation's)? Who is the HubSpot super-admin who can create a private app and custom properties? What plan tier is it? Newsletter open and click data via the API needs Marketing Hub Starter or above.
2. **Approval.** Do you, and Torino as your manager, approve syncing contact data between HubSpot and this database (it concerns schools that serve minors) and amending rule 5 for the HubSpot proxy?
3. **Who wins on conflict.** Proposed: HubSpot wins for contact fields (name, email, phone, owner, district), and the app wins for pipeline fields (stage, touches, calls, sign-ups).
4. **Pull scope.** Is it the "Missouri" saved view (export it as a list) or `state = MO`? Are overseers, PTA contacts and app users in HubSpot too, and how are they told apart?
5. **Outbound.** Should pipeline fields become custom contact properties, call engagements, or both? Who creates the properties, and how do they relate to N.'s decision-status properties? *Partly answered (phase 0): N. maps the export's columns, and deals are N.'s, never the app's.*
6. **School vs district.** Should schools be HubSpot companies, with the district as the parent company? This decides what `{{school}}` maps to in HubSpot emails.
7. **Newsletters.** Should the HubSpot email-events API pull them automatically (needs the tier above), or should the CSV import stay?
