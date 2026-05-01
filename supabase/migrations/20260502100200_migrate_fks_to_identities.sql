-- Phase D — D3: Retarget all active domain-table FKs from auth.users(id) to identities(id).
-- Safe to run in production: identities.id = auth.users.id for all existing rows,
-- so no data changes — only constraint metadata updates.
--
-- Prerequisite check (run before applying to production):
--   SELECT conname, conrelid::regclass, confrelid::regclass
--   FROM pg_constraint
--   WHERE confrelid = 'auth.users'::regclass AND contype = 'f'
--     AND conrelid::regclass::text IN (
--       'profiles','prompts','prompt_comments','prompt_invitations',
--       'meetings','cancellation_records','feedback_forms',
--       'reputation_signals','notifications'
--     );
-- Confirm constraint names match before proceeding.

-- profiles
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES identities(id) ON DELETE CASCADE;

-- prompts
ALTER TABLE prompts DROP CONSTRAINT prompts_author_id_fkey;
ALTER TABLE prompts ADD CONSTRAINT prompts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES identities(id) ON DELETE CASCADE;

-- prompt_comments
ALTER TABLE prompt_comments DROP CONSTRAINT prompt_comments_author_id_fkey;
ALTER TABLE prompt_comments ADD CONSTRAINT prompt_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES identities(id) ON DELETE CASCADE;

-- prompt_invitations
ALTER TABLE prompt_invitations DROP CONSTRAINT prompt_invitations_inviter_id_fkey;
ALTER TABLE prompt_invitations ADD CONSTRAINT prompt_invitations_inviter_id_fkey
  FOREIGN KEY (inviter_id) REFERENCES identities(id) ON DELETE NO ACTION;

ALTER TABLE prompt_invitations DROP CONSTRAINT prompt_invitations_invitee_id_fkey;
ALTER TABLE prompt_invitations ADD CONSTRAINT prompt_invitations_invitee_id_fkey
  FOREIGN KEY (invitee_id) REFERENCES identities(id) ON DELETE NO ACTION;

-- meetings
ALTER TABLE meetings DROP CONSTRAINT meetings_participant_a_fkey;
ALTER TABLE meetings ADD CONSTRAINT meetings_participant_a_fkey
  FOREIGN KEY (participant_a) REFERENCES identities(id) ON DELETE NO ACTION;

ALTER TABLE meetings DROP CONSTRAINT meetings_participant_b_fkey;
ALTER TABLE meetings ADD CONSTRAINT meetings_participant_b_fkey
  FOREIGN KEY (participant_b) REFERENCES identities(id) ON DELETE NO ACTION;

-- cancellation_records
ALTER TABLE cancellation_records DROP CONSTRAINT cancellation_records_cancelled_by_fkey;
ALTER TABLE cancellation_records ADD CONSTRAINT cancellation_records_cancelled_by_fkey
  FOREIGN KEY (cancelled_by) REFERENCES identities(id) ON DELETE NO ACTION;

-- feedback_forms
ALTER TABLE feedback_forms DROP CONSTRAINT feedback_forms_reviewer_id_fkey;
ALTER TABLE feedback_forms ADD CONSTRAINT feedback_forms_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES identities(id) ON DELETE NO ACTION;

ALTER TABLE feedback_forms DROP CONSTRAINT feedback_forms_reviewee_id_fkey;
ALTER TABLE feedback_forms ADD CONSTRAINT feedback_forms_reviewee_id_fkey
  FOREIGN KEY (reviewee_id) REFERENCES identities(id) ON DELETE NO ACTION;

-- reputation_signals
ALTER TABLE reputation_signals DROP CONSTRAINT reputation_signals_profile_id_fkey;
ALTER TABLE reputation_signals ADD CONSTRAINT reputation_signals_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES identities(id) ON DELETE NO ACTION;

-- notifications
ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES identities(id) ON DELETE CASCADE;

-- Restore cascade-delete chain: auth.users deletion no longer cascades to domain tables
-- because identities has no FK to auth.users. This trigger restores it:
-- auth.users DELETE → identities DELETE → domain tables cascade via identities(id) FKs.
CREATE OR REPLACE FUNCTION sync_identities_on_user_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM identities
  WHERE substrate = 'supabase' AND substrate_id = OLD.id::text;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_identities_on_user_delete();
