-- LinkTroo schema — run once in Supabase SQL Editor.
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,
  name text not null default 'Your Name',
  title text,
  bio text,
  avatar_url text,
  font text,
  translations jsonb,
  style jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null check (type in ('text','link','text_link','image','youtube','x','file')),
  label text,
  url text,
  description text,
  image_url text,
  meta jsonb,
  sort_order integer not null default 1,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_page_idx on public.items(page_id, sort_order);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete cascade,
  type text not null check (type in ('view','click')),
  item_id uuid,
  lang text,
  referrer text,
  country text,
  created_at timestamptz not null default now()
);
create index if not exists events_page_idx on public.events(page_id, created_at);

-- ---- Row Level Security ----
alter table public.pages enable row level security;
alter table public.items enable row level security;
alter table public.events enable row level security;

drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read" on public.pages for select using (true);
drop policy if exists "pages_owner_write" on public.pages;
create policy "pages_owner_write" on public.pages for insert with check (auth.uid() = user_id);
create policy "pages_owner_update" on public.pages for update using (auth.uid() = user_id);
create policy "pages_owner_delete" on public.pages for delete using (auth.uid() = user_id);

drop policy if exists "items_public_read" on public.items;
create policy "items_public_read" on public.items for select using (true);
drop policy if exists "items_owner_write" on public.items;
create policy "items_owner_write" on public.items for insert with check (
  exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "items_owner_update" on public.items for update using (
  exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));
create policy "items_owner_delete" on public.items for delete using (
  exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

drop policy if exists "events_public_insert" on public.events;
create policy "events_public_insert" on public.events for insert with check (true);
drop policy if exists "events_owner_read" on public.events;
create policy "events_owner_read" on public.events for select using (
  exists (select 1 from public.pages p where p.id = page_id and p.user_id = auth.uid()));

-- ---- Storage: public files bucket (uploads / PDFs) ----
insert into storage.buckets (id, name, public) values ('files', 'files', true)
  on conflict (id) do nothing;

drop policy if exists "files_public_read" on storage.objects;
create policy "files_public_read" on storage.objects for select
  using (bucket_id = 'files');
drop policy if exists "files_owner_upload" on storage.objects;
create policy "files_owner_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "files_owner_delete" on storage.objects;
create policy "files_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
