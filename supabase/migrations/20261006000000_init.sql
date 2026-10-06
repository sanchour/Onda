-- Onda: server schema.
-- The device database is the source of truth; `records` is a per-user replica of it, one JSON document per record.
-- Conflicts resolve last-write-wins per field, using the `_f` clock map each document carries (see app/src/data/merge.ts).

create extension if not exists pgcrypto;

/* ── Profiles: server-owned entitlements ──────────────────────────────────── */
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plus text not null default 'none' check (plus in ('none', 'trial', 'lifetime')),
  trial_started_at timestamptz,
  stripe_customer_id text,
  stripe_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = user_id);
-- No insert/update/delete policy: only Edge Functions (service role) change entitlements.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

/* ── Records: the replica ─────────────────────────────────────────────────── */
create sequence public.records_seq;

create table public.records (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null check (collection in (
    'user', 'lagos', 'checkIns', 'runs', 'practiceLogs', 'ruleLogs', 'taskLogs',
    'immerseLogs', 'journal', 'reflections', 'achievements', 'customOndas')),
  id text not null,
  data jsonb not null,
  updated_at bigint not null,
  deleted_at bigint,
  -- Monotonic change cursor: every write takes the next value, so "everything after seq N" is a complete pull.
  seq bigint not null default nextval('public.records_seq'),
  primary key (user_id, collection, id)
);
create index records_user_seq on public.records (user_id, seq);

alter table public.records enable row level security;
create policy "records: read own" on public.records for select using (auth.uid() = user_id);
-- Writes go through push_records() below, which merges instead of overwriting. No direct insert/update policy.

/* Merge two versions of one document, last-write-wins per field. Mirrors mergeRecord() in the app:
   a field's clock is _f[field], falling back to updatedAt; ties break on deviceId (byte order). */
create function public.merge_record(l jsonb, r jsonb) returns jsonb
language plpgsql immutable as $$
declare
  k text;
  res jsonb;
  f jsonb := '{}'::jsonb;
  ta numeric;
  tb numeric;
  lu numeric;
  ru numeric;
  ld text;
  rd text;
begin
  if l is null then return r; end if;
  if r is null then return l; end if;
  lu := coalesce((l ->> 'updatedAt')::numeric, 0);
  ru := coalesce((r ->> 'updatedAt')::numeric, 0);
  ld := coalesce(l ->> 'deviceId', '');
  rd := coalesce(r ->> 'deviceId', '');
  res := jsonb_build_object('id', l -> 'id');
  for k in
    select key from (select jsonb_object_keys(l) as key union select jsonb_object_keys(r)) s
  loop
    continue when k in ('id', '_f', 'updatedAt', 'deviceId');
    ta := case when l ? k then coalesce((l -> '_f' ->> k)::numeric, lu) else -1 end;
    tb := case when r ? k then coalesce((r -> '_f' ->> k)::numeric, ru) else -1 end;
    if tb > ta or (tb = ta and rd collate "C" > ld collate "C") then
      res := res || jsonb_build_object(k, r -> k);
    else
      res := res || jsonb_build_object(k, l -> k);
    end if;
    f := f || jsonb_build_object(k, greatest(ta, tb));
  end loop;
  return res || jsonb_build_object(
    '_f', f,
    'updatedAt', greatest(lu, ru),
    'deviceId', case when ru > lu or (ru = lu and rd collate "C" > ld collate "C") then rd else ld end);
end $$;

/* Entitlement fields on the user document are server-owned: overwrite them from profiles and stamp them
   with the current time so they win the per-field merge on every device. */
