-- Add indexes to feedback table for common query patterns
create index idx_feedback_created_at on public.feedback(created_at desc);
create index idx_feedback_status on public.feedback(status);
create index idx_feedback_user_id on public.feedback(user_id) where user_id is not null;
