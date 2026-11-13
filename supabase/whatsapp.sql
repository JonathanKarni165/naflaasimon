-- WhatsApp updates (2026-11-13): people opt in once, with the phone number on their profile.
alter table public.profiles add column if not exists whatsapp_optin boolean not null default false;
