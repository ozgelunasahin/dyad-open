# Playwright Regression Test Suite

## Overview

Add comprehensive Playwright e2e tests covering core user workflows to prevent regressions. Tests should be atomic, fast, and reliable.

## User Workflows

Based on the application's core functionality, these are the key workflows that need test coverage:

### 1. Edit Workflow (Card Editing)

**User Story**: As a user, I want to edit card content and create links that open in edit mode, maintaining my position when navigating back.

**Flow**:
1. Navigate to canvas with content
2. Focus a card (click)
3. Enter edit mode (double-click or press 'e')
4. Write text in the editor
5. Create a wikilink (Ctrl+K or type `[[link-name]]`)
6. Click the wikilink → opens new/existing card
7. New card opens in edit mode (if newly created)
8. Write text in the new card
9. Navigate back (ArrowLeft)
10. **Assert**: Parent card is still in edit mode, cursor position preserved, view unchanged

### 2. Navigation Workflow (Link Focus Mode)

**User Story**: As a user, I want to navigate between cards using keyboard without losing my place.

**Flow**:
1. Focus a card with links
2. Press Tab → enter link focus mode
3. ArrowRight → opens highlighted link
4. ArrowLeft → closes child card (stays in link focus)
5. Continue Tab → cycle through links
6. Escape → exit link focus mode

### 3. Canvas Pan/Zoom Workflow

**User Story**: As a user, I want to pan and zoom the canvas and have my view preserved across interactions.

**Flow**:
1. Navigate to canvas
2. Scroll to zoom (verify zoom level changes)
3. Drag to pan (verify position changes)
4. Open a link → new card appears
5. Close the card
6. **Assert**: Original zoom/pan position preserved

### 4. Card Lifecycle Workflow

**User Story**: As a user, I want cards to open and close predictably.

**Flow**:
1. Click a wikilink → card opens
2. Multiple links → multiple cards (positioned relative to source link)
3. Close child card via close button
4. Close child card via ArrowLeft
5. Close child card via Escape (on root/orphan only)
6. **Assert**: Parent card remains, child is removed

### 5. Content Persistence Workflow

**User Story**: As a user, I want my edits saved automatically.

**Flow**:
1. Enter edit mode
2. Type content
3. Wait for autosave (1.5s debounce)
4. Refresh page
5. **Assert**: Content persisted

### 6. Site Builder Workflow

**User Story**: As a user, I want to create and manage sites with selected canvases.

**Flow**:
1. Navigate to /sites
2. Create a new site
3. Select canvases to include
4. Reorder canvases (drag-drop)
5. Preview site
6. Publish site
7. **Assert**: Published site is publicly accessible

---

## Atomic Test Cases

### Edit Mode Tests (`tests/edit-mode.spec.ts`)

| Test | Description | Data Attributes |
|------|-------------|-----------------|
| `enters edit mode on double-click` | Double-click card → `[data-editing="true"]` | `data-editing` |
| `enters edit mode with e key` | Focus + 'e' key → edit mode | `data-editing` |
| `exits edit mode on Escape` | Edit mode + Escape → view mode | `data-editing` |
| `exits edit mode on click outside` | Edit mode + click canvas → view mode | `data-editing` |
| `persists edit mode after child navigation` | Edit → open link → ArrowLeft → still editing | `data-editing`, `.ProseMirror-focused` |
| `saves on Ctrl+S` | Edit + Ctrl+S → save indicator | `.save-indicator` |
| `autosaves after debounce` | Type → wait 2s → saved | API response |
| `deletes empty card on exit` | Create link → empty → Escape → card removed | `[data-note-id]` count |

### Wikilink Tests (`tests/wikilinks.spec.ts`)

| Test | Description | Data Attributes |
|------|-------------|-----------------|
| `creates wikilink with Ctrl+K` | Select text + Ctrl+K → `.wikilink` created | `.wikilink` |
| `creates wikilink with bracket typing` | Type `[[test]]` → wikilink | `.wikilink[data-target]` |
| `opens existing note on click` | Click wikilink → child card opens | `[data-note-id]` count |
| `creates new note for broken link` | Click broken link → new card in edit mode | `[data-note-id]`, `data-editing` |
| `marks broken links` | Link to non-existent note → `.wikilink.broken` | `.wikilink.broken` |
| `removes broken link after note creation` | Create note → `.broken` class removed | `.wikilink:not(.broken)` |

### Navigation Tests (`tests/navigation.spec.ts`)

| Test | Description | Data Attributes |
|------|-------------|-----------------|
| `Tab enters link focus mode` | Focus card + Tab → `.wikilink.link-focused` | `.link-focused` |
| `Tab cycles through links` | Link focus + Tab → next link highlighted | `.link-focused` |
| `ArrowRight opens focused link` | Link focus + ArrowRight → child card | `[data-note-id]` count |
| `ArrowLeft closes child card` | Child open + ArrowLeft → child closed | `[data-note-id]` count |
| `ArrowLeft stays in link focus` | Close child + verify still in link focus | `.link-focused` |
| `Escape exits link focus mode` | Link focus + Escape → no `.link-focused` | `.link-focused` not visible |
| `Alt+ArrowLeft goes back in history` | Navigate → Alt+ArrowLeft → previous state | Browser history |
| `Alt+ArrowRight goes forward` | Back → Alt+ArrowRight → forward state | Browser history |

