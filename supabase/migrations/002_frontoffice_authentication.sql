-- FrontOffice Build 6
-- Authentication foundation, automatic profile bootstrap, and initial RLS policies.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_name text;
  generated_handle text;
  generated_initials text;
begin
  email_name := split_part(coalesce(new.email, 'frontoffice-user'), '@', 1);
  generated_handle := '@user_' || left(replace(new.id::text, '-', ''), 10);
  generated_initials := upper(left(regexp_replace(email_name, '[^A-Za-z0-9]', '', 'g'), 2));

  if generated_initials = '' then
    generated_initials := 'FO';
  end if;

  insert into public.profiles (
    id,
    name,
    handle,
    initials,
    bio,
    onboarding_complete
  )
  values (
    new.id,
    email_name,
    generated_handle,
    generated_initials,
    '',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read their own teams" on public.user_teams;
drop policy if exists "Users can add their own teams" on public.user_teams;
drop policy if exists "Users can update their own team order" on public.user_teams;
drop policy if exists "Users can delete their own teams" on public.user_teams;

create policy "Users can read their own teams"
on public.user_teams
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add their own teams"
on public.user_teams
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own team order"
on public.user_teams
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own teams"
on public.user_teams
for delete
to authenticated
using (auth.uid() = user_id);
