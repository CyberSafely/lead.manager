-- CyberSafely Lead Manager: shared team database (Supabase / Postgres).
-- Apply with `npm run db -- apply` (scripts/db.ts), which records it in public._migrations.
--
-- Design (see docs/database.md):
-- * One typed column per field the app stores (src/lib/types.ts, legacy/Outreach Manager.html). NULL means the field
--   was absent in the app; '' stays ''. Dates and timestamps keep the app's exact text (next_due, ts, …) and get typed
--   generated columns (next_due_date, at, …) for queries. Anything without a column goes to `extra`, so nothing is lost.
-- * lead_to_json() / put_leads() are the ONE mapping between the app's JSON lead and these rows. The app's sync,
--   the backup migration script and the tests all use them. Activity is its own table (one row per history entry).
-- * Only people in `members` can read (row-level security). Nobody writes tables directly: every write goes through
--   the security-definer functions below (put_leads, delete_leads, put_templates, put_app_state, log_import), which
--   check membership and keep the previous version (lead_history / config_history), so history can't be skipped or forged.
--   Scripts connected straight to the database (scripts/db.ts, migrate-backup.ts) may also write.
-- * Personal settings (sender, caller, phone) live on each member's row.

/* ======================================================================== helpers (immutable, used by generated columns) */

-- ISO timestamp text from the app (always has a Z offset) → timestamptz; anything unparsable → null
create or replace function public.safe_ts(t text) returns timestamptz
language plpgsql immutable as $$
begin return case when t is null or t = '' then null else t::timestamptz end;
exception when others then return null; end $$;

-- 'YYYY-MM-DD' → date; anything else → null
create or replace function public.safe_date(t text) returns date
language plpgsql immutable as $$
begin return case when t ~ '^\d{4}-\d{2}-\d{2}$' then t::date else null end;
exception when others then return null; end $$;

-- Sign-up counts are stored as typed text ('' = not yet measured) → numeric or null
create or replace function public.safe_num(t text) returns numeric
language plpgsql immutable as $$
begin return case when t is null or btrim(t) = '' then null else btrim(t)::numeric end;
exception when others then return null; end $$;

-- campsOf(): comma-separated campaign names → trimmed array without empties
create or replace function public.split_campaigns(t text) returns text[]
language sql immutable as $$
  select coalesce(array_agg(x order by o), '{}') from (
    select btrim(x) x, o from unnest(string_to_array(coalesce(t, ''), ',')) with ordinality u(x, o)) s where x <> ''
$$;

-- normD(): district name normalised for matching overseers ↔ principals and the map
create or replace function public.norm_district(t text) returns text
language sql immutable as $$
  select nullif(regexp_replace(
    regexp_replace(regexp_replace(lower(coalesce(t, '')), '\msaint\M', 'st', 'g'),
      '\m(school|schools|district|public|city|the)\M', '', 'g'),
    '[^a-z0-9]', '', 'g'), '')
$$;

-- digits(): phone digits, dropping a leading US country code
create or replace function public.phone_digits(t text) returns text
language sql immutable as $$
  select case when length(d) = 11 and d like '1%' then substr(d, 2) else nullif(d, '') end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') d) s
$$;

-- Stage display name (as written in 'Stage' activity notes) → stage id
create or replace function public.stage_id(name text) returns text
language sql immutable as $$
  select case btrim(name) when 'Cold' then 'new' when 'Contacted' then 'contacted' when 'Rejected' then 'rejected'
    when 'Engaged' then 'engaged' when 'Live' then 'live' when 'Active' then 'active' when 'Nurture' then 'nurture'
    when 'Declined' then 'lost' end
$$;

-- Report rules (src/lib/report.ts) as columns: the stage a 'Stage' entry moved to ("From → To[: note]") …
create or replace function public.activity_to_stage(type text, note text) returns text
language sql immutable as $$
  select case when type = 'Stage' then public.stage_id(substring(coalesce(note, '') from '→ ([^:]+)')) end
$$;