### Card Lifecycle Tests (`tests/card-lifecycle.spec.ts`)

| Test | Description | Data Attributes |
|------|-------------|-----------------|
| `opens card on wikilink click` | Click wikilink → new card visible | `[data-note-id]` |
| `positions child card relative to link` | Open link → card Y near link Y | Card position |
| `close button removes child card` | Click `.close-dot` → card removed | `[data-note-id]` count |
| `Escape does not close root card` | Root card + Escape → card remains | `[data-note-id]` count |
| `multiple children can be open` | Open 2+ links → multiple cards | `[data-note-id]` count |
| `closing parent closes children` | Close parent → all children close | `[data-note-id]` count |

### Canvas Interaction Tests (`tests/canvas-interactions.spec.ts`)

| Test | Description | Data Attributes |
|------|-------------|-----------------|
| `scroll zooms canvas` | Wheel scroll → camera.zoom changes | Store state |
| `drag pans canvas` | Drag on canvas → camera.x/y changes | Store state |
| `click on canvas unfocuses card` | Focus card → click canvas → unfocused | `.focused` not visible |
| `maintains zoom after card open/close` | Zoom → open/close → same zoom | Camera state |

### Site Builder Tests (`tests/site-builder.spec.ts`)

| Test | Description | Selectors |
|------|-------------|-----------|
| `creates new site` | Fill form → submit → site created | Form inputs, redirect |
| `adds canvas to site` | Click checkbox → canvas included | Checkbox state |
| `reorders canvases via drag` | Drag canvas → position updated | Position order |
| `removes canvas from site` | Uncheck → canvas removed | Checkbox state |
| `previews site` | Click preview → preview page loads | URL check |
| `publishes site` | Click publish → is_published = true | Badge state |
| `unpublishes site` | Click unpublish → is_published = false | Badge state |
| `public can view published site` | Logout → visit site → visible | Content visible |

### Content Tests (`tests/content.spec.ts`)

| Test | Description | Selectors |
|------|-------------|-----------|
| `content persists after refresh` | Edit → refresh → content present | `.ProseMirror` content |
| `images display after paste` | Paste image → visible | `img` element |
| `bold/italic formatting works` | Select + Ctrl+B/I → styled | `strong`, `em` |
| `headings render correctly` | Type # heading → h1/h2/h3 | Heading elements |

---

## Test Implementation Plan

### Phase 1: Core Edit Workflow (Priority: Critical)

1. Create `tests/edit-mode.spec.ts` with edit mode tests
2. Create `tests/wikilinks.spec.ts` with wikilink tests
3. Create `tests/navigation.spec.ts` with keyboard navigation tests

### Phase 2: Card & Canvas (Priority: High)

4. Create `tests/card-lifecycle.spec.ts` with card open/close tests
5. Create `tests/canvas-interactions.spec.ts` with pan/zoom tests

### Phase 3: Site Builder (Priority: Medium)

6. Create `tests/site-builder.spec.ts` with site management tests

### Phase 4: Content & Edge Cases (Priority: Low)

7. Create `tests/content.spec.ts` with content persistence tests
8. Add edge case tests (concurrent edits, network failures, etc.)

---

## Test Utilities

### Page Object Model

Create reusable page objects for common interactions:

```typescript
// tests/fixtures/canvas-page.ts
export class CanvasPage {
  constructor(private page: Page) {}

  async goto(canvasSlug: string) {
    await this.page.goto(`/canvas/${canvasSlug}`);
  }

  async focusCard(heading: string) {
    await this.page.getByRole('heading', { name: heading }).click();
  }

  async enterEditMode(heading: string) {
    await this.page.getByRole('heading', { name: heading }).dblclick();
  }

  async isEditing() {
    return this.page.locator('[data-editing="true"]').isVisible();
  }

  async clickWikilink(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }

  async getCardCount() {
    return this.page.locator('[data-note-id]').count();
  }

  async waitForCardCount(count: number) {
    await expect(this.page.locator('[data-note-id]')).toHaveCount(count);
  }
}
```

### Test Data

Use seeded test data for consistent test runs:

```typescript
// tests/fixtures/test-data.ts
export const testCanvases = {
  'getting-started': {
    id: 'test-canvas-1',
    name: 'Getting Started',
    notes: [
      { slug: 'slow-reading', title: 'Slow Reading', hasLinks: true },
      { slug: 'isabelle-stengers', title: 'Isabelle Stengers' }
    ]
  }
};
```

---

## Configuration Updates

### Existing Config

The current `playwright.config.ts` already has:
- Auth setup with storage state
- Web server auto-start
- Chrome desktop testing
- HTML reporter

### Recommended Additions

```typescript
// Add to playwright.config.ts
use: {
  // ... existing config
  video: 'retain-on-failure', // Help debug flaky tests
  actionTimeout: 10000,       // Fail fast on stuck interactions
},
```

---

## Success Criteria

1. All Phase 1 tests pass on CI
2. Tests complete in under 2 minutes total
3. No flaky tests (3 consecutive green runs)
4. Coverage of all critical user paths
5. Clear failure messages that identify the broken functionality

---

## Notes

- Use `data-*` attributes for reliable test selectors
- Avoid `waitForTimeout` except where animations require it
- Test against seeded data, not production
- Keep tests atomic and independent
- Run tests in parallel where possible
