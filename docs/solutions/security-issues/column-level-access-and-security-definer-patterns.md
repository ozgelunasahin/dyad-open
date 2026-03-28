---
title: Column-level access control and SECURITY DEFINER patterns
category: security-issues
tags: [rls, security-definer, column-grants, supabase, postgresql]
components: [supabase/migrations, src/lib/services]
date: 2026-03-25
prs: [34, 35]
---

# Column-Level Access Control and SECURITY DEFINER Patterns

## Problem

We needed to hide `time_slots.exact_location` from non-authors while keeping the rest of the table accessible. We also needed SECURITY DEFINER functions for atomic multi-table operations (accepting invitations, cancelling meetings) with proper authorization and privilege management.

## Patterns Discovered

### 1. Column-level REVOKE, not table-level

**Gotcha**: `REVOKE SELECT ON time_slots FROM authenticated` removes the table-level privilege entirely. RLS policies can only *filter rows* — they require the base SELECT privilege to exist. Without it, even the author's `FOR ALL` policy doesn't work, and all queries fail.

**Solution**: Column-level grants:

```sql
REVOKE SELECT ON time_slots FROM authenticated;
GRANT SELECT (id, prompt_id, start_time, duration_minutes, general_area, general_area_lat, general_area_lng, accepted, created_at)
  ON time_slots TO authenticated;
```

This preserves RLS functionality (row filtering works) while preventing `SELECT exact_location` on the base table. SECURITY DEFINER functions bypass column grants (they run as `postgres`), so they can still read the hidden column.

**Why not a view?** We already have `time_slots_public` as a view, but the query service and tests also need to read from the base table for operations like slot counting. Column-level grants are the cleanest solution that doesn't break existing code.

### 2. DROP FUNCTION required for return type changes

**Gotcha**: `CREATE OR REPLACE FUNCTION` cannot change the return type of an existing function. PostgreSQL raises: `cannot change return type of existing function`.

**Solution**: Use `DROP FUNCTION IF EXISTS` before `CREATE FUNCTION`:

```sql
DROP FUNCTION IF EXISTS accept_invitation(UUID);

CREATE FUNCTION accept_invitation(p_invitation_id UUID)
RETURNS UUID  -- was BOOLEAN
...
```

**Important**: After DROP + CREATE, execution grants are lost. Re-apply them:

```sql
REVOKE EXECUTE ON FUNCTION accept_invitation FROM public;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
```

### 3. Two-tier RPC pattern for sensitive data

When the same entity has different visibility rules depending on state, use two SECURITY DEFINER functions:

- **`get_meeting_with_location`**: Returns full data including sensitive columns. Filters out cancelled meetings (`state NOT IN ('cancelled_early', 'cancelled_late')`). For the "active meeting detail" use case.
- **`get_meeting_detail`**: Returns metadata + cancellation info but no sensitive columns. Works for all states including cancelled. For the "what happened to this meeting" use case.

The API endpoint tries the full-access function first, falls back to the detail function:

```typescript
const withLocation = await service.getWithLocation(meetingId);
if (withLocation) return json(withLocation);

const detail = await service.getDetail(meetingId);
if (detail) return json(detail);

return json({ error: 'Meeting not found' }, { status: 404 });
```

### 4. Extending atomic SECURITY DEFINER functions

When a SECURITY DEFINER function needs additional side effects (e.g., `accept_invitation` now also creates a meeting), extend the existing function rather than creating a new one:

**Why**: Atomicity. The slot booking, invitation state change, competing invitation cancellation, and meeting creation must all succeed or all fail. A second RPC call after the first creates a window for inconsistency.

**Pattern**: Use `INSERT ... SELECT ... RETURNING INTO` within the function:

```sql
INSERT INTO meetings (invitation_id, prompt_id, ...)
SELECT pi.id, pi.prompt_id, ...
FROM prompt_invitations pi
JOIN time_slots ts ON ts.id = pi.slot_id
WHERE pi.id = p_invitation_id
RETURNING id INTO v_meeting_id;
```

