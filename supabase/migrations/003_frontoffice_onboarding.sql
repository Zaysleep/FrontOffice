-- FrontOffice Build 7
-- Account onboarding RPC for identity + My Teams.

create or replace function public.complete_onboarding(
  profile_name text,
  profile_handle text,
  selected_teams jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  team_count integer;
  team_item jsonb;
  matched_team_id uuid;
  team_position integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if trim(profile_name) = '' then
    raise exception 'Name is required.';
  end if;

  if profile_handle !~ '^@[A-Za-z0-9_]{2,29}$' then
    raise exception 'Invalid handle format.';
  end if;

  if jsonb_typeof(selected_teams) <> 'array' then
    raise exception 'Selected teams must be an array.';
  end if;

  team_count := jsonb_array_length(selected_teams);

  if team_count < 1 or team_count > 5 then
    raise exception 'Choose between 1 and 5 teams.';
  end if;

  update public.profiles
  set
    name = trim(profile_name),
    handle = profile_handle,
    initials = upper(left(regexp_replace(trim(profile_name), '[^A-Za-z0-9]', '', 'g'), 2)),
    onboarding_complete = true
  where id = current_user_id;

  delete from public.user_teams
  where user_id = current_user_id;

  for team_item in
    select value
    from jsonb_array_elements(selected_teams)
  loop
    team_position := team_position + 1;

    insert into public.teams (
      sport,
      name
    )
    values (
      team_item->>'sport',
      team_item->>'name'
    )
    on conflict (sport, name)
    do update set name = excluded.name
    returning id into matched_team_id;

    insert into public.user_teams (
      user_id,
      team_id,
      sort_order
    )
    values (
      current_user_id,
      matched_team_id,
      team_position
    );
  end loop;
end;
$$;

revoke all on function public.complete_onboarding(text, text, jsonb) from public;
grant execute on function public.complete_onboarding(text, text, jsonb) to authenticated;
