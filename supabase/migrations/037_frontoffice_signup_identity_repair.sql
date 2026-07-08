-- FrontOffice production signup identity repair
-- Ensures new accounts use the display name and username submitted at signup.

begin;

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
    trim(
      coalesce(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'display_name',
        ''
      )
    );

  if submitted_name = '' then
    raise exception 'Display name is required.';
  end if;

  if char_length(submitted_name) > 50 then
    raise exception 'Display name must be 50 characters or fewer.';
  end if;

  submitted_handle :=
    case
      when left(
        trim(
          coalesce(
            new.raw_user_meta_data->>'handle',
            new.raw_user_meta_data->>'username',
            ''
          )
        ),
        1
      ) = '@'
      then lower(
        trim(
          coalesce(
            new.raw_user_meta_data->>'handle',
            new.raw_user_meta_data->>'username',
            ''
          )
        )
      )
      else
        '@' ||
        lower(
          trim(
            coalesce(
              new.raw_user_meta_data->>'handle',
              new.raw_user_meta_data->>'username',
              ''
            )
          )
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
  )
  on conflict (id)
  do update set
    name = excluded.name,
    handle = excluded.handle,
    initials = excluded.initials;

  insert into public.private_account_data (
    user_id,
    birth_date,
    age_verified_at
  )
  values (
    new.id,
    submitted_birth_date,
    timezone('utc', now())
  )
  on conflict (user_id)
  do update set
    birth_date = excluded.birth_date,
    age_verified_at = excluded.age_verified_at,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

commit;
