-- Waitlist: how did this person arrive? (ozge's "Where did you spot us?"
-- question, ported from the pre-open repo.)
--
-- Self-described, member-stated, optional. The value is either one of the
-- option keys offered in the UI (friend, instagram, twitter, linkedin,
-- event, newsletter, other) or the trimmed free text a member typed under
-- "other". Deliberately a bare nullable TEXT — the option list lives in
-- copy.ts and the API only length-caps, so copy edits never need a
-- migration. Never derived from tracking; the UI says so explicitly.

ALTER TABLE contacts ADD COLUMN referral_source TEXT;

COMMENT ON COLUMN contacts.referral_source IS
  'Self-described arrival channel from the waitlist form ("Where did you spot us?"). Option key or free text, <=120 chars, member-stated, optional. Never tracked or inferred.';
