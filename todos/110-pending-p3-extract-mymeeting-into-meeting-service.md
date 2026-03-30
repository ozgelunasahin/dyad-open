---
id: 110
status: pending
priority: p3
title: Extract myMeeting query into MeetingService
tags: [code-review, architecture]
---

# Extract myMeeting query into MeetingService

The inline Supabase query for myMeeting in `+page.server.ts` bypasses the service layer. Add a `getMeetingForPromptParticipant(promptId, userId)` method to `MeetingService` that encapsulates both the meeting lookup and the RPC call.

## Files

- `src/lib/services/meeting.ts` — add new method to interface + implementation
- `src/routes/(app)/conversations/[id]/+page.server.ts` — replace inline query with service call
