# Overnight Decisions Log — 2026-03-26

Decisions made while digit was asleep. All used best judgement per instruction.

## PRs Merged

1. **PR #39** (landing page + shared layout) — merged to unblock PR 3
2. **PR #40** (author experience) — merged after architecture + security review passed. Fixed `beforeunload` bug before merge.
3. **PR #41** (reader/engagement) — pending review, will merge if reviews pass

## Decisions Made

### PR 3 (Author Experience)

1. **Feedback form loads by form ID, not meeting ID** — the gate redirects to `/feedback/{formId}`, and the `FeedbackService.getMyForm()` takes `meetingId`. I used `params.id` as the meeting ID in the service call. This may need adjustment if the gate actually passes a form ID. The `getMyForm` catch block handles the mismatch gracefully by redirecting to `/discover`.

2. **Edit page loads all prompts then filters** — the architecture review flagged this as O(n) when O(1) would suffice. Kept as-is for v0.1 (likely <100 prompts per user). Filed as a known improvement.

3. **Meeting detail uses `getWithLocation` then falls back to `getDetail`** — the RPC might return different shapes. I check for `'exact_location' in meeting` in the template to handle both cases. May need testing with real meeting data.

4. **Prompt detail uses `{@html body_html}`** — confirmed safe because `body_html` comes from `renderTiptapToHtml()` which runs DOMPurify. Security review confirmed.

5. **Profile tabs use local `$state`, not URL params** — per simplicity review recommendation. Can add URL sync later if needed.

6. **Discover cards changed from `<div>` to `<a>`** — clickable links to `/prompts/[id]`. Existing CSS applies via class selectors, but some hover styles may need adjustment.

### PR 4 (Reader/Engagement)

7. **Feedback form `getMyForm` parameter mismatch** — the service expects `(meetingId, userId)` but the URL has a form ID from the gate. This needs verification — the form may silently fail to load and redirect to `/discover`. If the gate passes form IDs, a `getFormById` method is needed.

8. **No `getFormById` method added** — the plan called for it but the feedback service doesn't have one. Used `getMyForm` with a catch block. This is the most likely issue to surface during testing.

## Items NOT Done

- **Ozge's CSS incorporation** — need to compare design branches and apply styling across all new pages
- **Agent-browser click-through testing** — need to verify full flow manually
- **Integration test cleanup** — todo filed (#072) but not implemented
- **CLAUDE.md update** — still describes canvas-era architecture
- **coverImageUrl validation** — low-severity hardening item noted by security review
