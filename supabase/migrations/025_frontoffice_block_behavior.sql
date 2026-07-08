-- FrontOffice Trust & Launch Build 6C
-- Actual block behavior and interaction guards.

-- ============================================================
-- FOLLOW CLEANUP WHEN A BLOCK IS CREATED
-- ============================================================

create or replace function public.cleanup_frontoffice_block_relationship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
  where
    (follower_id = new.blocker_id and following_id = new.blocked_id)
    or
    (follower_id = new.blocked_id and following_id = new.blocker_id);

  delete from public.notifications
  where
    (recipient_id = new.blocker_id and actor_id = new.blocked_id)
    or
    (recipient_id = new.blocked_id and actor_id = new.blocker_id);

  return new;
end;
$$;

drop trigger if exists cleanup_frontoffice_block_relationship
  on public.blocks;

create trigger cleanup_frontoffice_block_relationship
after insert
on public.blocks
for each row
execute function public.cleanup_frontoffice_block_relationship();

-- ============================================================
-- INTERACTION GUARDS
-- ============================================================

create or replace function public.guard_frontoffice_follow_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_blocked_between(new.follower_id, new.following_id) then
    raise exception using
      errcode = '42501',
      message = 'This interaction is unavailable.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_frontoffice_follow_block
  on public.follows;

create trigger guard_frontoffice_follow_block
before insert or update
on public.follows
for each row
execute function public.guard_frontoffice_follow_block();


create or replace function public.guard_frontoffice_comment_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  parent_author_id uuid;
begin
  select author_id
  into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is not null
     and public.is_blocked_between(new.author_id, post_author_id)
  then
    raise exception using
      errcode = '42501',
      message = 'This interaction is unavailable.';
  end if;

  if new.parent_comment_id is not null then
    select author_id
    into parent_author_id
    from public.comments
    where id = new.parent_comment_id;

    if parent_author_id is not null
       and public.is_blocked_between(new.author_id, parent_author_id)
    then
      raise exception using
        errcode = '42501',
        message = 'This interaction is unavailable.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_frontoffice_comment_block
  on public.comments;

create trigger guard_frontoffice_comment_block
before insert or update of post_id, author_id, parent_comment_id
on public.comments
for each row
execute function public.guard_frontoffice_comment_block();


create or replace function public.guard_frontoffice_vote_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
begin
  select author_id
  into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is not null
     and public.is_blocked_between(new.user_id, post_author_id)
  then
    raise exception using
      errcode = '42501',
      message = 'This interaction is unavailable.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_frontoffice_vote_block
  on public.post_votes;

create trigger guard_frontoffice_vote_block
before insert or update
on public.post_votes
for each row
execute function public.guard_frontoffice_vote_block();


create or replace function public.guard_frontoffice_bookmark_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
begin
  select author_id
  into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is not null
     and public.is_blocked_between(new.user_id, post_author_id)
  then
    raise exception using
      errcode = '42501',
      message = 'This interaction is unavailable.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_frontoffice_bookmark_block
  on public.bookmarks;

create trigger guard_frontoffice_bookmark_block
before insert or update
on public.bookmarks
for each row
execute function public.guard_frontoffice_bookmark_block();


create or replace function public.suppress_frontoffice_blocked_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_id is not null
     and public.is_blocked_between(new.actor_id, new.recipient_id)
  then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists suppress_frontoffice_blocked_notification
  on public.notifications;

create trigger suppress_frontoffice_blocked_notification
before insert or update of actor_id, recipient_id
on public.notifications
for each row
execute function public.suppress_frontoffice_blocked_notification();
