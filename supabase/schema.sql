-- Quotation calculator: saved calculations.
-- Run once in the Supabase dashboard (SQL Editor) for your project.
--
-- Minimal by design: only raw worksheet inputs are stored (as jsonb);
-- every calculated value is re-derived by the app's formula engine on load,
-- so results can never drift from the stored inputs.

create table public.calculations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  profit_rate numeric not null,
  rows       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calculations enable row level security;

create policy "Users manage their own calculations"
  on public.calculations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
