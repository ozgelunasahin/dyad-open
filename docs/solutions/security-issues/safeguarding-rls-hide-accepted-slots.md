---
topic: Safeguarding RLS — hide accepted meeting slots from non-participants
date: 2026-03-28
prs: [65]
tags: [security, safeguarding, rls, supabase, time-slots]
---

# Safeguarding: Hide Accepted Slots via RLS

## Context

dyad.berlin facilitates in-person meetings between strangers. When a meeting invitation is accepted, a time slot is marked `accepted = true`. This slot contains the approximate meeting area (`general_area`, `general_area_lat/lng`). Before this fix, any authenticated user could query accepted slots — revealing where and when someone will be. A stalking vector.

## What We Learned

**The original RLS policy was too permissive:**
```sql
-- OLD: any authenticated user sees ALL slots of published prompts
CREATE POLICY "Authenticated users can read slots of published prompts"
  ON time_slots FOR SELECT
  USING (EXISTS (SELECT 1 FROM prompts WHERE prompts.id = time_slots.prompt_id AND prompts.state = 'published') AND auth.uid() IS NOT NULL);
```

This included accepted slots. A non-participant could query `time_slots_public?accepted=eq.true` via the Supabase REST API and see confirmed meeting locations/times for strangers.

## The Fix

Three-branch RLS policy with participant-scoped visibility:

```sql
CREATE POLICY "Authenticated users read slots with safeguarding"
  ON time_slots FOR SELECT TO authenticated
  USING (
    -- 1. Authors always see all their own slots
    EXISTS (SELECT 1 FROM prompts WHERE prompts.id = time_slots.prompt_id AND prompts.author_id = (SELECT auth.uid()))
    OR (
      -- 2. Non-authors see only unaccepted slots of published prompts
      accepted = FALSE
      AND EXISTS (SELECT 1 FROM prompts WHERE prompts.id = time_slots.prompt_id AND prompts.state = 'published')
    )
    OR (
      -- 3. Meeting participants can see their accepted slot
      accepted = TRUE
      AND EXISTS (SELECT 1 FROM meetings WHERE meetings.slot_id = time_slots.id AND (SELECT auth.uid()) IN (meetings.participant_a, meetings.participant_b))
    )
  );
```

**Plus defense-in-depth** in the application layer:
```typescript
// In getPromptDetail — non-authors only see unaccepted slots
if (prompt.author_id !== userId) {
  slotsQuery = slotsQuery.eq('accepted', false);
}
```

**Key details:**
- The `(SELECT auth.uid())` wrapper is a Supabase performance pattern — evaluated once, not per row
- The `time_slots_public` view has `security_invoker = true`, so RLS is enforced through the view too
- The anon policy was also updated to exclude accepted slots
- An index on `meetings(slot_id)` supports the EXISTS subquery in branch 3
- Early-cancelled meetings reset `accepted = FALSE`, so branch 3 naturally stops applying

## Why This Matters

**Safeguarding principle:** For any platform facilitating in-person meetings between strangers, confirmed meeting locations and times must NEVER be visible to non-participants. This is not a privacy preference — it's a safety boundary.

**The pattern generalises:** Any data that transitions from "public-ish" to "private between two people" needs participant-scoped RLS. The three-branch structure (owner / general public with restrictions / specific participants) is reusable for any similar lifecycle.

**Defense-in-depth:** The RLS policy is the real enforcement. The application-layer filter is a belt-and-suspenders approach — if the RLS is accidentally loosened in a future migration, the code filter still prevents leakage. Both layers use the same logic (`accepted = false` for non-authors), making it easy to verify consistency.
