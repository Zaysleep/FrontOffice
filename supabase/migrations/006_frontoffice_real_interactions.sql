-- FrontOffice Build 9C
-- Real interaction totals without exposing private bookmark ownership.
--
-- Interaction total =
--   comments
-- + vote records
-- + bookmark records
--
-- This returns aggregate counts only. It does not expose which users
-- bookmarked a post.

create or replace function public.get_post_interaction_counts()
returns table (
  post_id uuid,
  interaction_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as post_id,
    (
      (select count(*) from public.comments c where c.post_id = p.id)
      +
      (select count(*) from public.post_votes v where v.post_id = p.id)
      +
      (select count(*) from public.bookmarks b where b.post_id = p.id)
    )::bigint as interaction_count
  from public.posts p;
$$;

revoke all on function public.get_post_interaction_counts() from public;
grant execute on function public.get_post_interaction_counts() to authenticated;
