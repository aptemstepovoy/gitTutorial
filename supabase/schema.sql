-- Reboot · схема для синхронизации
-- Запусти один раз в Supabase → SQL Editor → New query → Run.

create table if not exists public.kv (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kv enable row level security;

-- Анонимный доступ — допустимо для личного приложения, где URL+anon key и есть «авторизация».
-- Если захочешь жёстче — добавим Supabase Auth (magic link) и поменяем политики.
drop policy if exists "kv_anon_all" on public.kv;
create policy "kv_anon_all" on public.kv
  for all
  to anon
  using (true)
  with check (true);

-- Realtime для будущего: автоматическая подписка на изменения с других устройств.
alter publication supabase_realtime add table public.kv;
