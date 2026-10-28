-- CTOs list: district technology leaders (CTO, CIO, technology director). District-level like overseers,
-- but kept as their own list. Same columns as overseers, so only the allowed type changes.
alter table public.leads drop constraint leads_type_check;
alter table public.leads add constraint leads_type_check
  check (type in ('principal', 'overseer', 'cto', 'campaign', 'pta', 'user', 'affiliate'));
