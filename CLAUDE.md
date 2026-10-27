# CLAUDE.md: CyberSafely Lead Manager (React)

A browser app that tracks Missouri school outreach for CyberSafely.ai. Giancarlo uses it every day, and real contact data lives in his browser. **Don't break existing saved data.** See `README.md` for commands and layout.

## Stack

- Vite 6 + React 18 + TypeScript (strict). `npm run build` makes a single-file `dist/index.html` (vite-plugin-singlefile, `base: "./"`), so it still opens from `file://`.
- `public/email-templates.js` (sets `window.VAULT_TEMPLATES`) and `public/district-boundaries.js` (`window.MO_DISTRICTS`) load as classic scripts before the app. Both are optional.
- State is persisted in `localStorage` under `cs-outreach-v1`, and the active list under `cs-outreach-v1-ds`.
- The Social tab (`src/social/data.ts`, `views/Social*.tsx`) keeps its own data apart from `S`: posts, Facebook groups, snippets, files and comments. Local build: `cs-outreach-v1-social`. Cloud build: tables `social_items` / `social_comments` and the private `social-media` storage bucket (`supabase/migrations/0004_social.sql`), saved per item with realtime updates.
- Cloud build (`npm run build:cloud`, env in `.env.cloud`): `src/sync.ts` also syncs to Supabase (project `sfpnfitrglyqaximhrrq`). After each `save()` it sends changed leads to `put_leads()` / `delete_leads()`, templates to `put_templates()`, team settings to `app_state` and personal ones (`sender`, `caller`, `phone`) to the user's `members` row. The JSON ⇄ row mapping lives in SQL (`supabase/migrations/`); `src/lib/cloudShape.ts` mirrors its normal form and `tests/db.test.ts` checks both in PGlite. Schema changes = a new numbered migration file (never edit an applied one), then `npm run db -- apply`. The local build tree-shakes all of this out, so parity is unaffected. Design and HubSpot plans: `docs/database.md`.

## How state works

`S` (saved data) and `ui` (screen state) in `src/store.ts` are plain mutable objects, as in the original app. Logic mutates them, then calls `save()` (persist + re-render) or `render()` (re-render only). Components subscribe with `useStore()`. Keep this pattern: the logic is a line-for-line port and the parity test depends on it.

Text inputs that save use `<Inp>` / `<Ta>` from `components/ui.tsx`. They commit on the native `change` event (blur or Enter), like the original, not on every keystroke.

## Rules for changes

1. **Saved data must survive.** Never rename `KEY`, stage ids (`lost` shows as "Declined", `new` as "Cold") or lead fields. If the stored shape changes, bump `TPL_VERSION` and add an `if (ver < N) {…}` step in `load()`.
2. **Stage changes go through `setStage()`**, so they're logged and the next action is recomputed. Use `logSent()` and `setCall()` rather than setting fields directly.
3. **Due dates use business days** (`addBiz`). Contract times are US Eastern, and Missouri is Central.
4. **Honest metrics:** a measure with no data shows "not yet measurable", never 0%.
5. **No PII leaves the app automatically, except to the team's own Supabase database** (cloud build only, `src/sync.ts`, access limited to `members` by row-level security). No other network calls, no analytics, no third-party services. One approved exception (Oct 27, 2026): Affiliates → Quick add sends a public Instagram username to the team's Supabase function `ig-lookup`, which asks Meta's Graph API (cloud build only, on a click; see `docs/instagram-lookup.md`). The default build stays local-only. Email actions open a draft (`mailto:`, Gmail, Outlook deeplink) for a human to send. Exports are user-triggered downloads.
6. **No real contact data in code, tests, fixtures or commits.** Use fake names (`Pat Example`, `@example.org`). Real addresses the cleaning script needs go in the git-ignored `scripts/known-wrong-contacts.txt`.
7. Keep CSS on the existing tokens in `src/styles.css`, and check light and dark mode.
8. Emails live in `emails/<category>/*.md` (one file per email; the vault's `Emails/` is a symlink to it). Don't hand-edit `public/email-templates.js`: `npm run dev` re-syncs it on save, or run `npm run sync-emails` / `npm run emails:watch`.
9. React renders user data as text. The one exception is the report (`rptBody`), which builds HTML for the export and the Analytics tab, so pass user data through `esc()` there.

## Checking your work

```bash
npm run typecheck && npm test
npm run build && npm run test:parity    # the old vs new comparison; keep it at 100% unless a change is intentional
```

When you change behavior on purpose, the parity test will flag it. Update `legacy/` only if the old app should change too. Otherwise note the intentional difference in the test's `norm()` function or the steps. Before any change to `load()` or stored data, ask Giancarlo to do **Data → Back up** first.

## Context

The vault (`/home/giancarlo/Desktop/CyberSafely`) holds the contract notes and the real data files. Its `Emails/` is a symlink to this project's `emails/`. Its `CLAUDE.md` rules also apply: no PII, nothing sent automatically. Commit only when asked.
