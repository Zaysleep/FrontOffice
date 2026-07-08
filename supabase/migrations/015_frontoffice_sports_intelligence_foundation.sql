-- FrontOffice Build 13A-C
-- Sports intelligence foundation.
--
-- The sports_cache table already exists from Build 5.
-- This migration adds safe authenticated reads and cache maintenance helpers.
-- Provider writes should continue through trusted server-side code.

drop policy if exists "Authenticated users can read sports cache" on public.sports_cache;

create policy "Authenticated users can read sports cache"
on public.sports_cache
for select
to authenticated
using (true);

create index if not exists sports_cache_team_section_idx
on public.sports_cache(team_id, section);

create or replace function public.delete_expired_sports_cache()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.sports_cache
  where expires_at <= timezone('utc', now());

  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_sports_cache() from public;
grant execute on function public.delete_expired_sports_cache() to service_role;
