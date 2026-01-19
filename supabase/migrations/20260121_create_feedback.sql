-- Migration: create_feedback_table.sql
-- Enable alpha users to submit bug reports and feature requests

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  canvas_id text,
  type text not null check (type in ('bug', 'feature', 'other')),
  description text not null check (char_length(description) between 10 and 5000),
  context jsonb not null default '{}' check (pg_column_size(context) < 10240),
  created_at timestamptz default now()
);

comment on table public.feedback is
  'User feedback. user_id set to NULL on user deletion. Review via Supabase dashboard.';

-- RLS: Insert-only for users (review via Supabase dashboard)
alter table public.feedback enable row level security;

create policy "Users can insert feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);
