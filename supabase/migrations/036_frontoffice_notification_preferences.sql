-- Build 17: Notification preference foundation
-- Stores per-user notification choices separately from browser/device permission.

create table if not exists public.notification_preferences (
   user_id uuid primary key references auth.users(id) on delete cascade,
   browser_push_enabled boolean not null default false,
   receipt_comments_enabled boolean not null default true,
   replies_enabled boolean not null default true,
   mentions_enabled boolean not null default true,
   follows_enabled boolean not null default true,
   milestones_enabled boolean not null default true,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read own notification preferences"
on public.notification_preferences;

create policy "Users can read own notification preferences"
on public.notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification preferences"
on public.notification_preferences;

create policy "Users can insert own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences"
on public.notification_preferences;

create policy "Users can update own notification preferences"
on public.notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.notification_preferences (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

create or replace function public.touch_notification_preferences_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
   new.updated_at = now();
   return new;
end;
$$;

drop trigger if exists notification_preferences_touch_updated_at
on public.notification_preferences;

create trigger notification_preferences_touch_updated_at
before update on public.notification_preferences
for each row
execute function public.touch_notification_preferences_updated_at();
