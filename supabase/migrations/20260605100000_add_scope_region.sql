-- Per-scope region — conference-scoped access (U1).
--
-- A scope (corner) may carry a region so that members whose entire app
-- context is that corner (guests — see profiles.home_scope, added in
-- 20260605100200) get the right map center, location-search bounds, and
-- reverse-geocode labels. NULL means the Berlin default; region values are
-- keys into the region registry in src/lib/services/location.ts (the single
-- source for bounds + center + label).
--
-- See plan: docs/plans/2026-06-05-001-feat-conference-scoped-access-plan.md (U1, R9, R16).

ALTER TABLE scopes
  ADD COLUMN region TEXT;

COMMENT ON COLUMN scopes.region IS
  'Optional region key (e.g. ''amsterdam'') into the app-side region registry. NULL = berlin default. Drives map center, location-search bounds, and prompt region for corner-exclusive members.';
