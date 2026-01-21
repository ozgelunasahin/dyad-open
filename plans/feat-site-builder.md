# feat: Site Builder with Preview & Publish

## Overview

Add a complete site building workflow where users can create a site, choose which canvases to include, edit canvases in-place, preview the read-only version, and publish.

## User Workflow

1. **Create a site** - User creates a new site with a name/slug
2. **Choose canvases** - Select which canvases appear in the site navigation
3. **Edit in iframe** - Navigate to canvases and edit them within the site container
4. **Preview** - View read-only version before publishing
5. **Publish** - Make the site publicly accessible

## Current State

### What Exists
- `canvases` table with `is_published` boolean field
- `profiles.can_publish_sites` feature flag
- WebsiteContainer component with collapsible navigation
- Routes: `/sites/@[username]/[canvas]` showing published canvases
- Sites are implicit - user's collection of published canvases

### What's Missing
- No explicit "sites" entity - just published canvases grouped by user
- No canvas selection mechanism (all published canvases appear)
- No preview mode (only published or unpublished)
- No site creation UI

## Proposed Solution

### Data Model

Create a new `sites` table to make sites explicit:

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Match canvases FK target
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug),
  CONSTRAINT sites_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Junction table for site-canvas relationship
CREATE TABLE site_canvases (
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,  -- TEXT to match canvases.id
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, canvas_id)
);

-- Indexes for RLS policy performance
CREATE INDEX idx_sites_user_id ON sites(user_id);
CREATE INDEX idx_sites_is_published ON sites(is_published);
CREATE INDEX idx_site_canvases_site_id ON site_canvases(site_id);
CREATE INDEX idx_site_canvases_canvas_id ON site_canvases(canvas_id);

-- Auto-increment position trigger
CREATE OR REPLACE FUNCTION set_site_canvas_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position = 0 OR NEW.position IS NULL THEN
    SELECT COALESCE(MAX(position) + 1, 1) INTO NEW.position
    FROM site_canvases WHERE site_id = NEW.site_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_site_canvas_position_trigger
  BEFORE INSERT ON site_canvases
  FOR EACH ROW EXECUTE FUNCTION set_site_canvas_position();

-- Updated_at trigger for sites
CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_canvases ENABLE ROW LEVEL SECURITY;

-- Sites: Separate policies by operation to prevent data leakage
CREATE POLICY "Owner can SELECT own sites" ON sites
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Public can SELECT published sites" ON sites
  FOR SELECT USING (is_published = true);

CREATE POLICY "Owner can INSERT sites" ON sites
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can UPDATE own sites" ON sites
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Owner can DELETE own sites" ON sites
  FOR DELETE USING (user_id = auth.uid());

-- Site_canvases: Must verify BOTH site AND canvas ownership on insert
CREATE POLICY "Owner can SELECT own site_canvases" ON site_canvases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
  );

CREATE POLICY "Public can SELECT published site_canvases" ON site_canvases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.is_published = true)
  );

CREATE POLICY "Owner can INSERT own site_canvases" ON site_canvases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM canvases WHERE canvases.id = site_canvases.canvas_id AND canvases.user_id = auth.uid())
  );

CREATE POLICY "Owner can DELETE own site_canvases" ON site_canvases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_canvases.site_id AND sites.user_id = auth.uid())
  );
```

### Routes

| Route | Purpose |
|-------|---------|
| `/sites` | List user's sites (dashboard) |
| `/sites/new` | Create new site |
| `/sites/[slug]/edit` | Site editor - select canvases, reorder, edit in iframe |
| `/sites/[slug]/preview` | Read-only preview (owner only, unpublished) |
| `/sites/@[username]/[site-slug]` | Published site (public) |
| `/sites/@[username]/[site-slug]/[canvas]` | Published site with specific canvas |

### API Endpoints (for programmatic access)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sites` | GET | List user's sites |
| `/api/sites` | POST | Create new site |
| `/api/sites/[id]` | GET | Get site details |
| `/api/sites/[id]` | PATCH | Update site (name, slug, is_published) |
| `/api/sites/[id]` | DELETE | Delete site |
| `/api/sites/[id]/canvases` | GET | Get canvases in site with positions |
| `/api/sites/[id]/canvases` | PUT | Set canvas selection and order (replaces all) |

### Phase 1: Site Creation & Canvas Selection

#### 1. Database Migration

See the **Data Model** section above for the complete migration SQL with:
- Correct FK references (`auth.users(id)` for sites, `TEXT` for canvas_id)
- Indexes for RLS performance
- Auto-increment position trigger
- Separated RLS policies with canvas ownership verification

#### 2. Sites Dashboard (`/sites`)

Simple list of user's sites with:
- Site name and status (draft/published)
- Edit button → `/sites/[slug]/edit`
- Preview button → `/sites/[slug]/preview`
- Publish/Unpublish toggle
- Create new site button

#### 3. Site Editor (`/sites/[slug]/edit`)

Two-column layout:
- **Left panel**: Canvas selector
  - List of all user's canvases
  - Checkboxes to include/exclude from site
  - Drag to reorder
- **Right panel**: Site preview iframe
  - Shows the site as it will appear
  - Clicking a canvas navigates within iframe
  - Edits sync in real-time

#### 4. Canvas Selection Component