create function public.with_entitlement(p_user uuid, doc jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  p public.profiles;
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  select * into p from public.profiles where user_id = p_user;
  return doc
    || jsonb_build_object('plus', coalesce(p.plus, 'none'), 'trialStartedAt', to_jsonb(p.trial_started_at))
    || jsonb_build_object('_f', coalesce(doc -> '_f', '{}'::jsonb) || jsonb_build_object('plus', now_ms, 'trialStartedAt', now_ms));
end $$;

create function public.apply_records(p_user uuid, p_records jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
  cur jsonb;
  merged jsonb;
  c text;
  rid text;
  n integer := 0;
begin
  for rec in select * from jsonb_array_elements(p_records) loop
    c := rec ->> 'collection';
    rid := rec ->> 'id';
    merged := rec -> 'data';
    continue when c is null or rid is null or merged is null;
    select data into cur from public.records where user_id = p_user and collection = c and id = rid for update;
    if found then merged := public.merge_record(cur, merged); end if;
    if c = 'user' then merged := public.with_entitlement(p_user, merged); end if;
    insert into public.records (user_id, collection, id, data, updated_at, deleted_at)
    values (p_user, c, rid, merged, (merged ->> 'updatedAt')::numeric::bigint, (merged ->> 'deletedAt')::numeric::bigint)
    on conflict (user_id, collection, id) do update
      set data = excluded.data, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, seq = nextval('public.records_seq')
      where public.records.data is distinct from excluded.data;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.apply_records(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_records(uuid, jsonb) to service_role;

/* The only way a signed-in client writes. Idempotent: pushing the same batch twice changes nothing. */
create function public.push_records(p_records jsonb) returns integer
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if jsonb_array_length(p_records) > 500 then raise exception 'batch too large' using errcode = '22023'; end if;
  return public.apply_records(auth.uid(), p_records);
end $$;
revoke all on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;

/* When an entitlement changes (trial started, purchase, refund) refresh the user document so every device pulls it. */
create function public.sync_entitlement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  update public.records
    set data = public.with_entitlement(new.user_id, data) || jsonb_build_object('updatedAt', now_ms),
        updated_at = now_ms,
        seq = nextval('public.records_seq')
    where user_id = new.user_id and collection = 'user';
  return new;
end $$;
-- AFTER so with_entitlement() reads the new row.
create trigger profiles_sync_entitlement after update of plus, trial_started_at on public.profiles
for each row execute function public.sync_entitlement();

alter publication supabase_realtime add table public.records;

/* ── Web Push ─────────────────────────────────────────────────────────────── */
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  p256dh text not null,
  auth text not null,
  device_id text,
  timezone text not null default 'UTC',
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push: own rows" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per user, kind and local date: a reminder is never sent twice.
create table public.push_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  local_date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, local_date)
);
alter table public.push_log enable row level security;

/* ── Private feeds (Calendar ICS, Reminders JSON) ─────────────────────────── */
create table public.feed_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('calendar', 'reminders')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.feed_tokens enable row level security;
create policy "feeds: read own" on public.feed_tokens for select using (auth.uid() = user_id);

/* ── Notion ───────────────────────────────────────────────────────────────── */
-- Tokens are encrypted by the Edge Function before they are stored and never leave the server.
create table public.notion_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token_enc text not null,
  workspace_id text,
  workspace_name text,
  bot_id text,
  parent_page_id text,
  parent_title text,
  database_ids jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  failed integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.notion_connections enable row level security; -- no policies: service role only

create table public.notion_pages (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null,
  record_id text not null,
  notion_page_id text not null,
  synced_updated_at bigint not null default 0,
  primary key (user_id, collection, record_id)
);
alter table public.notion_pages enable row level security;

create table public.notion_queue (
  user_id uuid not null references auth.users (id) on delete cascade,
  collection text not null,
  record_id text not null,
  run_after timestamptz not null default now() + interval '60 seconds',
  attempts integer not null default 0,
  last_error text,
  primary key (user_id, collection, record_id)
);
create index notion_queue_due on public.notion_queue (run_after);
alter table public.notion_queue enable row level security;

/* Debounced push: every change to a syncable record (re)schedules it for about 60 seconds from now. */
create function public.enqueue_notion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.collection in ('lagos', 'checkIns', 'runs', 'journal', 'reflections')
     and exists (select 1 from public.notion_connections c where c.user_id = new.user_id) then
    insert into public.notion_queue (user_id, collection, record_id)
    values (new.user_id, new.collection, new.id)
    on conflict (user_id, collection, record_id) do update set run_after = now() + interval '60 seconds', attempts = 0, last_error = null;
  end if;
  return new;
end $$;
create trigger records_enqueue_notion after insert or update of data on public.records
for each row execute function public.enqueue_notion();

/* ── Storage: private check in photos, one folder per user ────────────────── */
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
create policy "photos: read own" on storage.objects for select using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: write own" on storage.objects for insert with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: update own" on storage.objects for update using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: delete own" on storage.objects for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
