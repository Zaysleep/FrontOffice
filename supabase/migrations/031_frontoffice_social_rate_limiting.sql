-- FrontOffice Build 10A
-- Social action rate limiting
--
-- Purpose:
-- Slow down spam and scripted abuse even when someone bypasses the UI.
--
-- Limits:
-- Posts:      10 per minute
-- Comments:   20 per minute
-- Votes:      60 changes per minute
-- Bookmarks:  60 creates per minute
-- Follows:    30 per minute
-- Reports:    10 per hour
-- Blocks:     20 per hour
--
-- This does not handle Supabase Auth login/signup rate limits.
-- Auth rate limiting will be handled separately at the auth/platform layer.

begin;

-- ============================================================
-- 1. PRIVATE RATE-LIMIT EVENT TABLE
-- ============================================================

create table if not exists public.frontoffice_rate_limit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null,
  created_at timestamptz not null default timezone('utc', now()),

  constraint frontoffice_rate_limit_action_key_check
    check (
      action_key in (
        'create_post',
        'create_comment',
        'change_vote',
        'create_bookmark',
        'create_follow',
        'create_report',
        'create_block'
      )
    )
);

create index if not exists
  frontoffice_rate_limit_actor_action_time_idx
on public.frontoffice_rate_limit_events (
  actor_id,
  action_key,
  created_at desc
);

alter table public.frontoffice_rate_limit_events
enable row level security;

-- No browser role needs direct access.
revoke all
on table public.frontoffice_rate_limit_events
from anon, authenticated;

revoke all
on sequence public.frontoffice_rate_limit_events_id_seq
from anon, authenticated;

-- ============================================================
-- 2. SHARED RATE-LIMIT ENGINE
-- ============================================================

create or replace function public.enforce_frontoffice_rate_limit(
  p_actor_id uuid,
  p_action_key text,
  p_max_events integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_event_count integer;
begin
  if p_actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'A signed-in account is required.';
  end if;

  if p_max_events <= 0 then
    raise exception using
      errcode = '22023',
      message = 'Invalid rate-limit configuration.';
  end if;

  -- Prevent two simultaneous requests from racing past the same limit.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_actor_id::text || ':' || p_action_key,
      0
    )
  );

  -- Keep this small without needing a cron job.
  delete from public.frontoffice_rate_limit_events
  where actor_id = p_actor_id
    and action_key = p_action_key
    and created_at < timezone('utc', now()) - interval '24 hours';

  select count(*)
  into recent_event_count
  from public.frontoffice_rate_limit_events
  where actor_id = p_actor_id
    and action_key = p_action_key
    and created_at >= timezone('utc', now()) - p_window;

  if recent_event_count >= p_max_events then
    raise exception using
      errcode = 'P0001',
      message = 'You are doing that too quickly. Wait a moment and try again.';
  end if;

  insert into public.frontoffice_rate_limit_events (
    actor_id,
    action_key
  )
  values (
    p_actor_id,
    p_action_key
  );
end;
$$;

revoke execute on function public.enforce_frontoffice_rate_limit(
  uuid,
  text,
  integer,
  interval
)
from public, anon, authenticated;

-- ============================================================
-- 3. POST LIMIT
-- ============================================================

create or replace function public.rate_limit_frontoffice_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_frontoffice_rate_limit(
    new.author_id,
    'create_post',
    10,
    interval '1 minute'
  );

  return new;
end;
$$;

drop trigger if exists rate_limit_frontoffice_post
on public.posts;

create trigger rate_limit_frontoffice_post
before insert
on public.posts
for each row
execute function public.rate_limit_frontoffice_post();

revoke execute on function public.rate_limit_frontoffice_post()
from public, anon, authenticated;

-- ============================================================
-- 4. COMMENT + REPLY LIMIT
-- ============================================================

create or replace function public.rate_limit_frontoffice_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_frontoffice_rate_limit(
    new.author_id,
    'create_comment',
    20,
    interval '1 minute'
  );

  return new;
end;
$$;

drop trigger if exists rate_limit_frontoffice_comment
on public.comments;

create trigger rate_limit_frontoffice_comment
before insert
on public.comments
for each row
execute function public.rate_limit_frontoffice_comment();

revoke execute on function public.rate_limit_frontoffice_comment()
from public, anon, authenticated;

-- ============================================================
-- 5. VOTE LIMIT
-- ============================================================

create or replace function public.rate_limit_frontoffice_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_frontoffice_rate_limit(
    new.user_id,
    'change_vote',
    60,
    interval '1 minute'
  );

  return new;
end;
$$;

drop trigger if exists rate_limit_frontoffice_vote
on public.post_votes;

create trigger rate_limit_frontoffice_vote
before insert or update
on public.post_votes
for each row
execute function public.rate_limit_frontoffice_vote();

revoke execute on function public.rate_limit_frontoffice_vote()
from public, anon, authenticated;

-- ============================================================
-- 6. BOOKMARK LIMIT
-- ============================================================

create or replace function public.rate_limit_frontoffice_bookmark()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_frontoffice_rate_limit(
    new.user_id,
    'create_bookmark',
    60,
    interval '1 minute'
  );

  return new;
end;
$$;

drop trigger if exists rate_limit_frontoffice_bookmark
on public.bookmarks;

create trigger rate_limit_frontoffice_bookmark
before insert
on public.bookmarks
for each row
execute function public.rate_limit_frontoffice_bookmark();

revoke execute on function public.rate_limit_frontoffice_bookmark()
from public, anon, authenticated;

-- ============================================================
-- 7. FOLLOW LIMIT
-- ============================================================

create or replace function public.rate_limit_frontoffice_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_frontoffice_rate_limit(
    new.follower_id,
    'create_follow',
    30,
    interval '1 minute'
  );

  return new;
end;
$$;

drop trigger if exists rate_limit_frontoffice_follow
on public.follows;

create trigger rate_limit_frontoffice_follow
before insert
on public.follows
for each row
execute function public.rate_limit_frontoffice_follow();

revoke execute on function public.rate_limit_frontoffice_follow()
from public, anon, authenticated;

-- ============================================================
-- 8. REPORT LIMIT
-- ============================================================

create or replace function public.rate_limit_frontoffice_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_frontoffice_rate_limit(
    new.reporter_id,
    'create_report',
    10,
    interval '1 hour'
  );

  return new;
end;
$$;

drop trigger if exists rate_limit_frontoffice_report
on public.reports;

create trigger rate_limit_frontoffice_report
before insert
on public.reports
for each row
execute function public.rate_limit_frontoffice_report();

revoke execute on function public.rate_limit_frontoffice_report()
from public, anon, authenticated;

-- ============================================================
-- 9. BLOCK LIMIT
-- ============================================================

create or replace function public.rate_limit_frontoffice_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_frontoffice_rate_limit(
    new.blocker_id,
    'create_block',
    20,
    interval '1 hour'
  );

  return new;
end;
$$;

drop trigger if exists rate_limit_frontoffice_block
on public.blocks;

create trigger rate_limit_frontoffice_block
before insert
on public.blocks
for each row
execute function public.rate_limit_frontoffice_block();

revoke execute on function public.rate_limit_frontoffice_block()
from public, anon, authenticated;

commit;
