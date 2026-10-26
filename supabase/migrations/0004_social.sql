-- Social tab: posts (planning + calendar), Facebook groups, caption / hashtag snippets, shared files, and the team's
-- discussion. Each item is one row with its fields in `data`, saved on its own, so teammates editing different posts
-- never overwrite each other. Files live in the private `social-media` storage bucket. Members only, like the leads.

create table public.social_items (
  id text primary key check (length(id) between 1 and 64),
  kind text not null check (kind in ('post', 'group', 'snippet', 'file')),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create index social_items_kind on public.social_items (kind);

create table public.social_comments (
  id text primary key check (length(id) between 1 and 64),
  item_id text not null check (length(item_id) between 1 and 64),   -- a social_items id, or 'team' for the general thread
  body text not null check (length(body) between 1 and 5000),
  author text check (length(author) <= 200),                          -- display name when it was written
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index social_comments_item on public.social_comments (item_id, created_at);

-- Who changed an item last, and when (the app never sets these itself)
create or replace function public.social_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.created_at := now(); new.created_by := auth.uid(); end if;
  new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end $$;
create trigger social_items_touch before insert or update on public.social_items for each row execute function public.social_touch();

create or replace function public.social_comment_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin new.created_at := now(); new.created_by := auth.uid(); return new; end $$;
create trigger social_comments_stamp before insert on public.social_comments for each row execute function public.social_comment_stamp();

alter table public.social_items enable row level security;
alter table public.social_comments enable row level security;
create policy "team reads" on public.social_items for select to authenticated using (public.is_member());
create policy "team writes" on public.social_items for insert to authenticated with check (public.is_member());
create policy "team edits" on public.social_items for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "team deletes" on public.social_items for delete to authenticated using (public.is_member());
create policy "team reads" on public.social_comments for select to authenticated using (public.is_member());
create policy "team writes" on public.social_comments for insert to authenticated with check (public.is_member());
create policy "team deletes" on public.social_comments for delete to authenticated using (public.is_member());

revoke all on public.social_items, public.social_comments from anon, authenticated;
grant select, insert, update, delete on public.social_items to authenticated;
grant select, insert, delete on public.social_comments to authenticated;
revoke execute on function public.social_touch(), public.social_comment_stamp() from public, anon;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.social_items, public.social_comments;
  end if;
end $$;

-- Shared media: a private bucket (no public links), 50 MB per file. Members can view, upload, replace and delete.
-- Only on Supabase itself (the test database has no storage schema).
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit) values ('social-media', 'social-media', false, 52428800)
      on conflict (id) do nothing;
    execute $p$create policy "team reads social media" on storage.objects for select to authenticated
      using (bucket_id = 'social-media' and public.is_member())$p$;
    execute $p$create policy "team uploads social media" on storage.objects for insert to authenticated
      with check (bucket_id = 'social-media' and public.is_member())$p$;
    execute $p$create policy "team updates social media" on storage.objects for update to authenticated
      using (bucket_id = 'social-media' and public.is_member()) with check (bucket_id = 'social-media' and public.is_member())$p$;
    execute $p$create policy "team deletes social media" on storage.objects for delete to authenticated
      using (bucket_id = 'social-media' and public.is_member())$p$;
  end if;
end $$;
