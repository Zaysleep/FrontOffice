-- FrontOffice Build 11B
-- Public profile synchronization support.
-- My Teams are part of the public profile experience, so authenticated users
-- may read user-team selections while writes remain owner-only.

drop policy if exists "Users can read their own teams" on public.user_teams;
drop policy if exists "Authenticated users can read user teams" on public.user_teams;

create policy "Authenticated users can read user teams"
on public.user_teams
for select
to authenticated
using (true);
