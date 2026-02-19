-- Notifications table for scheduled reminders/push messages
-- - Stores fire time, payload, status, and optional local notification id
-- - Enforces row-level security per user
-- - Keeps small index for upcoming notifications

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fire_at timestamptz not null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending | scheduled_local | sent | cancelled | failed
  local_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Only the owner may see their notifications
create policy "Notifications are selectable by owner"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Owner can insert
create policy "Notifications are insertable by owner"
  on public.notifications for insert
  with check (auth.uid() = user_id);

-- Owner can update their rows (e.g., status/local_id)
create policy "Notifications are updatable by owner"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Index to quickly fetch upcoming pending notifications
create index if not exists notifications_fire_at_pending_idx
  on public.notifications (fire_at)
  where status in ('pending', 'scheduled_local');

-- Trigger to keep updated_at fresh
create or replace function public.notifications_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.notifications_set_updated_at();

