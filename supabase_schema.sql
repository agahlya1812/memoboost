-- Schéma Supabase pour MemoBoost
-- À exécuter dans Supabase SQL Editor

-- Extensions utiles
create extension if not exists pgcrypto;

-- Tables
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  parent_id uuid null references public.categories(id) on delete set null,
  color text default 'blue',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  question text not null,
  answer text not null,
  mastery_status text default 'unknown',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_categories_parent on public.categories(parent_id);
create index if not exists idx_cards_user on public.cards(user_id);
create index if not exists idx_cards_category on public.cards(category_id);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_cards_updated_at on public.cards;
create trigger trg_cards_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

-- RLS
alter table public.categories enable row level security;
alter table public.cards enable row level security;

-- Policies Categories
do $$ begin
  create policy "categories_select_own" on public.categories
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "categories_insert_own" on public.categories
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "categories_update_own" on public.categories
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "categories_delete_own" on public.categories
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Policies Cards
do $$ begin
  create policy "cards_select_own" on public.cards
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cards_insert_own" on public.cards
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cards_update_own" on public.cards
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cards_delete_own" on public.cards
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;


