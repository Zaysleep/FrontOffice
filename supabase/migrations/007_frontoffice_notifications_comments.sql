-- FrontOffice Build 10A + 10B
-- Database-backed notifications and real comment notification events.

-- ---------------------------------------------------------------------------
-- Notification access
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;

create policy "Users can read their own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = recipient_id);

create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

-- ---------------------------------------------------------------------------
-- Comment notification trigger
--
-- When User B comments on User A's post:
--   recipient_id = User A
--   actor_id     = User B
--   post_id      = the commented post
--   comment_id   = the new comment
--
-- Authors do not receive notifications for comments on their own posts.
-- ---------------------------------------------------------------------------

create or replace function public.notify_post_author_on_comment()
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

  if post_author_id is null or post_author_id = new.author_id then
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

drop trigger if exists comments_create_notification on public.comments;

create trigger comments_create_notification
after insert on public.comments
for each row
execute function public.notify_post_author_on_comment();
