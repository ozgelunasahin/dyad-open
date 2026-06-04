-- Granular, opt-in email-notification preferences.
--
-- Replaces the profiles.email_notifications opt-out with a dedicated
-- notification_settings table:
--
--   email                — the address notifications go to. NULL means the
--                          member has not opted in; nothing is ever sent.
--                          Notification dispatch reads ONLY this address —
--                          it no longer falls back to the auth account email,
--                          so receiving mail is an explicit, revocable choice.
--   invitation_received  — someone responded to your conversation and invited you
--   invitation_answered  — your invitation was accepted or declined
--   meeting_cancelled    — a scheduled meeting was cancelled
--
-- A dedicated table (rather than profiles columns) because the address is
-- PII: profiles carries a permissive "read profile summaries" SELECT policy
-- for authenticated members, and column grants cannot be row-scoped — any
-- granted column there is cross-readable. This table is owner-only for every
-- verb; the notification dispatcher reads it via the service-role client.
--
-- The old single opt-out column is dropped. No backfill: under opt-in
-- semantics a prior opt-out is moot (no address, no mail). Safe to ship while
-- notifications are dark globally (app_settings.email_notifications_enabled
-- = false).

CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES identities(id) ON DELETE CASCADE,
  -- Format validation is application-layer (the preferences endpoint rejects
  -- anything that doesn't look like an address before writing); the CHECK
  -- only bounds length so direct service-role writes can't store blobs.
  email TEXT CHECK (email IS NULL OR char_length(email) <= 320),
  invitation_received BOOLEAN NOT NULL DEFAULT TRUE,
  invitation_answered BOOLEAN NOT NULL DEFAULT TRUE,
  meeting_cancelled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own notification settings"
  ON notification_settings FOR SELECT TO authenticated
  USING (app.current_user_id() = user_id);

CREATE POLICY "Members create own notification settings"
  ON notification_settings FOR INSERT TO authenticated
  WITH CHECK (app.current_user_id() = user_id);

CREATE POLICY "Members update own notification settings"
  ON notification_settings FOR UPDATE TO authenticated
  USING (app.current_user_id() = user_id)
  WITH CHECK (app.current_user_id() = user_id);

-- Supabase default privileges grant ALL on new public tables to the app
-- roles; pare down to exactly what the preferences surface needs. Members
-- never DELETE — opting out is `email = NULL`, keeping their flags.
REVOKE ALL ON notification_settings FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON notification_settings TO authenticated;

-- Deploy-window note: between `db push` and the Pages rollout, the previous
-- app build's resolveRecipient still selects this column and errors; dispatch
-- catches it and sends nothing, and the global kill switch is off in
-- production, so the window is accepted rather than splitting the drop into a
-- second deploy cycle. Column-level grants from 20260519110000 drop with the
-- column.
ALTER TABLE profiles DROP COLUMN IF EXISTS email_notifications;
