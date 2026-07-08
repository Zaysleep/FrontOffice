-- FrontOffice Build 9A
-- Shared War Room posts + comments policies.

-- Posts are readable by signed-in users.
drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
on public.posts
for select
to authenticated
using (true);

-- A signed-in user can create only their own posts.
drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
on public.posts
for insert
to authenticated
with check (auth.uid() = author_id);

-- A signed-in user can delete only their own posts.
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
on public.posts
for delete
to authenticated
using (auth.uid() = author_id);

-- Comments are readable by signed-in users.
drop policy if exists "Authenticated users can read comments" on public.comments;
create policy "Authenticated users can read comments"
on public.comments
for select
to authenticated
using (true);

-- A signed-in user can create only their own comments.
drop policy if exists "Users can create their own comments" on public.comments;
create policy "Users can create their own comments"
on public.comments
for insert
to authenticated
with check (auth.uid() = author_id);

-- A signed-in user can delete only their own comments.
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
on public.comments
for delete
to authenticated
using (auth.uid() = author_id);
