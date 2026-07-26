-- Corrective Phase 7 Migration: Secure Notifications and Order-Linked Messaging
-- Hardens the public.notifications table from the previous scaffold and
-- introduces secure order-based messaging.

-- 1. HARDEN NOTIFICATIONS SCHEMA
-- Add missing columns and safe constraints to the existing notifications table.

alter table public.notifications
  add column if not exists event_key text,
  add column if not exists read_at timestamp with time zone;

-- Apply strict length and domain bounds
alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'new_order',
      'cancellation',
      'packing_needed',
      'payment_recorded',
      'allocation_released',
      'listing_sold',
      'buyer_message',
      'incomplete_setup'
    )
  ),
  add constraint notifications_title_length check (char_length(trim(title)) between 1 and 255),
  add constraint notifications_body_length check (char_length(trim(body)) between 1 and 1000),
  add constraint notifications_action_href_safe check (
    action_href is null or (
      action_href ~ '^/[^[[:cntrl:]]]*$' and action_href not like '//%'
    )
  ),
  add constraint notifications_event_key_length check (
    event_key is null or char_length(trim(event_key)) between 1 and 255
  ),
  add constraint notifications_read_state_check check (
    (is_read = false and read_at is null) or (is_read = true and read_at is not null)
  );

-- Enforce idempotency
create unique index if not exists notifications_user_id_event_key_idx
  on public.notifications (user_id, event_key)
  where event_key is not null;

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_is_read_created_at_idx
  on public.notifications (user_id, is_read, created_at desc);

-- 2. NOTIFICATIONS SECURITY
-- Revoke the unsafe broad UPDATE policy and grant that allowed users to fabricate/rewrite content.

drop policy if exists "Users can update their own notifications" on public.notifications;
revoke update on public.notifications from authenticated;
revoke insert on public.notifications from authenticated;
revoke delete on public.notifications from authenticated;
revoke all on public.notifications from anon;

-- We keep the SELECT policy from the original scaffold so users can view them.
-- All mutations (insert, mark-read update) must go through the backend service_role.


-- 3. ORDER-LINKED CONVERSATIONS SCHEMA

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  buyer_id uuid references public.users(id) on delete cascade not null,
  seller_id uuid references public.users(id) on delete cascade not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint conversations_different_users check (buyer_id <> seller_id),
  constraint conversations_unique_order_seller unique (order_id, seller_id)
);

create index if not exists conversations_buyer_id_idx on public.conversations(buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations(seller_id);
create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);

-- 4. MESSAGES SCHEMA

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  body text not null constraint messages_body_length check (char_length(trim(body)) between 1 and 2000),
  is_read boolean not null default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint messages_read_state_check check (
    (is_read = false and read_at is null) or (is_read = true and read_at is not null)
  )
);

create index if not exists messages_conversation_id_created_at_idx on public.messages(conversation_id, created_at asc);
create index if not exists messages_unread_recipient_idx on public.messages(conversation_id, is_read) where is_read = false;

-- 5. MESSAGE REPORTS SCHEMA

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade not null,
  reporter_id uuid references public.users(id) on delete cascade not null,
  reason text not null constraint message_reports_reason_length check (char_length(trim(reason)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint message_reports_unique_reporter unique (message_id, reporter_id)
);

-- 6. MESSAGING SECURITY (Backend-only mutation model)

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;

-- Authenticated users can READ their own conversations
create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Authenticated users can READ messages in their conversations
-- Note: Subquery policy.
create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Service role has full access
grant select, insert, update, delete on public.conversations to service_role;
grant select, insert, update, delete on public.messages to service_role;
grant select, insert, update, delete on public.message_reports to service_role;

-- Authenticated users can only read, no direct inserts/updates (enforcing backend resolution)
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.message_reports from anon, authenticated;

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
-- Report viewing is restricted to admins/service_role
