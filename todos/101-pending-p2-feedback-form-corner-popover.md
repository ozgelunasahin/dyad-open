---
status: pending
priority: p2
issue_id: "101"
tags: [code-review, ux, feedback, v0.1]
---

# Feedback form should be corner popover, not blocking modal

## Problem Statement

The feedback form (FeedbackModal) opens as a centered modal with a backdrop overlay. This blocks the page and prevents the user from seeing what they're writing about. It should open as a corner popover near the "?" button.

Additional requirements:
- Admin panel should also have the feedback form (any logged-in area should have it)
- Type selector should be a dropdown, not button row
- "Report content" should be an option alongside bug/feature/other

## Findings

- User feedback: "let the user see what they are writing about"
- Current: `<dialog>` with `showModal()` + `::backdrop`
- Should be: positioned popover near bottom-right button, no overlay

## Acceptance Criteria

- [ ] Feedback form opens as corner popover near the "?" button
- [ ] No page-blocking overlay
- [ ] Available on admin pages too
- [ ] Type includes "report content" option
- [ ] Type selector is a dropdown