-- … and the outcome of a 'Call' entry (the note starts with the outcome's name, src/lib/pipeline.ts CALLS)
create or replace function public.activity_call_outcome(type text, note text) returns text
language sql immutable as $$
  select case when type <> 'Call' then null
    when note like 'Interested / Ready to move forward%' then 'interested'
    when note like 'Needs more information%' then 'info'
    when note like 'Follow-up needed%' then 'followup'
    when note like 'Not interested%' then 'not'
    when note like 'Unable to reach%' then 'unreach' end
$$;

/* ======================================================================== team */

create table public.members (
  user_id uuid primary key references auth.users on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  -- personal settings (null = use the team default in app_state.settings)
  sender text,          -- name in email signatures ({{sender}})
  caller text,          -- name recorded on call outcomes (call.by)
  phone text,           -- {{phone}}
  added_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where user_id = auth.uid())
$$;

-- A direct database session (scripts on the admin's computer, the SQL editor) has no JWT
create or replace function public.is_direct_session() returns boolean
language sql stable set search_path = '' as $$
  select auth.uid() is null and coalesce(current_setting('request.jwt.claims', true), '') = ''
    and coalesce(current_setting('request.jwt.claim.sub', true), '') = ''
$$;

create or replace function public.can_write() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member() or public.is_direct_session()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_direct_session() or exists (select 1 from public.members where user_id = auth.uid() and is_admin)
$$;

/* ======================================================================== leads */

create table public.leads (
  id text primary key,
  type text check (type in ('principal', 'overseer', 'campaign', 'pta', 'user')),   -- null = principal (as the app stores it)
  list text generated always as (coalesce(type, 'principal')) stored,

  -- contact (HubSpot / CSV / Notion school list)
  first text, last text, title_salutation text, email text, phone text, jobtitle text,
  school text,           -- organization name for PTA contacts and app users
  district text, district_id text, state text, city text, region text, level text, grades text,
  owner text,            -- HubSpot contact owner (display name)
  hubspot_id text,       -- HubSpot Record ID
  assigned text, code text, reg_link text,
  campaign text,         -- comma-separated campaign names, as the app stores them
  notes text,

  -- pipeline
  stage text not null check (stage in ('new', 'contacted', 'rejected', 'engaged', 'live', 'active', 'nurture', 'lost')),
  seq int,               -- outreach touches 0–3
  sent text[],           -- template ids logged as sent, in order
  path text,             -- '' school forwards · 'we' we send
  shared boolean,        -- principal says they shared it
  next_action text,
  next_due text,         -- 'YYYY-MM-DD' or ''

  -- last call outcome (has_call = the app has a `call` object, possibly empty)
  has_call boolean not null default false,
  call_status text, call_ts text, call_by text, call_prev_stage text, call_prev_seq int, call_note text, call_fundraising boolean,

  -- family sign-ups (has_families = the app has a `families` object; '' = not yet measured)
  has_families boolean not null default false,
  signups text, activated text, counts_as_of text,

  created_at text, updated_at text,   -- the app's createdAt / updatedAt (ISO text)
  extra jsonb,                         -- fields with no column of their own

  -- generated, for queries (Explore, reports, import matching)
  email_norm text generated always as (nullif(lower(btrim(email)), '')) stored,
  email_domain text generated always as (nullif(split_part(lower(btrim(email)), '@', 2), '')) stored,
  phone_digits text generated always as (public.phone_digits(phone)) stored,
  district_norm text generated always as (public.norm_district(district)) stored,
  campaigns text[] generated always as (public.split_campaigns(campaign)) stored,
  next_due_date date generated always as (public.safe_date(next_due)) stored,
  call_at timestamptz generated always as (public.safe_ts(call_ts)) stored,
  signups_n numeric generated always as (public.safe_num(signups)) stored,
  activated_n numeric generated always as (public.safe_num(activated)) stored,
  counts_as_of_date date generated always as (public.safe_date(counts_as_of)) stored,
  created_at_ts timestamptz generated always as (public.safe_ts(created_at)) stored,
  updated_at_ts timestamptz generated always as (public.safe_ts(updated_at)) stored,

  -- bookkeeping
  row_updated_at timestamptz not null default now(),
  row_updated_by uuid default auth.uid()
);
create index leads_list_stage on public.leads (list, stage);
create index leads_list_due on public.leads (list, next_due_date) where next_due_date is not null and stage <> 'lost';
create index leads_email on public.leads (email_norm);
create index leads_hubspot on public.leads (hubspot_id);
create index leads_district_id on public.leads (district_id);
create index leads_district_norm on public.leads (district_norm);
create index leads_domain on public.leads (email_domain);
create index leads_campaigns on public.leads using gin (campaigns);

create table public.lead_activities (
  lead_id text not null references public.leads (id) on delete cascade,
  ord int not null,       -- position in the lead's history (0 = oldest)
  ts text,                -- ISO text, exactly as the app wrote it
  type text,              -- Stage, Note, Email sent, Email rejected, Call, Call: reached, Voicemail, …
  note text,
  extra jsonb,
  at timestamptz generated always as (public.safe_ts(ts)) stored,
  to_stage text generated always as (public.activity_to_stage(type, note)) stored,
  call_outcome text generated always as (public.activity_call_outcome(type, note)) stored,
  is_touch boolean generated always as (coalesce(type not in ('Stage', 'Note'), false)) stored,
  primary key (lead_id, ord)
);
create index lead_activities_at on public.lead_activities (at);
create index lead_activities_type_at on public.lead_activities (type, at);

-- Previous versions of a lead (whole JSON), written by put_leads / delete_leads
create table public.lead_history (
  hid bigint generated always as identity primary key,
  id text not null,
  op text not null check (op in ('UPDATE', 'DELETE')),
  data jsonb not null,
  changed_at timestamptz not null default now(),
  changed_by uuid default auth.uid()
);
create index lead_history_id on public.lead_history (id, changed_at desc);

/* ======================================================================== templates, settings, imports */

create table public.templates (
  id text primary key,
  pos int not null,       -- order in the Emails tab
  phase text, name text, to_stage text, seq int, path text, subject text, body text, kind text, file text,
  extra jsonb,
  row_updated_at timestamptz not null default now(),
  row_updated_by uuid default auth.uid()
);

-- The rest of the app's saved state: one row
create table public.app_state (
  id text primary key default 'main' check (id = 'main'),
  settings jsonb not null default '{}',   -- team settings + report notes/log; sender/caller/phone here are only defaults
  tpl_version int,
  vault_version text,
  vault_ids text[],
  vault_generated text,                   -- `generated` time of the email-templates.js that last synced (newer wins)
  extra jsonb,                            -- unknown top-level keys from a restored backup
  row_updated_at timestamptz not null default now(),
  row_updated_by uuid default auth.uid()
);

-- One row per import or migration: counts only, never contact data
create table public.import_batches (
  id bigint generated always as identity primary key,
  kind text not null,          -- backup, csv, activity-log, hubspot
  list text,
  label text,                  -- e.g. campaign name or file name
  added int, updated int, skipped int,
  summary jsonb,               -- counts only
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- Previous versions of templates and team settings, written by put_templates / put_app_state
create table public.config_history (
  hid bigint generated always as identity primary key,
  kind text not null check (kind in ('template', 'app_state')),
  id text not null,
  op text not null check (op in ('UPDATE', 'DELETE')),
  data jsonb not null,
  changed_at timestamptz not null default now(),
  changed_by uuid default auth.uid()
);

/* ======================================================================== the JSON ⇄ rows mapping */

create or replace function public.lead_to_json(l public.leads) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(l.extra, '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'id', l.id, 'type', l.type,
      'first', l.first, 'last', l.last, 'title_salutation', l.title_salutation, 'email', l.email, 'phone', l.phone,
      'jobtitle', l.jobtitle, 'school', l.school, 'district', l.district, 'districtId', l.district_id, 'state', l.state,
      'city', l.city, 'region', l.region, 'level', l.level, 'grades', l.grades, 'owner', l.owner,
      'hubspotId', l.hubspot_id, 'assigned', l.assigned, 'code', l.code, 'regLink', l.reg_link,
      'campaign', l.campaign, 'notes', l.notes,
      'stage', l.stage, 'seq', l.seq, 'sent', to_jsonb(l.sent), 'path', l.path, 'shared', l.shared,
      'nextAction', l.next_action, 'nextDue', l.next_due, 'createdAt', l.created_at, 'updatedAt', l.updated_at))
    || jsonb_build_object('activity', coalesce((
      select jsonb_agg(coalesce(a.extra, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('ts', a.ts, 'type', a.type, 'note', a.note)) order by a.ord)
      from public.lead_activities a where a.lead_id = l.id), '[]'::jsonb))
    || case when l.has_call then jsonb_build_object('call', jsonb_strip_nulls(jsonb_build_object(
      'status', l.call_status, 'ts', l.call_ts, 'by', l.call_by, 'note', l.call_note, 'fundraising', l.call_fundraising,
      'prev', case when l.call_prev_stage is not null or l.call_prev_seq is not null
        then jsonb_build_object('stage', l.call_prev_stage, 'seq', l.call_prev_seq) end))) else '{}'::jsonb end
    || case when l.has_families then jsonb_build_object('families', jsonb_strip_nulls(jsonb_build_object(
      'signups', l.signups, 'activated', l.activated, 'asOf', l.counts_as_of))) else '{}'::jsonb end
$$;

-- What the app reads: one JSON lead per row
create view public.leads_json with (security_invoker = true) as
  select l.id, public.lead_to_json(l) as data, l.row_updated_at from public.leads l;

/** Upsert leads given as the app's JSON objects (an array). Keeps the previous version in lead_history.
 *  A lead that can't be stored is skipped and reported in `failed` (the others are saved). */
create or replace function public.put_leads(items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  it jsonb; c jsonb; f jsonb; act jsonb; n int := 0; old jsonb; ex jsonb; failed jsonb := '[]'::jsonb;
  known text[] := array['id','type','first','last','title_salutation','email','phone','jobtitle','school','district',
    'districtId','state','city','region','level','grades','owner','hubspotId','assigned','code','regLink','campaign',
    'notes','stage','seq','sent','path','shared','nextAction','nextDue','call','families','activity','createdAt','updatedAt'];
begin
  if not public.can_write() then raise exception 'not a team member' using errcode = '42501'; end if;
  if jsonb_typeof(items) <> 'array' then raise exception 'items must be an array'; end if;
  for it in select * from jsonb_array_elements(items) loop
    begin
      if jsonb_typeof(it) <> 'object' or coalesce(it ->> 'id', '') = '' then raise exception 'lead without id'; end if;
      -- null counts as absent; any other non-object / non-array shape would be lost, so refuse it
      if jsonb_typeof(it -> 'call') not in ('object', 'null') then raise exception 'call is not an object'; end if;
      if jsonb_typeof(it -> 'families') not in ('object', 'null') then raise exception 'families is not an object'; end if;
      if jsonb_typeof(it -> 'activity') not in ('array', 'null') then raise exception 'activity is not a list'; end if;
      if jsonb_typeof(it -> 'sent') not in ('array', 'null') then raise exception 'sent is not a list'; end if;
      c := case when jsonb_typeof(it -> 'call') = 'object' then it -> 'call' end;
      f := case when jsonb_typeof(it -> 'families') = 'object' then it -> 'families' end;
      act := case when jsonb_typeof(it -> 'activity') = 'array' then it -> 'activity' else '[]'::jsonb end;
      -- keys inside call / families / call.prev / activity entries that have no column would be lost: refuse instead
      if c is not null and exists (select 1 from jsonb_object_keys(c) k where k not in ('status','ts','by','prev','note','fundraising')) then
        raise exception 'unknown key in call'; end if;
      if f is not null and exists (select 1 from jsonb_object_keys(f) k where k not in ('signups','activated','asOf')) then
        raise exception 'unknown key in families'; end if;
      if jsonb_typeof(c -> 'prev') not in ('object', 'null') or (jsonb_typeof(c -> 'prev') = 'object'
          and exists (select 1 from jsonb_object_keys(c -> 'prev') k where k not in ('stage','seq'))) then
        raise exception 'unexpected call.prev'; end if;
      if exists (select 1 from jsonb_array_elements(act) e where jsonb_typeof(e) <> 'object') then raise exception 'activity entry is not an object'; end if;

      select public.lead_to_json(l) into old from public.leads l where l.id = it ->> 'id';
      ex := it - known; if ex = '{}'::jsonb then ex := null; end if;
      insert into public.leads as l (id, type, first, last, title_salutation, email, phone, jobtitle, school, district,
        district_id, state, city, region, level, grades, owner, hubspot_id, assigned, code, reg_link, campaign, notes,
        stage, seq, sent, path, shared, next_action, next_due,
        has_call, call_status, call_ts, call_by, call_prev_stage, call_prev_seq, call_note, call_fundraising,
        has_families, signups, activated, counts_as_of, created_at, updated_at, extra, row_updated_at, row_updated_by)
      values (it ->> 'id', it ->> 'type', it ->> 'first', it ->> 'last', it ->> 'title_salutation', it ->> 'email',
        it ->> 'phone', it ->> 'jobtitle', it ->> 'school', it ->> 'district', it ->> 'districtId', it ->> 'state',
        it ->> 'city', it ->> 'region', it ->> 'level', it ->> 'grades', it ->> 'owner', it ->> 'hubspotId',
        it ->> 'assigned', it ->> 'code', it ->> 'regLink', it ->> 'campaign', it ->> 'notes',
        it ->> 'stage', (it ->> 'seq')::int,
        case when jsonb_typeof(it -> 'sent') = 'array' then array(select jsonb_array_elements_text(it -> 'sent')) end,
        it ->> 'path', (it ->> 'shared')::boolean, it ->> 'nextAction', it ->> 'nextDue',
        c is not null, c ->> 'status', c ->> 'ts', c ->> 'by', c -> 'prev' ->> 'stage', (c -> 'prev' ->> 'seq')::int,
        c ->> 'note', (c ->> 'fundraising')::boolean,
        f is not null, f ->> 'signups', f ->> 'activated', f ->> 'asOf',
        it ->> 'createdAt', it ->> 'updatedAt', ex, now(), auth.uid())
      on conflict (id) do update set type = excluded.type, first = excluded.first, last = excluded.last,
        title_salutation = excluded.title_salutation, email = excluded.email, phone = excluded.phone,
        jobtitle = excluded.jobtitle, school = excluded.school, district = excluded.district,
        district_id = excluded.district_id, state = excluded.state, city = excluded.city, region = excluded.region,
        level = excluded.level, grades = excluded.grades, owner = excluded.owner, hubspot_id = excluded.hubspot_id,
        assigned = excluded.assigned, code = excluded.code, reg_link = excluded.reg_link, campaign = excluded.campaign,
        notes = excluded.notes, stage = excluded.stage, seq = excluded.seq, sent = excluded.sent, path = excluded.path,
        shared = excluded.shared, next_action = excluded.next_action, next_due = excluded.next_due,
        has_call = excluded.has_call, call_status = excluded.call_status, call_ts = excluded.call_ts,
        call_by = excluded.call_by, call_prev_stage = excluded.call_prev_stage, call_prev_seq = excluded.call_prev_seq,
        call_note = excluded.call_note, call_fundraising = excluded.call_fundraising,
        has_families = excluded.has_families, signups = excluded.signups, activated = excluded.activated,
        counts_as_of = excluded.counts_as_of, created_at = excluded.created_at, updated_at = excluded.updated_at,
        extra = excluded.extra, row_updated_at = now(), row_updated_by = auth.uid();

      -- history entries: rewrite only positions that changed, drop the tail if it got shorter (reset)
      delete from public.lead_activities where lead_id = it ->> 'id' and ord >= jsonb_array_length(act);
      insert into public.lead_activities as a (lead_id, ord, ts, type, note, extra)
        select it ->> 'id', (e.o - 1)::int, e.v ->> 'ts', e.v ->> 'type', e.v ->> 'note',
          nullif(e.v - array['ts','type','note'], '{}'::jsonb)
        from jsonb_array_elements(act) with ordinality e(v, o)
      on conflict (lead_id, ord) do update set ts = excluded.ts, type = excluded.type, note = excluded.note, extra = excluded.extra
        where (a.ts, a.type, a.note, a.extra) is distinct from (excluded.ts, excluded.type, excluded.note, excluded.extra);
      -- keep the previous version only when something really changed
      if old is not null and old is distinct from (select public.lead_to_json(l) from public.leads l where l.id = it ->> 'id') then
        insert into public.lead_history (id, op, data, changed_by) values (it ->> 'id', 'UPDATE', old, auth.uid());
      end if;
      n := n + 1;
    exception when others then
      failed := failed || jsonb_build_array(jsonb_build_object('id', it ->> 'id', 'error', sqlerrm));
    end;
  end loop;
  return jsonb_build_object('saved', n, 'failed', failed);
end $$;

create or replace function public.delete_leads(ids text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.can_write() then raise exception 'not a team member' using errcode = '42501'; end if;
  insert into public.lead_history (id, op, data, changed_by)
    select l.id, 'DELETE', public.lead_to_json(l), auth.uid() from public.leads l where l.id = any (ids);
  delete from public.leads where id = any (ids);
  get diagnostics n = row_count; return n;
end $$;

-- Templates as the app's JSON, in Emails-tab order
create view public.templates_json with (security_invoker = true) as
  select t.id, t.pos, coalesce(t.extra, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'id', t.id, 'phase', t.phase, 'name', t.name, 'seq', t.seq, 'path', t.path, 'subject', t.subject, 'body', t.body,
      'kind', t.kind, 'file', t.file)) || jsonb_build_object('to', t.to_stage) as data
  from public.templates t;

/** Upsert the given templates (with their position) and delete the ids in `remove`. Only what changed is sent,
 *  so teammates editing different templates don't overwrite each other. Previous versions go to config_history. */
create or replace function public.put_templates(items jsonb, remove text[] default '{}') returns integer
language plpgsql security definer set search_path = '' as $$
declare n int := 0; m int;
begin
  if not public.can_write() then raise exception 'not a team member' using errcode = '42501'; end if;
  insert into public.config_history (kind, id, op, data, changed_by)
    select 'template', t.id, 'DELETE', to_jsonb(t) - 'row_updated_at' - 'row_updated_by', auth.uid()
    from public.templates t where t.id = any (remove);
  delete from public.templates where id = any (remove);
  insert into public.config_history (kind, id, op, data, changed_by)
    select 'template', t.id, 'UPDATE', to_jsonb(t) - 'row_updated_at' - 'row_updated_by', auth.uid()
    from public.templates t join jsonb_array_elements(items) e(v) on e.v ->> 'id' = t.id;
  insert into public.templates as t (id, pos, phase, name, to_stage, seq, path, subject, body, kind, file, extra, row_updated_at, row_updated_by)
    select e.v ->> 'id', coalesce((e.v ->> '_pos')::int, 0), e.v ->> 'phase', e.v ->> 'name', e.v ->> 'to', (e.v ->> 'seq')::int,
      e.v ->> 'path', e.v ->> 'subject', e.v ->> 'body', e.v ->> 'kind', e.v ->> 'file',
      nullif(e.v - array['id','_pos','phase','name','to','seq','path','subject','body','kind','file'], '{}'::jsonb), now(), auth.uid()
    from jsonb_array_elements(items) e(v)
  on conflict (id) do update set pos = excluded.pos, phase = excluded.phase, name = excluded.name, to_stage = excluded.to_stage,
    seq = excluded.seq, path = excluded.path, subject = excluded.subject, body = excluded.body, kind = excluded.kind,
    file = excluded.file, extra = excluded.extra, row_updated_at = now(), row_updated_by = auth.uid();
  get diagnostics n = row_count;
  return n;
end $$;

/** Team settings: merge the changed keys (p_set) and remove p_unset, so teammates editing different settings
 *  don't overwrite each other. The previous row goes to config_history. */
create or replace function public.put_app_state(p_set jsonb, p_unset text[], p_tpl_version int, p_vault_version text,
  p_vault_ids text[], p_vault_generated text, p_extra jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_write() then raise exception 'not a team member' using errcode = '42501'; end if;
  insert into public.config_history (kind, id, op, data, changed_by)
    select 'app_state', 'main', 'UPDATE', to_jsonb(s) - 'row_updated_at' - 'row_updated_by', auth.uid() from public.app_state s;
  insert into public.app_state as s (id, settings, tpl_version, vault_version, vault_ids, vault_generated, extra, row_updated_at, row_updated_by)
    values ('main', coalesce(p_set, '{}'::jsonb), p_tpl_version, p_vault_version, p_vault_ids, p_vault_generated, p_extra, now(), auth.uid())
  on conflict (id) do update set settings = (s.settings - coalesce(p_unset, '{}'::text[])) || coalesce(p_set, '{}'::jsonb),
    tpl_version = excluded.tpl_version, vault_version = excluded.vault_version, vault_ids = excluded.vault_ids,
    vault_generated = excluded.vault_generated, extra = excluded.extra, row_updated_at = now(), row_updated_by = auth.uid();
end $$;

/** Record an import (counts only, never contact data). */
create or replace function public.log_import(p_kind text, p_list text, p_label text, p_added int, p_updated int, p_skipped int, p_summary jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare i bigint;
begin
  if not public.can_write() then raise exception 'not a team member' using errcode = '42501'; end if;
  insert into public.import_batches (kind, list, label, added, updated, skipped, summary, created_by)
    values (p_kind, p_list, p_label, p_added, p_updated, p_skipped, p_summary, auth.uid()) returning id into i;
  return i;
end $$;

/** Admin only: remove contacts for good, including every saved version (e.g. a removal request). */
create or replace function public.forget_leads(ids text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  delete from public.lead_history where id = any (ids);
  delete from public.leads where id = any (ids);
  get diagnostics n = row_count; return n;
end $$;

/** Admin only: drop saved lead versions older than a date (they hold contact data). */
create or replace function public.purge_lead_history(before timestamptz) returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  delete from public.lead_history where changed_at < before;
  get diagnostics n = row_count; return n;
end $$;

/* ======================================================================== Explore / report views (counts run server-side) */

create view public.v_leads with (security_invoker = true) as
  select l.id, l.list, l.stage,
    case l.stage when 'new' then 'Cold' when 'contacted' then 'Contacted' when 'rejected' then 'Rejected' when 'engaged' then 'Engaged'
      when 'live' then 'Live' when 'active' then 'Active' when 'nurture' then 'Nurture' when 'lost' then 'Declined' end as stage_name,
    array_position(array['new','contacted','engaged','live','active'], l.stage) - 1 as main_idx,   -- null = off the main path
    l.stage <> 'new' as is_contacted,
    coalesce(l.school, l.district) as school_or_district,
    l.school, l.district, l.district_id, l.district_norm, l.region, l.level, l.grades, l.city, l.state, l.owner, l.assigned,
    l.hubspot_id, l.email_norm is not null as has_email, l.phone_digits is not null as has_phone,
    coalesce(l.reg_link, '') <> '' as has_reg_link, l.campaigns, l.email_domain,
    coalesce(l.seq, 0) as seq, coalesce(l.shared, false) as shared, coalesce(l.path, '') as path,
    l.next_action, l.next_due_date, l.call_status, l.call_at, l.call_by, coalesce(l.call_fundraising, false) as wants_fundraising,
    l.signups_n, l.activated_n, l.counts_as_of_date, l.created_at_ts, l.updated_at_ts,
    t.touches, t.last_touch_at, t.first_email_at, t.first_call_at
  from public.leads l
  left join lateral (
    select count(*) filter (where a.is_touch) as touches, max(a.at) filter (where a.is_touch) as last_touch_at,
      min(a.at) filter (where a.type = 'Email sent') as first_email_at,
      min(a.at) filter (where a.type in ('Call', 'Call: reached', 'Voicemail', 'Front office message')) as first_call_at
    from public.lead_activities a where a.lead_id = l.id) t on true;

create view public.v_activities with (security_invoker = true) as
  select a.lead_id, l.list, l.district, l.region, a.ord, a.at, (a.at at time zone 'America/Chicago')::date as day_ct,
    a.type, a.to_stage, a.call_outcome, a.is_touch,
    a.type = 'Email sent' as is_email,
    a.type in ('Call', 'Call: reached', 'Voicemail', 'Front office message') as is_call,
    a.type in ('Call: reached', 'Reply received', 'Meeting / demo', 'Says they shared it')
      or (a.type = 'Call' and coalesce(a.note, '') not like 'Unable to reach%') as is_talk,
    a.type = 'Email rejected' as is_bounce
  from public.lead_activities a join public.leads l on l.id = a.lead_id;

create view public.v_stage_counts with (security_invoker = true) as
  select list, stage, count(*) as n from public.leads group by list, stage;

-- Sums show "not yet measurable" in the app when *_reporting = 0 (honest metrics)
create view public.v_district_rollup with (security_invoker = true) as
  select list, coalesce(nullif(district, ''), '(none)') as district, count(*) as n,
    count(*) filter (where stage <> 'new') as contacted,
    count(*) filter (where stage in ('engaged', 'live', 'active')) as engaged_plus,
    sum(signups_n) as signups, count(signups_n) as signups_reporting,
    sum(activated_n) as activated, count(activated_n) as activated_reporting
  from public.leads group by 1, 2;

create view public.v_activity_daily with (security_invoker = true) as
  select day_ct, list, count(*) filter (where is_email) as emails, count(*) filter (where is_call) as calls,
    count(*) filter (where is_touch) as touches, count(*) filter (where is_talk) as talks, count(*) filter (where is_bounce) as bounces
  from public.v_activities group by 1, 2;

/* ======================================================================== access */

alter table public.members enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.lead_history enable row level security;
alter table public.templates enable row level security;
alter table public.app_state enable row level security;
alter table public.import_batches enable row level security;
alter table public.config_history enable row level security;

-- Members read everything; the only direct write is your own sender / caller / phone
create policy "team reads" on public.members for select to authenticated using (public.is_member());
create policy "own settings" on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "team reads" on public.leads for select to authenticated using (public.is_member());
create policy "team reads" on public.lead_activities for select to authenticated using (public.is_member());
create policy "team reads" on public.lead_history for select to authenticated using (public.is_member());
create policy "team reads" on public.templates for select to authenticated using (public.is_member());
create policy "team reads" on public.app_state for select to authenticated using (public.is_member());
create policy "team reads" on public.import_batches for select to authenticated using (public.is_member());
create policy "team reads" on public.config_history for select to authenticated using (public.is_member());

-- Explicit privileges (don't rely on the project's "expose new tables" default)
revoke all on public.members, public.leads, public.lead_activities, public.lead_history, public.templates, public.app_state,
  public.import_batches, public.config_history, public.leads_json, public.templates_json, public.v_leads, public.v_activities,
  public.v_stage_counts, public.v_district_rollup, public.v_activity_daily from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.members, public.leads, public.lead_activities, public.lead_history, public.templates, public.app_state,
  public.import_batches, public.config_history, public.leads_json, public.templates_json, public.v_leads, public.v_activities,
  public.v_stage_counts, public.v_district_rollup, public.v_activity_daily to authenticated;
grant update (sender, caller, phone) on public.members to authenticated;

-- Functions: writers and checks for signed-in users only (not anon); pure helpers stay callable
revoke execute on function public.put_leads(jsonb), public.delete_leads(text[]), public.put_templates(jsonb, text[]),
  public.put_app_state(jsonb, text[], int, text, text[], text, jsonb), public.log_import(text, text, text, int, int, int, jsonb),
  public.forget_leads(text[]), public.purge_lead_history(timestamptz), public.lead_to_json(public.leads),
  public.is_member(), public.can_write(), public.is_admin(), public.is_direct_session() from public, anon;
grant execute on function public.put_leads(jsonb), public.delete_leads(text[]), public.put_templates(jsonb, text[]),
  public.put_app_state(jsonb, text[], int, text, text[], text, jsonb), public.log_import(text, text, text, int, int, int, jsonb),
  public.forget_leads(text[]), public.purge_lead_history(timestamptz), public.lead_to_json(public.leads),
  public.is_member(), public.can_write(), public.is_admin(), public.is_direct_session(),
  public.safe_ts(text), public.safe_date(text), public.safe_num(text), public.split_campaigns(text), public.norm_district(text),
  public.phone_digits(text), public.stage_id(text), public.activity_to_stage(text, text), public.activity_call_outcome(text, text)
  to authenticated;

-- Anything created later in this schema is not readable by signed-out visitors unless granted on purpose
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;

/* ======================================================================== live updates between teammates */

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.leads, public.templates, public.app_state;
  end if;
end $$;
