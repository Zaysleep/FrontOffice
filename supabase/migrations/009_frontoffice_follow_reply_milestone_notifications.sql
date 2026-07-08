-- FrontOffice Build 10C + 10D + 10E
-- Real follow notifications, vote milestone notifications,
-- and reply/discussion notifications.

-- ===========================================================================
-- 1. FOLLOW NOTIFICATIONS
-- ===========================================================================

create or replace function public.notify_user_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  -- A self-follow should never create a notification.
  if new.follower_id = new.following_id then
    return new;
  end if;

  select name
  into actor_name
  from public.profiles
  where id = new.follower_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    post_id,
    comment_id,
    profile_id,
    is_read
  )
  values (
    new.following_id,
    new.follower_id,
    'follow',
    coalesce(actor_name, 'A FrontOffice user') || ' followed you',
    coalesce(actor_name, 'A FrontOffice user') || ' is now following you.',
    null,
    null,
    new.follower_id,
    false
  );

  return new;
end;
$$;

drop trigger if exists follows_create_notification on public.follows;

create trigger follows_create_notification
after insert on public.follows
for each row
execute function public.notify_user_on_follow();


-- ===========================================================================
-- 2. REPLY / DISCUSSION NOTIFICATIONS
--
-- When someone comments on a post:
-- - The post author already receives the direct "comment" notification
--   from Build 10B.
-- - Prior commenters on the same post receive one "reply" notification.
-- - The new commenter never receives a notification for their own action.
-- - The post author is excluded here to avoid a duplicate notification.
-- ===========================================================================

create or replace function public.notify_discussion_participants_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  actor_name text;
begin
  select author_id
  into post_author_id
  from public.posts
  where id = new.post_id;

  select name
  into actor_name
  from public.profiles
  where id = new.author_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    post_id,
    comment_id,
    profile_id,
    is_read
  )
  select distinct
    prior_commenter.author_id,
    new.author_id,
    'reply',
    coalesce(actor_name, 'A FrontOffice user') || ' commented in a discussion you joined',
    left(new.body, 240),
    new.post_id,
    new.id,
    new.author_id,
    false
  from public.comments prior_commenter
  where prior_commenter.post_id = new.post_id
    and prior_commenter.id <> new.id
    and prior_commenter.author_id <> new.author_id
    and prior_commenter.author_id <> post_author_id
    and not exists (
      select 1
      from public.notifications existing_notification
      where existing_notification.recipient_id = prior_commenter.author_id
        and existing_notification.type = 'reply'
        and existing_notification.comment_id = new.id
    );

  return new;
end;
$$;

drop trigger if exists comments_create_discussion_notifications on public.comments;

create trigger comments_create_discussion_notifications
after insert on public.comments
for each row
execute function public.notify_discussion_participants_on_comment();


-- ===========================================================================
-- 3. VOTE MILESTONE NOTIFICATIONS
--
-- Thresholds:
--   50, 100, 250, 500, 1000
--
-- A milestone is created only when the net vote score crosses upward over a
-- threshold. A unique logical check prevents the same post/milestone from
-- notifying twice if the score later drops and rises again.
-- ===========================================================================

create or replace function public.notify_post_author_on_vote_milestone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_post_id uuid;
  actor_user_id uuid;
  post_author_id uuid;
  current_score integer;
  previous_score integer;
  milestone integer;
  milestones integer[] := array[50, 100, 250, 500, 1000];
begin
  affected_post_id := coalesce(new.post_id, old.post_id);
  actor_user_id := coalesce(new.user_id, old.user_id);

  select author_id
  into post_author_id
  from public.posts
  where id = affected_post_id;

  if post_author_id is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(value), 0)::integer
  into current_score
  from public.post_votes
  where post_id = affected_post_id;

  if tg_op = 'INSERT' then
    previous_score := current_score - new.value;
  elsif tg_op = 'UPDATE' then
    previous_score := current_score - new.value + old.value;
  elsif tg_op = 'DELETE' then
    previous_score := current_score + old.value;
  else
    previous_score := current_score;
  end if;

  foreach milestone in array milestones
  loop
    if previous_score < milestone and current_score >= milestone then
      insert into public.notifications (
        recipient_id,
        actor_id,
        type,
        title,
        body,
        post_id,
        comment_id,
        profile_id,
        is_read
      )
      select
        post_author_id,
        actor_user_id,
        'milestone',
        'Your take has reached ' || milestone || ' votes',
        '',
        affected_post_id,
        null,
        null,
        false
      where not exists (
        select 1
        from public.notifications existing_notification
        where existing_notification.recipient_id = post_author_id
          and existing_notification.type = 'milestone'
          and existing_notification.post_id = affected_post_id
          and existing_notification.title = 'Your take has reached ' || milestone || ' votes'
      );
    end if;
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists post_votes_create_milestone_notification on public.post_votes;

create trigger post_votes_create_milestone_notification
after insert or update or delete on public.post_votes
for each row
execute function public.notify_post_author_on_vote_milestone();
