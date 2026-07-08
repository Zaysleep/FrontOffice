-- FrontOffice Build 11
-- Notification cleanup
--
-- Goals:
-- 1. Prevent self-notifications.
-- 2. Prevent duplicate notification rows for the same event.
-- 3. Keep existing comment/reply/follow/milestone behavior intact.
-- 4. Remove read notifications older than 90 days.
-- 5. Keep notification cleanup internal to the database.
--
-- This migration does NOT replace the existing notification-generating
-- triggers. It adds a cleanup layer around them so current behavior is
-- preserved while noisy/duplicate rows are suppressed.

begin;

-- ============================================================
-- 1. SUPPORTING INDEXES
-- ============================================================

create index if not exists
  notifications_recipient_created_at_idx
on public.notifications (
  recipient_id,
  created_at desc
);

create index if not exists
  notifications_recipient_unread_idx
on public.notifications (
  recipient_id,
  is_read,
  created_at desc
);

create index if not exists
  notifications_event_lookup_idx
on public.notifications (
  recipient_id,
  type,
  actor_id,
  post_id,
  comment_id,
  profile_id
);

-- ============================================================
-- 2. SELF-NOTIFICATION SUPPRESSION
-- ============================================================

create or replace function public.cleanup_frontoffice_notification_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A user should never receive a notification caused by their own action.
  if new.actor_id is not null
     and new.actor_id = new.recipient_id then
    return null;
  end if;

  -- Prevent exact duplicate event notifications.
  --
  -- This intentionally compares the full notification event identity:
  -- recipient + type + actor + post + comment + profile.
  --
  -- Different notification types remain separate. For example, a direct
  -- mention and a discussion notification are not collapsed simply because
  -- they reference the same post.
  if exists (
    select 1
    from public.notifications existing
    where existing.recipient_id = new.recipient_id
      and existing.type = new.type
      and existing.actor_id is not distinct from new.actor_id
      and existing.post_id is not distinct from new.post_id
      and existing.comment_id is not distinct from new.comment_id
      and existing.profile_id is not distinct from new.profile_id
  ) then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists cleanup_frontoffice_notification_before_insert
on public.notifications;

create trigger cleanup_frontoffice_notification_before_insert
before insert
on public.notifications
for each row
execute function public.cleanup_frontoffice_notification_before_insert();

revoke execute
on function public.cleanup_frontoffice_notification_before_insert()
from public, anon, authenticated;

-- ============================================================
-- 3. READ-NOTIFICATION RETENTION
-- ============================================================

create or replace function public.delete_old_frontoffice_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.notifications
  where is_read = true
    and created_at < timezone('utc', now()) - interval '90 days';

  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

revoke execute
on function public.delete_old_frontoffice_notifications()
from public, anon, authenticated;

-- Run lightweight cleanup after new notification activity.
-- This keeps the table from growing forever without requiring a separate
-- browser-callable RPC.

create or replace function public.cleanup_old_frontoffice_notifications_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.delete_old_frontoffice_notifications();
  return null;
end;
$$;

drop trigger if exists cleanup_old_frontoffice_notifications_after_insert
on public.notifications;

create trigger cleanup_old_frontoffice_notifications_after_insert
after insert
on public.notifications
for each statement
execute function public.cleanup_old_frontoffice_notifications_after_insert();

revoke execute
on function public.cleanup_old_frontoffice_notifications_after_insert()
from public, anon, authenticated;

-- ============================================================
-- 4. CLEAN UP EXISTING SELF-NOTIFICATIONS
-- ============================================================

delete from public.notifications
where actor_id is not null
  and actor_id = recipient_id;

-- ============================================================
-- 5. CLEAN UP EXISTING EXACT DUPLICATES
-- ============================================================

with ranked_notifications as (
  select
    id,
    row_number() over (
      partition by
        recipient_id,
        type,
        actor_id,
        post_id,
        comment_id,
        profile_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.notifications
)
delete from public.notifications notification
using ranked_notifications ranked
where notification.id = ranked.id
  and ranked.duplicate_rank > 1;

-- ============================================================
-- 6. RUN RETENTION CLEANUP ONCE NOW
-- ============================================================

select public.delete_old_frontoffice_notifications();

commit;
