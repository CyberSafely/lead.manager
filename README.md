# CyberSafely Lead Manager

Tracks Missouri school outreach for CyberSafely.ai, from a cold principal to families signing up. This is the React + TypeScript version of `Outreach Manager.html`, with the same features, screens and saved data.

## Run it

```bash
npm install          # once
npm run dev          # develop: http://localhost:5173, reloads as you edit
npm run build        # builds dist/index.html (open it straight from disk, no server needed)
```

`dist/` holds three files: `index.html` (the whole app), `email-templates.js` and `district-boundaries.js`. Keep them together. Open `dist/index.html` in the browser you already use for the old app.

## Your data

Data lives in the browser's `localStorage` under `cs-outreach-v1`, the same key and shape as the old app. Nothing is uploaded.

- **Chrome, Edge or Brave, opening `dist/index.html` from disk:** all `file://` pages share one storage area, so your existing data shows up automatically.
- **Firefox, or `npm run dev` (http://localhost):** this is a different storage area. In the old app, use **Data → Back up**. In the new app, use **Data → Restore** with that file.

Back up first either way. Backups and CSVs contain names and emails, so keep them out of this repo (`.gitignore` blocks `*.csv` and backup files) and out of the vault.

## Team database (cloud build)

The cloud build stores everything in the team's Supabase database: project `sfpnfitrglyqaximhrrq`. Your team can then work on the same list from any browser. The default `npm run build` stays local-only. To see what's stored and why, and for the HubSpot, import and Explore plans, read [docs/database.md](docs/database.md).

Setup (already done for this project where marked ✓):

1. ✓ Fill in `.env.cloud` (git-ignored). Copy it from `.env.cloud.example`. The publishable key is public. The database password is only for the scripts on your computer.
2. ✓ `npm run db -- apply` creates the tables. `npm run db -- status` shows what's there (counts only).
3. Supabase → **Authentication → Sign In / Providers**: keep Email on and turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user** for each teammate. Then give them access: `npm run db -- add-member pat@example.org --sender "Pat Example" --caller "Pat"`. Add `--admin` for yourself.
5. ✓ Move your data in from a fresh **Data → Back up** of the old app: `npm run migrate-backup -- ~/Downloads/outreach-backup-….json`. This is a dry run that verifies every lead. If it says ✓, run it again with `--commit --owner <your email>`.
6. `npm run dev:cloud` (http://localhost:5174) to try it. `npm run build:cloud` writes `dist-cloud/`, never touching the local app's `dist/`. To deploy on Vercel or Netlify, use that as the build command and `dist-cloud` as the output folder, with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set.

The scripts connect over TLS checked against Supabase's root certificate (`supabase/prod-ca-2021.crt`), and print counts only. The cloud build keeps its offline copy under its own browser storage key, so it never overwrites the local-only app's data.

Every edit or delete keeps the lead's previous version in `lead_history`. When two people change the same lead at the same moment, the last save wins, and the other version is kept there.

## Email templates

Every email is its own file in `emails/`, one subfolder per category (the folder name is the category in the app). The vault's `Emails/` is a shortcut (symlink) to this folder, so Obsidian shows the same files.

Edit a file, save, and reload the app:

```bash
npm run dev            # re-syncs on save and reloads the page by itself
npm run emails:watch   # when you use dist/index.html from disk: keeps dist/ (and the old app's copy) in sync on save
npm run sync-emails    # one-off sync
```

A file becomes an email when its frontmatter has a `template_id`. The text comes from the ```text blocks under `## Subject` and `## Body` (or `## Script`). `stage_after_send` and `touch` set what logging it does. Set `CS_VAULT=/path/to/vault` if the vault moves.

## Tests

```bash
npm test              # unit tests: stage rules, business days, merge fields, CSV import
npm run typecheck
npm run build && npm run test:parity   # drives the old and new app side by side in headless Chromium; must stay 100% identical
```

The parity test needs Chromium once: `npx playwright install chromium`. It uses only the fake CSVs in `tests/e2e/fixtures/`.

## Layout

| Path | What |
|---|---|
| `src/store.ts` | Saved data `S` (load + migrations, save), screen state `ui`, list helpers, `useStore()` |
| `src/sync.ts`, `src/lib/cloudShape.ts` | Cloud build only: Supabase sign-in, upload of what changed after each save, realtime merge |
| `supabase/migrations/` | Database tables, the JSON ⇄ row mapping, views for Explore, row-level security |
| `scripts/db.ts`, `scripts/migrate-backup.ts` | Apply migrations, add team members, move a backup into the database (verified) |
| `docs/database.md` | Database design, HubSpot / import / Explore plans, open questions |
| `src/lib/pipeline.ts` | Stages, call outcomes, `nextFor()`, `suggestTpl()` |
| `src/lib/logic.ts` | Merge fields and stage logic (`setStage`, `logSent`, `setCall`, `setSignups`, `tick`) |
| `src/lib/csv.ts` | CSV import / export, activity-log import |
| `src/lib/report.ts` | Progress report (export + Analytics tab) |
| `src/lib/helpers.ts` | Dates (business days), names, phone and email links |
| `src/components/` | Header + search, drawer (school and bulk send), shared UI |
| `src/views/` | One file per tab: Today, Calls, Schools, Board, Map, Emails, Social, Dashboard, Analytics, Data, Process |
| `src/social/` | Social tab data (posts, Facebook groups, snippets, shared files, discussion) and its building blocks |
| `emails/` | The email templates, one file per email, one folder per category (source of truth) |
| `public/` | `email-templates.js` (generated) and `district-boundaries.js` (MO DESE / MSDIS polygons) |
| `scripts/` | `sync-emails.py`, `clean-schools.py`, `clean-users.py` |
| `legacy/` | The original single-file app, kept as a fallback and as the parity-test reference |
