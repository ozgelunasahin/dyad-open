---
status: deferred-v0.2
priority: p1
issue_id: "083"
tags: [ux, architecture, profile]
dependencies: ["082"]
---

# Unify conversation and meeting into one view

## Problem Statement

The conversation (prompt + responses + invitations) and meeting (time, location, participant, cancel, feedback) are currently separate pages (`/prompts/[id]` and `/meetings/[id]`). Users navigate between them to piece together what's happening. They should be one view — the conversation IS the unit of activity.

## Proposed Solution

The conversation detail page (`/conversations/[id]` after route rename) becomes the single view for the entire lifecycle: prompt content → responses → invitation → meeting details → feedback. The `/meetings/[id]` route becomes a redirect to the conversation with the meeting section scrolled into view.

Depends on todo #082 (route rename to `/conversations/`).

## Source

- User testing: "clicking either meeting or conversation should go to the same place"
- Airbnb pattern: trip page shows listing + booking + messages + review in one view
- Design principle: conversation is the social object, meeting is a chapter within it
