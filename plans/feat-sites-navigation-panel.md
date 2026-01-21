# feat: Sites Navigation Panel

## Overview

Enhance the sites feature with an always-available navigation panel that provides an alternative way to browse published canvases without searching through content.

## Problem Statement

Currently, the navigation panel in WebsiteContainer only shows when there are 2+ canvases. Users want:
1. A **collapsible navigation panel** that's always accessible (default: collapsed)
2. An **alternative to content searching** - browse by page titles
3. **Cross-canvas discovery** without needing to find links in content

## Current State

**WebsiteContainer.svelte already has navigation** (lines 120-136):
```svelte
{#if canvases.length > 1}
    <nav class="canvas-nav">
        <span class="nav-label">Canvases</span>
        <ul>
            {#each canvases as canvas}
                <li>
                    <a href="/sites/@{author}/{canvas.slug}"
                       class:active={canvas.slug === currentCanvas}>
                        {canvas.name}
                    </a>
                </li>
            {/each}
        </ul>
    </nav>
{/if}
```

**Data already fetched** in `+page.server.ts` (lines 34-40):
```typescript
const { data: allCanvases } = await locals.supabase
    .from('canvases')
    .select('name, slug')
    .eq('user_id', profile.id)
    .eq('is_published', true)
    .order('updated_at', { ascending: false });
```

## Proposed Solution

### Phase 1: Always-Visible Collapsible Nav (MVP)

Make the navigation panel always available with a collapsible UI:

1. **Remove the `canvases.length > 1` condition** - show nav even with 1 canvas
2. **Add collapsed state** - default to collapsed (icon-only or thin tab)
3. **Persist state** - remember open/closed in localStorage per-site
4. **Add toggle button** - hamburger/list icon to expand/collapse

### Changes Required

#### 1. WebsiteContainer.svelte

```svelte
<!-- Add state -->
<script>
  let navExpanded = $state(false);

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(`site-nav-${author}`);
      navExpanded = saved === 'true';
    }
  });

  function toggleNav() {
    navExpanded = !navExpanded;
    localStorage.setItem(`site-nav-${author}`, String(navExpanded));
  }
</script>

<!-- Always show nav toggle -->
<button class="nav-toggle" onclick={toggleNav} aria-expanded={navExpanded}>
  <MenuIcon />
  {#if navExpanded}<span>Pages</span>{/if}
</button>

{#if navExpanded && canvases.length > 0}
  <nav class="canvas-nav">
    <!-- existing nav content -->
  </nav>
{/if}
```

#### 2. Styling Updates

```css
.nav-toggle {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-secondary);
  border: none;
  padding: 8px;
  cursor: pointer;
  z-index: 100;
}

.canvas-nav {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 240px;
  background: var(--bg-secondary);
  padding: 1rem;
  overflow-y: auto;
}
```

## Acceptance Criteria

- [ ] Navigation toggle button visible on all site pages
- [ ] Navigation panel starts collapsed by default
- [ ] Clicking toggle expands/collapses the panel
- [ ] Panel shows all published canvases for the site
- [ ] Current canvas is highlighted in the list
- [ ] State persists across page navigation (localStorage)
- [ ] Works on mobile (full-screen drawer pattern)

## Out of Scope (Future)

- Canvas selection UI (choosing which canvases appear in nav)
- Manual canvas reordering
- Cross-canvas links (linking between different users' canvases)
- Promoting cards to new canvases

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/components/WebsiteContainer.svelte` | Add nav state, toggle button, always show nav |
| `src/routes/sites/@[username]/[canvas]/+page.svelte` | No changes needed (data already passed) |

## References

- Current implementation: `src/lib/components/WebsiteContainer.svelte:120-136`
- Data fetching: `src/routes/sites/@[username]/[canvas]/+page.server.ts:34-40`
- Feedback item: `e0a99118-4c1d-4c64-8616-6bab7ddbbe66`
