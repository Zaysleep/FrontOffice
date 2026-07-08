-- FrontOffice Build 12C
-- Native Web Push delivery ledger
--
-- Prevents duplicate push delivery when the database webhook retries.

begin;

create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  delivered_count integer not null default 0,
  removed_subscription_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,

  constraint push_deliveries_notification_unique unique (notification_id),
  constraint push_deliveries_status_check
    check (status in ('pending', 'delivered', 'no_subscription', 'failed'))
);

create index if not exists
  push_deliveries_recipient_created_at_idx
on public.push_deliveries (
  recipient_id,
  created_at desc
);

alter table public.push_deliveries
enable row level security;

-- Browser roles do not need direct access.
revoke all
on table public.push_deliveries
from anon, authenticated;

commit;