**Gotcha**: Make sure column mappings are correct. `pi.invitee_id` is a user UUID, not an invitation ID. The first `SELECT` column maps to the first `INSERT` column — order matters.

### 5. Server-side business rule computation

Time-based business rules (cancellation tier, invitation expiry) must be computed inside the SECURITY DEFINER function, never accepted from the client:

```sql
-- Compute tier server-side — client cannot manipulate this
IF v_meeting.scheduled_time - INTERVAL '12 hours' > NOW() THEN
    v_tier := 'early';
ELSE
    v_tier := 'late';
END IF;
```

The function also queries historical data for business decisions (free pass):

```sql
SELECT COUNT(*) INTO v_late_count
FROM cancellation_records cr
WHERE cr.cancelled_by = v_caller AND cr.tier = 'late';
```

This keeps all business logic tamper-proof — the client only provides the meeting ID and an optional reason string.

### 6. Application-layer filtering is not a security boundary

**Discovered during Session 3 planning (2026-03-28).** The `time_slots` table had column-level grants correctly hiding `exact_location`, but the ROW-level visibility of accepted slots was enforced only in application code (`.eq('accepted', false)` in `prompt-query.ts`). The RLS policies allowed any authenticated user to SELECT accepted slots — including their `start_time`, `general_area`, and fuzzed coordinates.

This means a direct Supabase REST API query (`/rest/v1/time_slots_public?accepted=eq.true`) bypasses the application filter entirely, revealing confirmed meeting times and approximate locations. For a platform facilitating in-person meetings between strangers, this is a stalking vector.

**Fix:** Add an RLS policy that hides accepted slots from non-participants:

```sql
CREATE POLICY "Authenticated users read available slots of published prompts"
  ON time_slots FOR SELECT TO authenticated
  USING (
    -- Authors see their own slots
    EXISTS (SELECT 1 FROM prompts WHERE prompts.id = time_slots.prompt_id
            AND prompts.author_id = (SELECT auth.uid()))
    OR (
      -- Non-authors see only unaccepted slots of published prompts
      accepted = FALSE
      AND EXISTS (SELECT 1 FROM prompts WHERE prompts.id = time_slots.prompt_id
                  AND prompts.state = 'published')
    )
    OR (
      -- Meeting participants see their accepted slot
      EXISTS (SELECT 1 FROM meetings WHERE meetings.slot_id = time_slots.id
              AND (SELECT auth.uid()) IN (meetings.participant_a, meetings.participant_b))
    )
  );
```

**The general rule:** Any filter applied in application code (`prompt-query.ts`, page loaders, API endpoints) that has privacy or safeguarding implications MUST also be enforced at the RLS layer. Application-layer filtering is a UX convenience; RLS is the security boundary. The Supabase anon key is public — any authenticated user can query any table directly.

## Prevention

- When hiding columns: use column-level REVOKE/GRANT, not table-level REVOKE (which breaks RLS)
- When hiding rows by state: enforce in RLS, not just in application queries (direct API access bypasses application code)
- When changing function return types: DROP first, then CREATE (not CREATE OR REPLACE), then re-grant
- When extending atomic functions: add to the existing function, don't create a second one
- When exposing sensitive data conditionally: use two-tier RPC (full access + metadata-only)
- When computing time-based business rules: always server-side in the function, never from client input
- Always add `SET search_path = public` to SECURITY DEFINER functions
- Always re-apply `REVOKE/GRANT EXECUTE` after DROP + CREATE

## Related

- `docs/solutions/architecture/service-layer-and-test-portability-patterns.md` — service interface patterns, view-based column hiding (earlier approach)
- `docs/plans/2026-03-25-feat-meetings-backend-plan.md` — meetings plan with security review findings
- `docs/plans/2026-03-25-feat-comments-and-invitations-plan.md` — engagement plan with RLS patterns
