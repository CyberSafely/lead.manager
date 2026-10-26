-- Affiliates list: social media accounts (Instagram, TikTok, Facebook) for the outreach campaign.
-- Their handle, platform, followers and profileUrl have no columns of their own: put_leads keeps them in `extra`.
alter table public.leads drop constraint leads_type_check;
alter table public.leads add constraint leads_type_check
  check (type in ('principal', 'overseer', 'campaign', 'pta', 'user', 'affiliate'));
