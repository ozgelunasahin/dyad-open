-- Track when a published prompt was last edited.
--
-- Authors can revise a published conversation in place (typo fixes, slot
-- adjustments, clarifications) rather than going through unpublish -> draft
-- -> republish. We surface edited_at on the read view so revisions are
-- visible — readers see "revised 3 days after publishing" alongside the
-- original published_at line. Honesty about the artifact's life is the
-- design contract; silent edits would be the failure mode.
--
-- Set only on updates to a prompt that is in 'published' state. Draft
-- updates do not set edited_at (drafts are pre-publication, every save is
-- "the latest version"). Archived state is terminal; edits to archived
-- prompts are not part of the supported flow.
--
-- The column is nullable: existing rows and never-edited prompts read as
-- NULL, which the read view treats as "no revision yet."

ALTER TABLE prompts
  ADD COLUMN edited_at TIMESTAMPTZ;

COMMENT ON COLUMN prompts.edited_at IS
  'Timestamp of the last edit while in published state. NULL = never edited post-publish.';
