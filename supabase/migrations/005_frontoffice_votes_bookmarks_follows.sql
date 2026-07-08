-- FrontOffice Build 9B
-- Shared votes, private bookmarks, and real follow relationships.

-- ---------------------------------------------------------------------------
-- Post votes
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read post votes" on public.post_votes;
drop policy if exists "Users can create their own post votes" on public.post_votes;
drop policy if exists "Users can update their own post votes" on public.post_votes;
drop policy if exists "Users can delete their own post votes" on public.post_votes;

create policy "Authenticated users can read post votes"
on public.post_votes
for select
to authenticated
using (true);

create policy "Users can create their own post votes"
on public.post_votes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own post votes"
on public.post_votes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own post votes"
on public.post_votes
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Bookmarks
-- Bookmarks stay private to the user who created them.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read their own bookmarks" on public.bookmarks;
drop policy if exists "Users can create their own bookmarks" on public.bookmarks;
drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;

create policy "Users can read their own bookmarks"
on public.bookmarks
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own bookmarks"
on public.bookmarks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own bookmarks"
on public.bookmarks
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Follows
-- The relationship graph is readable by authenticated users.
-- Users may only create or delete relationships where they are the follower.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read follows" on public.follows;
drop policy if exists "Users can create their own follows" on public.follows;
drop policy if exists "Users can delete their own follows" on public.follows;

create policy "Authenticated users can read follows"
on public.follows
for select
to authenticated
using (true);

create policy "Users can create their own follows"
on public.follows
for insert
to authenticated
with check (auth.uid() = follower_id);

create policy "Users can delete their own follows"
on public.follows
for delete
to authenticated
using (auth.uid() = follower_id);
