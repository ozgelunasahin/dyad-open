---
status: pending
priority: p2
issue_id: "106"
tags: [code-review, copy, v0.1]
---

# copy.ts wiring incomplete — many hardcoded strings remain

## Problem Statement

Plan items 7.1, 7.3, 7.8 are marked done but many strings remain hardcoded:

**Profile**: 'Meeting cancelled', 'cancelled your meeting', 'Untitled', 'Published'/'Draft'/'Responded'/'Archived' status labels, 'No meetings yet.', 'Accept'/'Accepting...'

**Conversation detail**: 'Send' (response button), 'Edit' (response edit), 'Accept'/'Accepting...', 'Meeting scheduled', 'Conversation' (fallback title)

**FeedbackModal**: 'Sending...'/'Send', 'Bug'/'Feature'/'Other' type labels

**Sidebar layouts**: 'sign out' hardcoded in (app) layout and (editor) layout, 'Discover'/'Profile'/'Admin' nav labels

**Other**: formatDate helpers duplicated in 7 files (should be in utils/dates.ts)

## Acceptance Criteria

- [ ] All user-facing strings use copy.ts imports
- [ ] Status labels centralized
- [ ] formatDate consolidated into utils/dates.ts
