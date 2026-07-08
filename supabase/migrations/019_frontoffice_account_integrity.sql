-- FrontOffice Trust & Launch Build 1
-- Account integrity: 18+ DOB enforcement, case-insensitive unique handles,
-- signup metadata bootstrap, and public username availability checks.

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists age_verified_at timestamptz;

create unique index if not exists profiles_handle_lower_unique
on public.profiles (lower(handle));

create or replace function public.is_handle_available(candidate_handle text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_handle text;
  reserved_handles text[] := array[
    '@admin',
    '@administrator',
    '@frontoffice',
    '@frontofficeapp',
    '@support',
    '@help',
    '@moderator',
    '@mod',
    '@system',
    '@staff',
    '@security'
  ];
begin
  normalized_handle :=
    case
      when left(trim(candidate_handle), 1) = '@'
        then lower(trim(candidate_handle))
      else '@' || lower(trim(candidate_handle))
    end;

  if normalized_handle !~ '^@[a-z0-9_]{2,29}$' then
    return false;
  end if;

  if normalized_handle = any(reserved_handles) then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles
    where lower(handle) = normalized_handle
  );
end;
$$;

revoke all on function public.is_handle_available(text) from public;
grant execute on function public.is_handle_available(text) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_name text;
  submitted_handle text;
  submitted_birth_date date;
  generated_initials text;
begin
  email_name := split_part(coalesce(new.email, 'frontoffice-user'), '@', 1);

  submitted_handle :=
    case
      when left(trim(coalesce(new.raw_user_meta_data->>'handle', '')), 1) = '@'
        then lower(trim(new.raw_user_meta_data->>'handle'))
      else '@' || lower(trim(coalesce(new.raw_user_meta_data->>'handle', '')))
    end;

  if submitted_handle !~ '^@[a-z0-9_]{2,29}$' then
    raise exception 'Invalid username format.';
  end if;

  if not public.is_handle_available(submitted_handle) then
    raise exception 'That username is already taken or unavailable.';
  end if;

  begin
    submitted_birth_date := (new.raw_user_meta_data->>'birth_date')::date;
  exception
    when others then
      raise exception 'A valid date of birth is required.';
  end;

  if submitted_birth_date is null then
    raise exception 'A valid date of birth is required.';
  end if;

  if submitted_birth_date > current_date then
    raise exception 'Date of birth cannot be in the future.';
  end if;

  if current_date < (submitted_birth_date + interval '18 years')::date then
    raise exception 'You must be 18 or older to create a FrontOffice account.';
  end if;

  generated_initials :=
    upper(left(regexp_replace(email_name, '[^A-Za-z0-9]', '', 'g'), 2));

  if generated_initials = '' then
    generated_initials := 'FO';
  end if;

  insert into public.profiles (
    id,
    name,
    handle,
    initials,
    bio,
    birth_date,
    age_verified_at,
    onboarding_complete
  )
  values (
    new.id,
    email_name,
    submitted_handle,
    generated_initials,
    '',
    submitted_birth_date,
    timezone('utc', now()),
    false
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

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
  normalized_handle text;
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

  normalized_handle :=
    case
      when left(trim(profile_handle), 1) = '@'
        then lower(trim(profile_handle))
      else '@' || lower(trim(profile_handle))
    end;

  if normalized_handle !~ '^@[a-z0-9_]{2,29}$' then
    raise exception 'Invalid handle format.';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(handle) = normalized_handle
      and id <> current_user_id
  ) then
    raise exception 'That handle is already taken.';
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
    handle = normalized_handle,
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
