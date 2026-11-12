-- נפל האסימון: threaded group chat, join message, and email notifications for messages.
-- Run AFTER accounts.sql. Safe to run more than once.

-- 1. Threaded comments: a message can reply to another one.
alter table public.group_messages add column if not exists parent_id uuid references public.group_messages(id) on delete cascade;
create index if not exists group_messages_parent on public.group_messages(parent_id);
alter table public.group_messages add column if not exists notified_at timestamptz;
alter table public.inquiry_messages add column if not exists notified_at timestamptz;

-- 2. Join message: shown only to the group's tutor and to members who were let in (it may hold a WhatsApp link).
create or replace function public.is_group_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_seats where group_id = g and user_id = auth.uid() and status = 'approved');
$$;
create or replace function public.owns_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups gr where gr.id = g and public.owns_tutor(gr.tutor_id));
$$;
create table if not exists public.group_secrets (
  group_id uuid primary key references public.groups(id) on delete cascade,
  join_message text not null default '' check (length(join_message) <= 1500)
);
alter table public.group_secrets enable row level security;
drop policy if exists "secrets read" on public.group_secrets;
create policy "secrets read" on public.group_secrets for select using (public.owns_group(group_id) or public.is_group_member(group_id));
drop policy if exists "secrets write" on public.group_secrets;
create policy "secrets write" on public.group_secrets for insert with check (public.owns_group(group_id));
drop policy if exists "secrets update" on public.group_secrets;
create policy "secrets update" on public.group_secrets for update using (public.owns_group(group_id)) with check (public.owns_group(group_id));
drop policy if exists "secrets delete" on public.group_secrets;
create policy "secrets delete" on public.group_secrets for delete using (public.owns_group(group_id));

-- 3. Email: a tutor's message in a group goes to every member; a chat message goes to the other side.
create extension if not exists pg_net with schema extensions;
create or replace function public.notify_message() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  -- to_jsonb(new) because inquiry_messages has no is_tutor column
  if tg_table_name = 'group_messages' and not coalesce((to_jsonb(new)->>'is_tutor')::boolean, false) then return new; end if;
  perform net.http_post(
    url := 'https://chdzyvyvdypmjgupyrvg.supabase.co/functions/v1/notify-message',
    body := jsonb_build_object('kind', case when tg_table_name = 'group_messages' then 'group' else 'inquiry' end, 'id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  return new;  -- a mail problem never blocks the message itself
end $$;
revoke execute on function public.notify_message() from anon, authenticated, public;
drop trigger if exists group_message_notify on public.group_messages;
create trigger group_message_notify after insert on public.group_messages for each row execute function public.notify_message();
drop trigger if exists chat_message_notify on public.inquiry_messages;
create trigger chat_message_notify after insert on public.inquiry_messages for each row execute function public.notify_message();
