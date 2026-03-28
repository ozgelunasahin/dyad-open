---
status: pending
priority: p2
issue_id: "089"
tags: [ux, design, invitation]
dependencies: []
---

# Invitation flow doesn't follow design patterns

## Problem Statement

The "invite to meet" flow on the conversation detail page is visually disconnected from the rest of the app. The slot selection, message input, and invite button use raw form elements rather than the card-based design language. The whole section reads as a list of raw data fields rather than a guided interaction.

Current appearance:
- Raw text list of slots (date, time, duration, area)
- "Selected" button that doesn't look like a selection
- "Add a message..." textarea appears after selection
- "Invite to meet" button at the bottom

Should use: SlotCard components (from the slot card plan), consistent button styling, progressive disclosure that feels like a natural conversation, not a form submission.
