-- Drop newsletter_subscribers table and its access policies.
--
-- Rationale: collecting emails for export to Substack is a third-party
-- cross-border data transfer that would require GDPR disclosure in
-- /datenschutz. That disclosure is a values signal — if we have to declare
-- a data use, we should question whether it aligns with the project's
-- commitment to data sovereignty. In this case: we should not.
--
-- At decision time the table had 1 row (Ozge's test) and zero app-level
-- writers or readers (no form, no API route, no admin UI). Dropping now
-- prevents the collection flow from ever going live.
--
-- Going forward: if we want a newsletter, users sign up on the Substack
-- page directly. Substack is then the controller of its own subscriber
-- list; Dyad doesn't process the email at all. No GDPR processor
-- relationship, no export CSV, no cross-border transfer from our side.

DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
