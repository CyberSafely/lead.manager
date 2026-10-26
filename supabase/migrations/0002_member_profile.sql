-- Profile tab: a job title and the email shown in signatures, per team member ({{title}}, {{sender_email}}).
-- Null = not set (the app then uses your sign-in email, and a "[your title]" placeholder).
alter table public.members add column title text, add column sender_email text;

-- Members may edit these on their own row, like sender / caller / phone ("own settings" policy)
grant update (title, sender_email) on public.members to authenticated;
