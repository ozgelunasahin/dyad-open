-- RLS safety net for per-action membership gating (plan U7).
--
-- Split the single FOR ALL owner policy on each of prompts / prompt_comments /
-- prompt_invitations into per-verb policies, adding the gate ONLY on the
-- FOR INSERT WITH CHECK. This is the load-bearing correctness fix:
--   * A new FOR INSERT policy ALONGSIDE the old FOR ALL would OR-combine
--     (Postgres unions permissive policies) — the FOR ALL's clause already
--     permits the insert, so the gate would restrict nothing.
--   * Folding the gate into a USING clause would gate READS too.
-- So we DROP the FOR ALL and recreate per-verb; the gate lives only on INSERT.
--
-- Reads/edits stay ungated (R8). app.gating_allows returns true when the
-- action's flag is off OR the member is active, so gating-off is a no-op for
-- everyone. Roles match the originals (TO public; for anon, app.current_user_id()
-- is NULL so the ownership clause is false — no access via these policies).
-- The existing public/scoped read policies and the invitee/prompt-author read
-- policies are untouched.

-- ── prompts: author CRUD; INSERT gated on create_conversation ──
DROP POLICY IF EXISTS "Authors can manage own prompts" ON prompts;

DROP POLICY IF EXISTS "Authors read own prompts" ON prompts;
CREATE POLICY "Authors read own prompts" ON prompts FOR SELECT
	USING (app.current_user_id() = author_id);

DROP POLICY IF EXISTS "Authors update own prompts" ON prompts;
CREATE POLICY "Authors update own prompts" ON prompts FOR UPDATE
	USING (app.current_user_id() = author_id)
	WITH CHECK (app.current_user_id() = author_id);

DROP POLICY IF EXISTS "Authors delete own prompts" ON prompts;
CREATE POLICY "Authors delete own prompts" ON prompts FOR DELETE
	USING (app.current_user_id() = author_id);

DROP POLICY IF EXISTS "Authors create gated prompts" ON prompts;
CREATE POLICY "Authors create gated prompts" ON prompts FOR INSERT
	WITH CHECK (
		app.current_user_id() = author_id
		AND app.gating_allows('create_conversation', app.current_user_id())
	);

-- ── prompt_comments: author CRUD; INSERT (new response) gated; edit ungated ──
DROP POLICY IF EXISTS "Authors manage own comments" ON prompt_comments;

DROP POLICY IF EXISTS "Authors read own comments" ON prompt_comments;
CREATE POLICY "Authors read own comments" ON prompt_comments FOR SELECT
	USING (app.current_user_id() = author_id);

DROP POLICY IF EXISTS "Authors update own comments" ON prompt_comments;
CREATE POLICY "Authors update own comments" ON prompt_comments FOR UPDATE
	USING (app.current_user_id() = author_id)
	WITH CHECK (app.current_user_id() = author_id);

DROP POLICY IF EXISTS "Authors delete own comments" ON prompt_comments;
CREATE POLICY "Authors delete own comments" ON prompt_comments FOR DELETE
	USING (app.current_user_id() = author_id);

DROP POLICY IF EXISTS "Authors create gated comments" ON prompt_comments;
CREATE POLICY "Authors create gated comments" ON prompt_comments FOR INSERT
	WITH CHECK (
		app.current_user_id() = author_id
		AND app.gating_allows('respond_take_slot', app.current_user_id())
	);

-- ── prompt_invitations: inviter CRUD; INSERT gated on invite_to_meet ──
DROP POLICY IF EXISTS "Inviter manages own invitations" ON prompt_invitations;

DROP POLICY IF EXISTS "Inviter reads own invitations" ON prompt_invitations;
CREATE POLICY "Inviter reads own invitations" ON prompt_invitations FOR SELECT
	USING (app.current_user_id() = inviter_id);

DROP POLICY IF EXISTS "Inviter updates own invitations" ON prompt_invitations;
CREATE POLICY "Inviter updates own invitations" ON prompt_invitations FOR UPDATE
	USING (app.current_user_id() = inviter_id)
	WITH CHECK (app.current_user_id() = inviter_id);

DROP POLICY IF EXISTS "Inviter deletes own invitations" ON prompt_invitations;
CREATE POLICY "Inviter deletes own invitations" ON prompt_invitations FOR DELETE
	USING (app.current_user_id() = inviter_id);

DROP POLICY IF EXISTS "Inviter creates gated invitations" ON prompt_invitations;
CREATE POLICY "Inviter creates gated invitations" ON prompt_invitations FOR INSERT
	WITH CHECK (
		app.current_user_id() = inviter_id
		AND app.gating_allows('invite_to_meet', app.current_user_id())
	);
