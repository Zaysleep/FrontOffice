-- FrontOffice Build 9A
-- Input and upload hardening: database validation layer
--
-- This migration adds database-side limits so bypassing the UI
-- does not allow oversized or malformed content.

begin;

-- ============================================================
-- PROFILES
-- ============================================================

alter table public.profiles
  drop constraint if exists profiles_name_length_check,
  drop constraint if exists profiles_handle_format_check,
  drop constraint if exists profiles_bio_length_check;

alter table public.profiles
  add constraint profiles_name_length_check
    check (
      char_length(trim(name)) between 1 and 60
    ),

  add constraint profiles_handle_format_check
    check (
      handle ~ '^@[a-z0-9_]{2,29}$'
    ),

  add constraint profiles_bio_length_check
    check (
      char_length(coalesce(bio, '')) <= 220
    );

-- ============================================================
-- POSTS
-- ============================================================

alter table public.posts
  drop constraint if exists posts_take_length_check,
  drop constraint if exists posts_team_snapshot_length_check,
  drop constraint if exists posts_call_type_check,
  drop constraint if exists posts_confidence_check,
  drop constraint if exists posts_tag_length_check;

alter table public.posts
  add constraint posts_take_length_check
    check (
      char_length(trim(take)) between 1 and 1000
    ),

  add constraint posts_team_snapshot_length_check
    check (
      char_length(trim(team_name_snapshot)) between 1 and 120
    ),

  add constraint posts_call_type_check
    check (
      call_type in (
        'Trade Idea',
        'Lineup Decision',
        'Hot Take',
        'Future Receipt'
      )
    ),

  add constraint posts_confidence_check
    check (
      confidence in (
        'Just Spitballing',
        'I Said What I Said',
        'Let Me Cook'
      )
    ),

  add constraint posts_tag_length_check
    check (
      char_length(coalesce(tag, '')) <= 60
    );

-- ============================================================
-- COMMENTS + REPLIES
-- ============================================================

alter table public.comments
  drop constraint if exists comments_body_length_check;

alter table public.comments
  add constraint comments_body_length_check
    check (
      char_length(trim(body)) between 1 and 500
    );

-- ============================================================
-- REPORT NOTES
-- ============================================================

alter table public.reports
  drop constraint if exists reports_note_length_check;

alter table public.reports
  add constraint reports_note_length_check
    check (
      note is null
      or char_length(note) <= 500
    );

-- ============================================================
-- MAXIMUM FIVE TEAMS PER USER
-- ============================================================

create or replace function public.enforce_frontoffice_team_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_team_count integer;
begin
  select count(*)
  into selected_team_count
  from public.user_teams
  where user_id = new.user_id
    and (
      tg_op = 'INSERT'
      or team_id <> old.team_id
    );

  if tg_op = 'INSERT' then
    selected_team_count := selected_team_count + 1;
  end if;

  if selected_team_count > 5 then
    raise exception using
      errcode = '23514',
      message = 'FrontOffice accounts can select up to five teams.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_frontoffice_team_limit
  on public.user_teams;

create trigger enforce_frontoffice_team_limit
before insert or update
on public.user_teams
for each row
execute function public.enforce_frontoffice_team_limit();

revoke execute on function public.enforce_frontoffice_team_limit()
from public, anon, authenticated;

commit;
