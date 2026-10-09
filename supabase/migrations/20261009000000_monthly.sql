-- Ondas+ 5.2: a monthly subscription (EUR 2,49) next to the lifetime purchase (EUR 24,99).
alter table public.profiles drop constraint if exists profiles_plus_check;
alter table public.profiles add constraint profiles_plus_check check (plus in ('none', 'trial', 'monthly', 'lifetime'));
alter table public.profiles add column if not exists stripe_subscription_id text;
