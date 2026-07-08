-- FrontOffice Build 10F
-- Direct @mention reply notifications using real FrontOffice handles.
--
-- Priority:
-- 1. Direct @mention => reply notification
-- 2. Post owner => comment notification, unless directly mentioned
-- 3. Prior discussion participant => discussion notification,
--    unless directly mentioned or the post owner
-- 4. Comment author => never notified for their own action

-- ---------------------------------------------------------------------------
-- Direct mention notification trigger
-- ---------------------------------------------------------------------------

create or replace function public.notify_direct_mentions_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
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
    mentioned_profile.id,
    new.author_id,
    'reply',
    coalesce(actor_name, 'A FrontOffice user') || ' replied to you',
    left(new.body, 240),
    new.post_id,
    new.id,
    new.author_id,
    false
  from regexp_matches(
    new.body,
    '(^|[^A-Za-z0-9_])(@[A-Za-z0-9_]{2,29})',
    'g'
  ) as mention_match
  join public.profiles mentioned_profile
    on lower(mentioned_profile.handle) = lower(mention_match[2])
  where mentioned_profile.id <> new.author_id
    and not exists (
      select 1
      from public.notifications existing_notification
      where existing_notification.recipient_id = mentioned_profile.id
        and existing_notification.type = 'reply'
        and existing_notification.comment_id = new.id
    );

  return new;
end;
$$;

drop trigger if exists comments_create_direct_mention_notifications on public.comments;

create trigger comments_create_direct_mention_notifications
after insert on public.comments
for each row
execute function public.notify_direct_mentions_on_comment();


-- ---------------------------------------------------------------------------
-- Update direct comment notification logic.
-- If the post author was directly @mentioned, they get the direct reply
-- notification instead of a duplicate comment notification.
-- ---------------------------------------------------------------------------

create or replace function public.notify_post_author_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  post_author_handle text;
  actor_name text;
  author_was_mentioned boolean := false;
begin
  select p.author_id, pr.handle
  into post_author_id, post_author_handle
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.id = new.post_id;

  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;

  select exists (
    select 1
    from regexp_matches(
      new.body,
      '(^|[^A-Za-z0-9_])(@[A-Za-z0-9_]{2,29})',
      'g'
    ) as mention_match
    where lower(mention_match[2]) = lower(post_author_handle)
  )
  into author_was_mentioned;

  if author_was_mentioned then
    return new;
  end if;

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
  values (
    post_author_id,
    new.author_id,
    'comment',
    coalesce(actor_name, 'A FrontOffice user') || ' commented on your take',
    left(new.body, 240),
    new.post_id,
    new.id,
    new.author_id,
    false
  );

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- Update discussion notification logic.
-- Directly mentioned users are excluded from the broader discussion alert
-- because they already receive the higher-priority reply notification.
-- ---------------------------------------------------------------------------

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
  join public.profiles prior_profile
    on prior_profile.id = prior_commenter.author_id
  where prior_commenter.post_id = new.post_id
    and prior_commenter.id <> new.id
    and prior_commenter.author_id <> new.author_id
    and prior_commenter.author_id <> post_author_id
    and not exists (
      select 1
      from regexp_matches(
        new.body,
        '(^|[^A-Za-z0-9_])(@[A-Za-z0-9_]{2,29})',
        'g'
      ) as mention_match
      where lower(mention_match[2]) = lower(prior_profile.handle)
    )
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
