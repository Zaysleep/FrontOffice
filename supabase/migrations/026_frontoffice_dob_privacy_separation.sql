-- FrontOffice Build 7
-- DOB Privacy Separation

begin;

create table if not exists public.private_account_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  age_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint private_account_data_birth_date_not_future
    check (birth_date is null or birth_date <= current_date),

  constraint private_account_data_verification_consistency
    check (
      age_verified_at is null
      or birth_date is not null
    )
);

alter table public.private_account_data enable row level security;

drop policy if exists "Users can read their own private account data"
  on public.private_account_data;

create policy "Users can read their own private account data"
on public.private_account_data
for select
to authenticated
using (
  auth.uid() = user_id
);

revoke all on table public.private_account_data from anon;
revoke all on table public.private_account_data from authenticated;

grant select on table public.private_account_data to authenticated;

insert into public.private_account_data (
  user_id,
  birth_date,
  age_verified_at,
  created_at,
  updated_at
)
select
  id,
  birth_date,
  age_verified_at,
  timezone('utc', now()),
  timezone('utc', now())
from public.profiles
on conflict (user_id)
do update set
  birth_date = excluded.birth_date,
  age_verified_at = excluded.age_verified_at,
  updated_at = timezone('utc', now());

create or replace function public.set_private_account_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_private_account_data_updated_at
  on public.private_account_data;

create trigger set_private_account_data_updated_at
before update
on public.private_account_data
for each row
execute function public.set_private_account_data_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  submitted_name text;
  submitted_handle text;
  submitted_birth_date date;
  generated_initials text;
begin
  submitted_name :=
    trim(coalesce(new.raw_user_meta_data->>'name', ''));

  if submitted_name = '' then
    raise exception 'Display name is required.';
  end if;

  if char_length(submitted_name) > 50 then
    raise exception 'Display name must be 50 characters or fewer.';
  end if;

  submitted_handle :=
    case
      when left(
        trim(coalesce(new.raw_user_meta_data->>'handle', '')),
        1
      ) = '@'
        then lower(trim(new.raw_user_meta_data->>'handle'))
      else
        '@' ||
        lower(
          trim(coalesce(new.raw_user_meta_data->>'handle', ''))
        )
    end;

  if submitted_handle !~ '^@[a-z0-9_]{2,29}$' then
    raise exception 'Invalid username format.';
  end if;

  if not public.is_handle_available(submitted_handle) then
    raise exception 'That username is already taken or unavailable.';
  end if;

  begin
    submitted_birth_date :=
      (new.raw_user_meta_data->>'birth_date')::date;
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

  if current_date <
     (submitted_birth_date + interval '18 years')::date
  then
    raise exception
      'You must be 18 or older to create a FrontOffice account.';
  end if;

  generated_initials :=
    upper(
      left(
        regexp_replace(
          submitted_name,
          '[^A-Za-z0-9]',
          '',
          'g'
        ),
        2
      )
    );

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
    submitted_name,
    submitted_handle,
    generated_initials,
    '',
    false
  );

  insert into public.private_account_data (
    user_id,
    birth_date,
    age_verified_at
  )
  values (
    new.id,
    submitted_birth_date,
    timezone('utc', now())
  );

  return new;
end;
$$;

alter table public.profiles
  drop column if exists birth_date,
  drop column if exists age_verified_at;

commit;
