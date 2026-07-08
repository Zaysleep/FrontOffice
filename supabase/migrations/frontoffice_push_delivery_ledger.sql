-- FrontOffice production push delivery ledger
-- Run this once in the Supabase SQL Editor before testing the notification webhook.

create table if not exists public.push_deliveries (
   id uuid primary key default gen_random_uuid(),
   notification_id uuid not null references public.notifications(id) on delete cascade,
   recipient_id uuid not null references auth.users(id) on delete cascade,
   status text not null default 'pending'
      check (status in ('pending', 'delivered', 'no_subscription', 'failed')),
   delivered_count integer not null default 0,
   removed_subscription_count integer not null default 0,
   error_message text,
   completed_at timestamptz,
   created_at timestamptz not null default now()
);

create unique index if not exists push_deliveries_notification_id_key
   on public.push_deliveries(notification_id);

create index if not exists push_deliveries_recipient_id_idx
   on public.push_deliveries(recipient_id);

create index if not exists push_deliveries_created_at_idx
   on public.push_deliveries(created_at desc);

alter table public.push_deliveries enable row level security;

-- No client policies are intentionally added.
-- The production push route uses the Supabase service-role key server-side.
