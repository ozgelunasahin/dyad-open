---
title: Fix Svelte 5 / Vite build warnings
type: fix
status: completed
date: 2026-03-29
---

# Fix Svelte 5 / Vite build warnings

These warnings show during `vite build` and CI but are invisible during local dev (Playwright reuses the running dev server). One PR against `dev` branch.

## Acceptance Criteria

- [x] Zero Svelte warnings in `vite build` output (categories 1–5 below)
- [x] `npx svelte-check --threshold error` passes with no new errors
- [x] E2E tests still pass (`npx playwright test`)
- [x] Categories 6–7 (third-party plugin) documented as known/harmless

---

## Category 1: `state_referenced_locally` — suppress with svelte-ignore

All are the intentional "copy initial value into local editable state" pattern (documented in `docs/solutions/ux-patterns/svelte5-derived-base-state-override-step-machine.md`). Data is not re-fetched during the component's lifetime. Fix: add `// svelte-ignore state_referenced_locally` on the line above each.

| File | Line(s) | Variable(s) |
|------|---------|-------------|
| `src/routes/(app)/conversations/[id]/+page.svelte` | 15, 25 | `responseText`, `invitedSlotIds` |
| `src/routes/(app)/feedback/[id]/+page.svelte` | 22 | `revealedFeedback` |
| `src/routes/(editor)/conversations/[id]/edit/+page.svelte` | 14, 15, 16 | `title`, `body`, `coverImageUrl` |
| `src/routes/login/+page.svelte` | 8, 9 | `mode`, `email` |
| `src/routes/join/+page.svelte` | 7 | `username` |
| `src/lib/components/LocationSearch.svelte` | 12 | `query` |

**11 warnings → 0.** Use single-line `// svelte-ignore state_referenced_locally` comments. For consecutive lines (editor lines 14–16, login lines 8–9), one comment above the block suffices.

---

## Category 2: `non_reactive_update` — add `$state()` to bind:this refs

`bind:this` assigns to the variable, which needs `$state()` for Svelte 5 reactivity. The `ConfirmDialog` component already uses this pattern internally.

| File | Line | Fix |
|------|------|-----|
| `src/routes/(app)/conversations/[id]/+page.svelte` | 106 | `let archiveDialog: ConfirmDialog = $state();` |
| `src/routes/(app)/meetings/[id]/+page.svelte` | 11 | `let cancelDialog: ConfirmDialog = $state();` |

**2 warnings → 0.**

---

## Category 3: Unused CSS

| File | Line | Selector | Fix |
|------|------|----------|-----|
| `src/routes/(app)/discover/+page.svelte` | 256–258 | `.prompt-actions` | Delete the rule — no element uses this class |

**1 warning → 0.**

**Additional:** 4 files use `-webkit-line-clamp` without the standard `line-clamp` property (BottomSheet.svelte, ConversationCard.svelte, SearchOverlay.svelte, discover/+page.svelte). Add `line-clamp: N` alongside `-webkit-line-clamp: N` in each.

---

## Category 4: A11y issues

| File | Line | Warning | Fix |
|------|------|---------|-----|
| `src/lib/components/SlotCard.svelte` | 25 | Redundant `role="button"` on `<button>` | Remove `role="button"`, keep `aria-pressed` |
| `src/lib/components/SearchOverlay.svelte` | 78 | `autofocus` a11y warning | Add `<!-- svelte-ignore a11y_autofocus -->` — intentional UX for search overlay |
| `src/lib/components/PublishSheet.svelte` | 113 | `role="dialog"` missing `tabindex` | Add `tabindex="-1"` to the `.sheet` div |
| `src/lib/components/LocationSearch.svelte` | 50 | `role="combobox"` missing `aria-controls` | Add `aria-controls="location-results"` to input, add `id="location-results"` + `role="listbox"` to dropdown |

**4 warnings → 0.**

---

## Category 5: TipTap duplicate Link extension

**Investigation:** `PromptEditor.svelte` registers `StarterKit` + `Link.configure(...)`. StarterKit does NOT include Link (it's a separate `@tiptap/extension-link` package), so the config is correct. The `[tiptap warn]: Duplicate extension names found: ['link']` may be a **runtime console warning** rather than a build warning — it doesn't appear in the Vite build output.

**Action:** During implementation, load the editor page and check the browser console. If the warning exists:
- Check if `StarterKit` is being imported from a bundle that includes Link
- Possible fix: `StarterKit.configure({ ...extensionsToDisable })` if there's a conflict
- If it's a TipTap version issue, document as known/harmless

---

## Categories 6–7: Third-party plugin warnings (document only)

**Rollup `codeSplitting`** — `vite-pwa` plugin passes an option Rollup doesn't recognize. This is a plugin version mismatch. Harmless.

**PWA workbox glob** — `prerendered/**/*.{html,json}` doesn't match files because the app doesn't prerender pages. Already documented in CLAUDE.md as harmless.

**Action:** No code changes. Already documented.

---

## Implementation order

1. Category 2 (bind:this — 2 files, real code fix)
2. Category 3 (unused CSS — 1 file, deletion)
3. Category 4 (a11y — 4 files, real improvements)
4. Category 1 (svelte-ignore comments — 6 files, suppressions)
5. Category 5 (TipTap — investigate, fix or document)
6. Run `vite build` and `svelte-check` to verify zero new warnings
7. Run `npx playwright test` to verify no regressions
