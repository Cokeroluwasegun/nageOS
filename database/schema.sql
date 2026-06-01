-- ============================================
-- NageOS Database Schema
-- Multi-tenant WhatsApp Operations OS
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- BUSINESSES (one row per SME customer)
-- ============================================
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone_number_id text,           -- Meta WhatsApp Phone Number ID
  wa_access_token text,           -- WhatsApp Cloud API token
  wa_verify_token text,           -- Webhook verify token
  plan text not null default 'trial'
    check (plan in ('trial', 'starter', 'pro', 'enterprise')),
  ai_enabled boolean default true,
  ai_model text default 'anthropic/claude-sonnet-4-5',
  ai_greeting text default 'Hi! Welcome. How can I help you today?',
  escalation_threshold float default 0.7,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- USERS (team members of a business)
-- ============================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'agent'
    check (role in ('owner', 'agent', 'admin', 'superadmin')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CUSTOMERS (WhatsApp contacts of each business)
-- ============================================
create table customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  wa_phone text not null,         -- WhatsApp phone number e.g. 2348012345678
  name text,
  email text,
  tags text[] default '{}',       -- e.g. ['repeat', 'vip', 'lace', 'size-42']
  notes text,
  total_spent decimal(12,2) default 0,
  order_count int default 0,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(business_id, wa_phone)   -- one customer per phone per business
);

-- ============================================
-- CONVERSATIONS (one per customer contact thread)
-- ============================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'ai_handling', 'escalated', 'resolved', 'abandoned')),
  ai_paused boolean default false,
  assigned_to uuid references users(id),
  last_message_at timestamptz default now(),
  last_message_preview text,
  unread_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- MESSAGES (every WhatsApp message)
-- ============================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  wa_message_id text unique,      -- Meta's message ID for deduplication
  direction text not null
    check (direction in ('inbound', 'outbound')),
  sender_type text not null
    check (sender_type in ('customer', 'ai', 'agent')),
  content text not null,
  message_type text default 'text'
    check (message_type in ('text', 'image', 'audio', 'document', 'template')),
  ai_intent text,                 -- classified intent: order/payment/general/escalate
  ai_confidence float,            -- 0.0 to 1.0
  is_read boolean default false,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ============================================
-- PRODUCTS (catalogue for each business)
-- ============================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  price decimal(12,2) not null default 0,
  currency text default 'NGN',
  stock_quantity int default 0,
  is_available boolean default true,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ORDERS
-- ============================================
create table orders (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_number text unique,       -- human-readable e.g. ORD-041
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending_verification', 'paid', 'refunded')),
  delivery_status text default 'not_shipped'
    check (delivery_status in ('not_shipped', 'preparing', 'in_transit', 'delivered', 'returned')),
  items jsonb default '[]',       -- [{name, qty, price, product_id}]
  subtotal decimal(12,2) default 0,
  total_amount decimal(12,2) default 0,
  currency text default 'NGN',
  delivery_address text,
  delivery_notes text,
  notes text,
  conversation_id uuid references conversations(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PAYMENTS
-- ============================================
create table payments (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  order_id uuid references orders(id),
  customer_id uuid references customers(id),
  provider text not null
    check (provider in ('paystack', 'flutterwave', 'bank_transfer', 'cash')),
  reference text,                 -- provider payment reference
  amount decimal(12,2) not null,
  currency text default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'failed', 'refunded')),
  provider_response jsonb,        -- raw response from Paystack/Flutterwave
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- AUTOMATION RULES
-- ============================================
create table automation_rules (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  trigger_type text not null
    check (trigger_type in ('abandoned_chat', 'unpaid_invoice', 'order_delivered', 'new_customer')),
  delay_minutes int default 120,
  action_type text not null
    check (action_type in ('send_message', 'send_template', 'notify_agent')),
  message_template text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES (for query performance)
-- ============================================
create index idx_customers_business_id on customers(business_id);
create index idx_customers_wa_phone on customers(wa_phone);
create index idx_conversations_business_id on conversations(business_id);
create index idx_conversations_customer_id on conversations(customer_id);
create index idx_conversations_status on conversations(status);
create index idx_messages_conversation_id on messages(conversation_id);
create index idx_messages_business_id on messages(business_id);
create index idx_messages_wa_message_id on messages(wa_message_id);
create index idx_orders_business_id on orders(business_id);
create index idx_orders_customer_id on orders(customer_id);
create index idx_orders_payment_status on orders(payment_status);
create index idx_payments_business_id on payments(business_id);
create index idx_payments_reference on payments(reference);

-- ============================================
-- AUTO-UPDATE updated_at ON ROW CHANGE
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_updated_at before update on businesses
  for each row execute function update_updated_at();
create trigger users_updated_at before update on users
  for each row execute function update_updated_at();
create trigger customers_updated_at before update on customers
  for each row execute function update_updated_at();
create trigger conversations_updated_at before update on conversations
  for each row execute function update_updated_at();
create trigger products_updated_at before update on products
  for each row execute function update_updated_at();
create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();
create trigger payments_updated_at before update on payments
  for each row execute function update_updated_at();
create trigger automation_rules_updated_at before update on automation_rules
  for each row execute function update_updated_at();

-- ============================================
-- AUTO-GENERATE ORDER NUMBERS
-- ============================================
create sequence order_number_seq start 1;

create or replace function generate_order_number()
returns trigger as $$
begin
  new.order_number = 'ORD-' || lpad(nextval('order_number_seq')::text, 3, '0');
  return new;
end;
$$ language plpgsql;

create trigger orders_generate_number before insert on orders
  for each row execute function generate_order_number();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table businesses enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table automation_rules enable row level security;

-- Users can only see their own business data
create policy "users_own_business" on users
  for all using (id = auth.uid());

create policy "business_isolation_customers" on customers
  for all using (
    business_id in (
      select business_id from users where id = auth.uid()
    )
  );

create policy "business_isolation_conversations" on conversations
  for all using (
    business_id in (
      select business_id from users where id = auth.uid()
    )
  );

create policy "business_isolation_messages" on messages
  for all using (
    business_id in (
      select business_id from users where id = auth.uid()
    )
  );

create policy "business_isolation_products" on products
  for all using (
    business_id in (
      select business_id from users where id = auth.uid()
    )
  );

create policy "business_isolation_orders" on orders
  for all using (
    business_id in (
      select business_id from users where id = auth.uid()
    )
  );

create policy "business_isolation_payments" on payments
  for all using (
    business_id in (
      select business_id from users where id = auth.uid()
    )
  );

create policy "business_isolation_automation" on automation_rules
  for all using (
    business_id in (
      select business_id from users where id = auth.uid()
    )
  );

-- ============================================
-- SEED: one test business for development
-- ============================================
insert into businesses (
  id,
  name,
  plan,
  ai_greeting
) values (
  'a0000000-0000-0000-0000-000000000001',
  'Adunni Fashion Store (Test)',
  'pro',
  'Hi! Welcome to Adunni Fashion. How can I help you today?'
);