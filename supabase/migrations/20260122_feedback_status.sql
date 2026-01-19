-- Add status tracking to feedback table
alter table public.feedback
  add column status text not null default 'new' check (status in ('new', 'reviewed', 'in_progress', 'resolved', 'wont_fix')),
  add column reviewed_at timestamptz,
  add column notes text;

comment on column public.feedback.status is 'Workflow status: new, reviewed, in_progress, resolved, wont_fix';
comment on column public.feedback.notes is 'Internal notes on how to address this feedback';
