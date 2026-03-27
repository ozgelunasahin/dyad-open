---
status: pending
priority: p2
id: "037"
tags: [code-review, performance, supabase]
---

# Dashboard Makes 16 Sequential Supabase Queries

## Problem Statement

The dashboard `load` function in `src/routes/dashboard/+page.server.ts` fires up to 16 Supabase round trips, many sequential. For admin users: 8 parallel + 1 sequential + 1 + 1 + 4 parallel + 1 sequential = 16 total. On Cloudflare Pages where each round trip to Supabase incurs network latency, this results in 1-3 second dashboard load times.

## Findings

### Performance Oracle Agent

- Initial batch: 8 parallel queries (line 14) — good
- Sequential follow-ups: profiles.select().in() for usernames (line 75), meeting_invitations count (line 98), profiles for referrals (line 105)
- Admin-only: 4 additional parallel queries (line 161), then another sequential profiles query (line 136)
- Total sequential stages: 4-5, adding 100-300ms per stage

## Proposed Solutions

### Option A: Merge into 2 parallel batches (Recommended)
Move all independent queries into the initial Promise.all. Only keep queries that depend on prior results as sequential.
- **Pros:** Reduces latency by 30-50%, minimal code change
- **Cons:** Larger initial Promise.all may be harder to read
- **Effort:** Medium
- **Risk:** Low

### Option B: Create a Supabase RPC function
Single database call returns all dashboard data.
- **Pros:** Single round trip, maximum performance
- **Cons:** Complex SQL function, harder to maintain, requires migration
- **Effort:** Large
- **Risk:** Medium

## Technical Details

**Affected files:**
- `src/routes/dashboard/+page.server.ts`

Also noted: `src/routes/+page.server.ts` landing page has a wasted query for logged-in users (loads canvas data before redirect). Move redirect before data loading.

## Acceptance Criteria

- [ ] Dashboard load completes in ≤2 sequential query stages
- [ ] Admin dashboard load time reduced measurably
- [ ] No regression in data completeness
