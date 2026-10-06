-- Scheduled work: Notion's debounced queue and the per-minute push reminder tick.
-- Both call Edge Functions through pg_net, authenticated with a shared secret kept in Vault.
--
-- One-time setup after `supabase db push` (replace the values, run in the SQL editor):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'onda_project_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'onda_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

create function public.invoke_edge(fn text) returns void
language plpgsql security definer set search_path = public as $$
declare
  base text;
  secret text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'onda_project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'onda_cron_secret';
  if base is null or secret is null then
    raise notice 'onda: Vault secrets onda_project_url / onda_cron_secret are not set, skipping %', fn;
    return;
  end if;
  perform net.http_post(
    url := base || '/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('action', 'cron'),
    timeout_milliseconds := 55000);
end $$;
revoke all on function public.invoke_edge(text) from public, anon, authenticated;

select cron.schedule('onda-notion-sync', '* * * * *', $$select public.invoke_edge('notion-sync')$$);
select cron.schedule('onda-push-send', '* * * * *', $$select public.invoke_edge('push-send')$$);
-- Keep the reminder log small.
select cron.schedule('onda-push-log-trim', '17 3 * * *', $$delete from public.push_log where local_date < current_date - 14$$);
