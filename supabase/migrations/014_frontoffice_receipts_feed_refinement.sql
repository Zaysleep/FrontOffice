-- FrontOffice Build 12 refinement
-- Receipts are the canonical take record.
-- Adds public authenticated receipt reads, new confidence levels,
-- removes legacy reaction copy, and keeps owner-only receipt updates/deletes.

-- Public receipt reads let War Room show a receipt status on shared posts.
drop policy if exists "Users can read their own receipts" on public.receipts;
drop policy if exists "Authenticated users can read receipts" on public.receipts;

create policy "Authenticated users can read receipts"
on public.receipts
for select
to authenticated
using (true);

-- Normalize existing confidence values before replacing the constraint.
update public.posts
set confidence =
  case
    when confidence in ('Medium') then 'Just Spitballing'
    when confidence in ('High', 'Lock It In') then 'I Said What I Said'
    when confidence = 'Let Me Cook' then 'Let Me Cook'
    else 'Just Spitballing'
  end;

alter table public.posts
drop constraint if exists posts_confidence;

alter table public.posts
add constraint posts_confidence
check (
  confidence in (
    'Just Spitballing',
    'I Said What I Said',
    'Let Me Cook'
  )
);

-- Retire prototype reaction phrases without changing the existing schema shape.
update public.receipts
set reaction = '';

create or replace function public.create_receipt_for_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    ''
  )
  on conflict (post_id) do nothing;

  return new;
end;
$$;