```svelte
<script lang="ts">
  interface Canvas {
    id: string;
    name: string;
    slug: string;
    included: boolean;
    position: number;
  }

  let { canvases, onUpdate }: {
    canvases: Canvas[];
    onUpdate: (canvases: Canvas[]) => void
  } = $props();
</script>

<ul class="canvas-list">
  {#each canvases as canvas (canvas.id)}
    <li draggable="true">
      <input
        type="checkbox"
        bind:checked={canvas.included}
        onchange={() => onUpdate(canvases)}
      />
      <span>{canvas.name}</span>
      <span class="drag-handle">⋮⋮</span>
    </li>
  {/each}
</ul>
```

### Phase 2: Preview Mode

#### Preview Route (`/sites/[slug]/preview`)

- Only accessible by site owner
- Shows site exactly as it will appear when published
- Read-only mode (no editing)
- Banner at top: "Preview Mode - [Publish] [Back to Edit]"

#### Implementation

```svelte
<!-- +page.svelte -->
<script lang="ts">
  let { data } = $props();
</script>

{#if data.isOwner}
  <div class="preview-banner">
    <span>Preview Mode</span>
    <a href="/sites/{data.site.slug}/edit">Back to Edit</a>
    <button onclick={publish}>Publish</button>
  </div>
{/if}

<WebsiteContainer
  author={data.author.username}
  canvases={data.siteCanvases}
  currentCanvas={data.currentCanvas}
  readOnly={true}
>
  <iframe src={data.canvasUrl} title={data.canvas.name}></iframe>
</WebsiteContainer>
```

### Phase 3: Publish Flow

#### Publish Action

1. Validate site has at least one canvas
2. Set `sites.is_published = true`
3. Redirect to public URL

#### Published Site Route (`/sites/@[username]/[site-slug]`)

- Public access (no auth required)
- Read-only view
- Navigation shows only included canvases
- Default to first canvas in order

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/YYYYMMDD_create_sites.sql` | Create | Sites and site_canvases tables |
| `src/routes/sites/+page.svelte` | Create | Sites dashboard |
| `src/routes/sites/+page.server.ts` | Create | Load user's sites |
| `src/routes/sites/new/+page.svelte` | Create | Create site form |
| `src/routes/sites/new/+page.server.ts` | Create | Create site action |
| `src/routes/sites/[slug]/edit/+page.svelte` | Create | Site editor |
| `src/routes/sites/[slug]/edit/+page.server.ts` | Create | Load site for editing (with auth guard) |
| `src/routes/sites/[slug]/preview/+page.svelte` | Create | Preview mode |
| `src/routes/sites/[slug]/preview/+page.server.ts` | Create | Load site for preview (with auth guard) |
| `src/routes/sites/@[username]/[site]/+page.svelte` | Create | Published site view |
| `src/routes/sites/@[username]/[site]/+page.server.ts` | Create | Load published site |
| `src/routes/sites/@[username]/[site]/[canvas]/+page.svelte` | Create | Published site canvas view |
| `src/routes/sites/@[username]/[site]/[canvas]/+page.server.ts` | Create | Load published site canvas |
| `src/routes/api/sites/+server.ts` | Create | Sites list/create API |
| `src/routes/api/sites/[id]/+server.ts` | Create | Site CRUD API |
| `src/routes/api/sites/[id]/canvases/+server.ts` | Create | Site canvases API |
| `src/lib/components/CanvasSelector.svelte` | Create | Canvas selection/ordering |
| `src/lib/components/WebsiteContainer.svelte` | Modify | Add readOnly prop |
| `src/hooks.server.ts` | Modify | Add security headers (CSP, X-Frame-Options) |

## Acceptance Criteria

### Site Creation
- [ ] User can create a new site with name and slug
- [ ] Slug is auto-generated from name but editable
- [ ] Duplicate slugs are prevented (per user)

### Canvas Selection
- [ ] User sees all their canvases in editor
- [ ] User can check/uncheck canvases to include in site
- [ ] User can drag to reorder canvases
- [ ] Changes save automatically

### Preview
- [ ] Owner can view site in read-only preview mode
- [ ] Preview shows exactly how published site will look
- [ ] Preview banner shows with publish/edit actions

### Publish
- [ ] One-click publish from preview or editor
- [ ] Published site has public URL
- [ ] Only included canvases appear in navigation
- [ ] User can unpublish site

### Navigation
- [ ] Site navigation shows only included canvases
- [ ] Canvases appear in user-defined order
- [ ] Current canvas is highlighted

## Migration Path

Existing published canvases can be migrated:
1. For each user with published canvases, create a default site
2. Add all published canvases to the site
3. Mark site as published

Or simpler: keep old routes working, new sites use new system.

## Resolved Questions

1. **Canvas editing in site context**: Yes, editing in the site editor saves to the actual canvas. The iframe loads the real canvas at `/canvas/[canvasId]` - no shadow copies.

2. **Canvas publishing independence**: Yes, `canvases.is_published` and site inclusion are independent. A canvas can be:
   - Published standalone (appears at `/@username/[canvas]`)
   - Included in a site (appears at `/sites/@username/[site]/[canvas]`)
   - Both or neither

3. **Site slug format**: Route-based `/sites/@username/[site-slug]` to match existing patterns.

4. **Default site**: No auto-creation. Keep backward compatibility with existing `/sites/@[username]/[canvas]` routes for users without explicit sites.

## Backward Compatibility

Existing routes must continue to work:
- `/sites/@[username]` - List user's published canvases (current behavior)
- `/sites/@[username]/[canvas]` - View published canvas (current behavior)

New explicit sites use new routes:
- `/sites/@[username]/[site-slug]` - View explicit site
- `/sites/@[username]/[site-slug]/[canvas]` - View canvas within site

Route resolution order:
1. Check if `[site-slug]` matches a site slug → show site
2. Otherwise treat as canvas slug → show canvas (backward compat)
