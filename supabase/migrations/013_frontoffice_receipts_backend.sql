-- FrontOffice Build 12
-- Receipts backend: policies, automatic creation, backfill, status updates.

-- ---------------------------------------------------------------------------
-- Receipt access
-- Receipts are private to their owner for now.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read their own receipts" on public.receipts;
drop policy if exists "Users can update their own receipts" on public.receipts;
drop policy if exists "Users can delete their own receipts" on public.receipts;

create policy "Users can read their own receipts"
on public.receipts
for select
to authenticated
using (auth.uid() = author_id);

create policy "Users can update their own receipts"
on public.receipts
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Users can delete their own receipts"
on public.receipts
for delete
to authenticated
using (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- Automatically create one receipt for every new post.
-- ---------------------------------------------------------------------------

create or replace function public.create_receipt_for_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  receipt_reaction text;
begin
  receipt_reaction :=
    case
      when new.confidence = 'Lock It In' then 'Screenshot This'
      when new.confidence = 'Let Me Cook' then 'Let Him Cook'
      else 'Ball Knowledge'
    end;

  insert into public.receipts (
    post_id,
    author_id,
    status,
    reaction
  )
  values (
    new.id,
    new.author_id,
    'Still Cooking',
    receipt_reaction
  )
  on conflict (post_id) do nothing;

  return new;
end;
$$;

drop trigger if exists posts_create_receipt on public.posts;

create trigger posts_create_receipt
after insert on public.posts
for each row
execute function public.create_receipt_for_post();

-- ---------------------------------------------------------------------------
-- Backfill receipts for posts that existed before this migration.
-- ---------------------------------------------------------------------------

insert into public.receipts (
  post_id,
  author_id,
  status,
  reaction
)
select
  p.id,
  p.author_id,
  'Still Cooking',
  case
    when p.confidence = 'Lock It In' then 'Screenshot This'
    when p.confidence = 'Let Me Cook' then 'Let Him Cook'
    else 'Ball Knowledge'
  end
from public.posts p
where not exists (
  select 1
  from public.receipts r
  where r.post_id = p.id
)
on conflict (post_id) do nothing;
