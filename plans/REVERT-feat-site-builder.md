# Revert Plan: Site Builder Feature

If the site builder feature needs to be reverted (e.g., rabbit hole, critical bugs, scope creep), follow these steps.

## Quick Revert (Code Only)

If you haven't run the migration yet, simply reset the branch:

```bash
git checkout main
git branch -D feat/sites-nav-always-visible  # Delete the feature branch
```

## Full Revert (After Migration Applied)

### 1. Revert Database Changes

Create a rollback migration:

```sql
-- File: supabase/migrations/YYYYMMDD_rollback_sites.sql

-- Drop triggers first
DROP TRIGGER IF EXISTS set_site_canvas_position_trigger ON site_canvases;
DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;

-- Drop functions
DROP FUNCTION IF EXISTS set_site_canvas_position();

-- Drop RLS policies
DROP POLICY IF EXISTS "Owner can SELECT own sites" ON sites;
DROP POLICY IF EXISTS "Public can SELECT published sites" ON sites;
DROP POLICY IF EXISTS "Owner can INSERT sites" ON sites;
DROP POLICY IF EXISTS "Owner can UPDATE own sites" ON sites;
DROP POLICY IF EXISTS "Owner can DELETE own sites" ON sites;
DROP POLICY IF EXISTS "Owner can SELECT own site_canvases" ON site_canvases;
DROP POLICY IF EXISTS "Public can SELECT published site_canvases" ON site_canvases;
DROP POLICY IF EXISTS "Owner can INSERT own site_canvases" ON site_canvases;
DROP POLICY IF EXISTS "Owner can DELETE own site_canvases" ON site_canvases;

-- Drop indexes
DROP INDEX IF EXISTS idx_sites_user_id;
DROP INDEX IF EXISTS idx_sites_is_published;
DROP INDEX IF EXISTS idx_site_canvases_site_id;
DROP INDEX IF EXISTS idx_site_canvases_canvas_id;

-- Drop tables (site_canvases first due to FK)
DROP TABLE IF EXISTS site_canvases;
DROP TABLE IF EXISTS sites;
```

Apply with: `npx supabase db push`

### 2. Files to Delete

```bash
# API routes
rm -rf src/routes/api/sites/

# Site management routes
rm -rf src/routes/sites/+page.svelte
rm -rf src/routes/sites/+page.server.ts
rm -rf src/routes/sites/[slug]/

# Published site nested route
rm -rf src/routes/sites/@[username]/[site]/[canvas]/

# Component
rm src/lib/components/CanvasSelector.svelte

# Migration
rm supabase/migrations/20260126_create_sites.sql
```

### 3. Files to Restore/Modify

Restore the original versions of these files from main:

```bash
git checkout main -- src/routes/sites/@[username]/[canvas]/+page.server.ts
git checkout main -- src/routes/sites/@[username]/[canvas]/+page.svelte
git checkout main -- src/lib/components/WebsiteContainer.svelte
```

### 4. Clean Up Plan Files

```bash
rm plans/feat-site-builder.md
rm plans/REVERT-feat-site-builder.md
```

## Partial Revert (Keep Some Changes)

If you want to keep the simplified navigation from PR #16 but remove the site builder:

1. Keep: `WebsiteContainer.svelte` changes (collapsible nav, styling)
2. Remove: Site builder routes, API, database tables
3. Restore: `@[username]/[canvas]` routes to original (no site slug checking)

## Data Migration Considerations

If the feature was live and users created sites:

1. **Before rollback**: Export site data for potential reimplementation
   ```sql
   -- Export sites
   SELECT * FROM sites WHERE is_published = true;

   -- Export site_canvases with canvas info
   SELECT s.name as site_name, c.name as canvas_name, sc.position
   FROM site_canvases sc
   JOIN sites s ON s.id = sc.site_id
   JOIN canvases c ON c.id = sc.canvas_id
   ORDER BY s.id, sc.position;
   ```

2. **Communicate**: Notify users that their explicit sites will be converted back to implicit sites (all published canvases shown together)

3. **Preserve publishing**: Users' published canvases remain published and viewable at the old URLs (`/sites/@username/canvas-slug`)

## Verification After Revert

1. `/sites/@username/canvas-slug` routes work (backward compat)
2. No 500 errors from missing tables
3. Dashboard (`/dashboard`) loads without errors
4. Published canvases still viewable

## Branch Reference

Feature branch: `feat/sites-nav-always-visible`
Base: `main` at commit before feature work started
