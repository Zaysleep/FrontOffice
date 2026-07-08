-- FrontOffice Trust & Launch Build 6A
-- Report + Block database foundation.
--
-- Goals:
-- 1. Users can report posts, comments/replies, or profiles.
-- 2. Reports are private to the reporting user; service-role/admin tooling
--    can review them later without exposing reports to other users.
-- 3. Users can block other profiles.
-- 4. A block relationship is unique, reversible, and cannot target self.
-- 5. Helper functions support later feed/search/notification filtering.

-- ============================================================
-- REPORTS
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,

  target_type text not null
    check (target_type in ('post', 'comment', 'profile')),

  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,

  reason text not null
    check (
      reason in (
        'hate_or_abusive_content',
        'harassment',
        'spam',
        'impersonation',
        'violence_or_threats',
        'sexual_content',
        'other'
      )
    ),

  note text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint reports_note_length_check
    check (note is null or char_length(note) <= 500),

  constraint reports_exact_target_check
    check (
      (
        target_type = 'post'
        and post_id is not null
        and comment_id is null
        and profile_id is null
      )
      or
      (
        target_type = 'comment'
        and post_id is null
        and comment_id is not null
        and profile_id is null
      )
      or
      (
        target_type = 'profile'
        and post_id is null
        and comment_id is null
        and profile_id is not null
      )
    )
);

create index if not exists reports_reporter_id_created_at_idx
  on public.reports (reporter_id, created_at desc);

create index if not exists reports_status_created_at_idx
  on public.reports (status, created_at asc);

create index if not exists reports_post_id_idx
  on public.reports (post_id)
  where post_id is not null;

create index if not exists reports_comment_id_idx
  on public.reports (comment_id)
  where comment_id is not null;

create index if not exists reports_profile_id_idx
  on public.reports (profile_id)
  where profile_id is not null;

-- Prevent accidental duplicate reports of the same target by the same user.
create unique index if not exists reports_unique_post_report_idx
  on public.reports (reporter_id, post_id)
  where post_id is not null;

create unique index if not exists reports_unique_comment_report_idx
  on public.reports (reporter_id, comment_id)
  where comment_id is not null;

create unique index if not exists reports_unique_profile_report_idx
  on public.reports (reporter_id, profile_id)
  where profile_id is not null;

alter table public.reports enable row level security;

drop policy if exists "Users can create their own reports"
  on public.reports;

create policy "Users can create their own reports"
on public.reports
for insert
to authenticated
with check (
  auth.uid() = reporter_id
);

drop policy if exists "Users can read their own reports"
  on public.reports;

create policy "Users can read their own reports"
on public.reports
for select
to authenticated
using (
  auth.uid() = reporter_id
);

-- Reports are intentionally immutable to ordinary users after submission.
-- Review status will be changed later by trusted moderation tooling/service role.

-- ============================================================
-- BLOCKS
-- ============================================================

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),

  constraint blocks_no_self_block_check
    check (blocker_id <> blocked_id),

  constraint blocks_unique_relationship
    unique (blocker_id, blocked_id)
);

create index if not exists blocks_blocker_id_idx
  on public.blocks (blocker_id, created_at desc);

create index if not exists blocks_blocked_id_idx
  on public.blocks (blocked_id, created_at desc);

alter table public.blocks enable row level security;

drop policy if exists "Users can read their own block list"
  on public.blocks;

create policy "Users can read their own block list"
on public.blocks
for select
to authenticated
using (
  auth.uid() = blocker_id
);

drop policy if exists "Users can block profiles"
  on public.blocks;

create policy "Users can block profiles"
on public.blocks
for insert
to authenticated
with check (
  auth.uid() = blocker_id
  and blocker_id <> blocked_id
);

drop policy if exists "Users can unblock profiles"
  on public.blocks;

create policy "Users can unblock profiles"
on public.blocks
for delete
to authenticated
using (
  auth.uid() = blocker_id
);

-- ============================================================
-- BLOCK HELPERS
-- ============================================================

-- Returns true if either user has blocked the other.
-- This will be useful for interaction guards in later builds.
create or replace function public.is_blocked_between(
  first_user_id uuid,
  second_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocks
    where
      (
        blocker_id = first_user_id
        and blocked_id = second_user_id
      )
      or
      (
        blocker_id = second_user_id
        and blocked_id = first_user_id
      )
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid)
  to authenticated;

-- Returns only the signed-in user's blocked profile IDs.
create or replace function public.get_my_blocked_profile_ids()
returns table (blocked_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select blocks.blocked_id
  from public.blocks
  where blocks.blocker_id = auth.uid();
$$;

revoke all on function public.get_my_blocked_profile_ids() from public;
grant execute on function public.get_my_blocked_profile_ids()
  to authenticated;

-- ============================================================
-- UPDATED_AT SUPPORT FOR REPORTS
-- ============================================================

create or replace function public.set_frontoffice_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_reports_updated_at
  on public.reports;

create trigger set_reports_updated_at
before update
on public.reports
for each row
execute function public.set_frontoffice_updated_at();
