---
topic: Backend implementation sequence for DDD domain model
date: 2026-03-24
status: complete
participants: digit, claude
---

# Backend Implementation Sequence

How to get from the current codebase to the domain model described in the DDD plan, starting with backend and architectural changes.

## What We're Building

A phased backend migration from the current inline-logic-in-route-handlers architecture to a typed service layer with proper domain entities, state machines, and clean API boundaries — while keeping the existing canvas component running untouched.

## Key Decisions

### 1. Domain model first, canvas extraction later
The canvas (~6,300 lines) stays as-is while we build the new domain model alongside it. The canvas continues working for existing users. Extraction happens as a separate effort once the domain model is stable.

**Why:** The canvas and the domain model are independent workstreams. Building the domain model doesn't require the canvas to be extracted first, and attempting both simultaneously introduces unnecessary risk.

### 2. New prompts table from scratch (no migration)
Create a clean `prompts` table with proper schema. Do not evolve the `canvases` table. Existing conversation data is generated examples and doesn't need migrating — fresh start.

**Why:** The canvases table has accumulated dual-purpose columns, serialized JSON for time slots, and inconsistent data formats. A clean table is simpler than migrating legacy data structures. The small pre-launch user base makes this viable.

### 3. Story 3 (Start a Prompt) is the first end-to-end slice
Sophie writes and publishes a prompt with time slots and locations. This is the foundation — without prompts in the database, there's nothing to discover or invite to.

**Why:** Every other story depends on prompts existing. Story 1 (registration) partially works already. Stories 2 and 4 need prompts to operate on.

### 4. Typed service layer with interfaces
Create a `src/lib/services/` layer with typed service functions. Route handlers become thin dispatchers. Domain logic lives in services.

**Why:** The current codebase has business logic scattered across 20+ route handlers with significant duplication (username enrichment 7x, findFirstImage 5x, JSON parsing 11x). A service layer makes domain logic testable, eliminates duplication, and provides the interfaces defined in the DDD plan.

### 5. Nominatim integration from day one
Use the existing CitySearch component as a starting point. Integrate Nominatim for location autocomplete in prompt creation, scoped to Berlin.

**Why:** The shared infrastructure guide says "use OpenStreetMap/Nominatim from day one. Don't start with Google Maps and plan to migrate later." The existing CitySearch.svelte already calls Nominatim, so we're adapting rather than building from scratch.

## Implementation Sequence

### Steps 1-3: First Shippable Milestone — "A prompt can be created and discovered"

These three steps form one deliverable. You can't verify the schema without endpoints, and you can't see prompts without the discover feed.

### Step 1: Foundation — Schema + Domain Types + Service Skeleton

**Database:**
- Create `prompts` table (id, author_id, title, body, cover_image_url, state, published_at, archived_at, created_at)
- Create `time_slots` table (id, prompt_id, start_time, duration_minutes, exact_location JSONB, general_area, state)
- Create `locations` type or structured JSONB within time_slots (place_id, name, address, lat, lng, general_area, region)
- RLS policies for prompts and time_slots

**Domain types:**
- `src/lib/domain/types.ts` — Prompt, TimeSlot, LocationRef, PromptState enum
- `src/lib/domain/prompt.ts` — State machine (draft → published → archived), guard functions, transition validators

**Service interfaces:**
- `src/lib/services/prompt-query.ts` — PromptQueryService interface + Supabase implementation
- `src/lib/services/prompt-command.ts` — PromptCommandService interface + Supabase implementation

**Shared utilities (extract from existing code):**
- `src/lib/server/username-lookup.ts` — buildUsernameMap (deduplicate from 7+ call sites)
- `src/lib/server/parse-body.ts` — parseJsonBody (deduplicate from 11 call sites)
- `src/lib/server/auth.ts` — requireAuth, requireAdmin (deduplicate)

### Step 2: Prompt CRUD — Backend

**API endpoints:**
- `POST /api/prompts` — create draft
- `PATCH /api/prompts/[id]` — update content, cover image
- `POST /api/prompts/[id]/publish` — publish with time slots + locations
- `PATCH /api/prompts/[id]/slots` — edit/remove unlocked slots
- `POST /api/prompts/[id]/unpublish` — voluntary unpublish
- `POST /api/prompts/[id]/republish` — republish with new slots
- `DELETE /api/prompts/[id]` — delete draft

**Location service:**
- `src/lib/services/location.ts` — Nominatim integration, general area derivation from coordinates
- Adapt existing CitySearch.svelte for the prompt creation flow
- Region scoping (Berlin for now)

### Step 3: Discover Feed — Backend

**Rewrite discover page server load:**
- Query `prompts` table instead of `canvases` with `is_conversation=true`
- Query `time_slots` table with proper joins (no more JSON parsing)
- Filter: published state, has future time slots, within region
- Per-user slot filtering: hide slots where user has existing meeting
- Use PromptQueryService, not inline Supabase calls

**Map view data:**
- Return general areas with coordinates for map pins
- Adapt existing MapView.svelte (Leaflet + OSM)

### Step 4: Comments + Meeting Invitations — Backend

**Extend schema:**
- New `comments` table (consistent with fresh-start approach for prompts: id, prompt_id, author_id, body, edited, created_at, updated_at, unique on prompt_id + author_id)
- Evolve `meeting_invitations` table: change status enum, add selected_slot_id FK, add resolved_at, add comment_id FK

**New services:**
- `src/lib/services/comment.ts` — CommentService (create, edit)
- `src/lib/services/meeting-invitation.ts` — create, withdraw, expire logic

**API endpoints:**
- `POST /api/prompts/[id]/comments` — create comment
- `PATCH /api/comments/[id]` — edit comment
- `POST /api/prompts/[id]/invite` — create invitation (select slot + message)
- `DELETE /api/invitations/[id]` — withdraw invitation

**Timer/cron:**
- Slot expiry: expire invitations 12h before slot start time
- Prompt archival: archive prompts with no valid future slots

### Step 5: Meetings — Backend

**New schema:**
- Create `meetings` table (split from meeting_invitations)
- Create `cancellation_records` table

**Services:**
- `src/lib/services/meeting.ts` — MeetingFactory (createFromInvitation), cancel (with tier logic), state transitions
- Slot acceptance: hide accepted slot, create meeting, reveal exact location

**API endpoints:**
- `POST /api/invitations/[id]/accept` — accept invitation → create meeting
- `POST /api/meetings/[id]/cancel` — cancel with tier logic (symmetric)

### Step 6: Feedback + Gate — Backend

**Extend schema:**
- Evolve `meeting_feedback` → proper `feedback_forms` table with all fields (share_with_person, share_with_platform, state machine, locked_at)
- Create `reputation_signals` table
- Create `adjective_vocabulary` table (seed with initial set)

**Services:**
- `src/lib/services/feedback.ts` — FeedbackLifecycle (create forms, submit, edit, lock, reveal)
- `src/lib/services/reputation.ts` — ReputationService (record feedback, record cancellation, get signals)
- `src/lib/services/gate.ts` — GateEnforcement (check gate, used in hooks.server.ts)

**Feedback gate middleware:**
- In `hooks.server.ts`: check for overdue feedback on every request
- Hard block: redirect to feedback form if gate is active
- Activates immediately when meeting start time passes

### Step 7: Profile + Notifications — Backend

**Extend profiles:**
- Add `state` enum (active/suspended/deleted), `deleted_at`, `region`
- Expand notifications table with all planned types

**Services:**
- `src/lib/services/profile.ts` — ProfileQueryService (public/private profile views)
- `src/lib/services/notification.ts` — NotificationService (create, mark read)

**Account deletion:**
- Soft-delete with cascade logic (auto-cancel meetings, release feedback gates, mark email for reputation)

### Step 8: Admin + Moderation — Backend

**New schema:**
- Create `moderation_cases` table

**Services:**
- Admin endpoints for reviewing contacts, managing prompts, suspending users
- Moderation case auto-creation (no-show reports, repeated cancellations)
- "Share with platform" feedback routing to admin

## What Stays Unchanged During This Work

- The canvas component and all canvas-related routes continue working
- The canvases table is not modified
- Registration/login flows continue as-is (Supabase Auth stays)
- The landing page continues rendering from existing data
- Existing follows, bookmarks, notifications continue working (notifications table will get additive schema changes in Step 7 — existing types unaffected)

## Resolved Questions

- **Prompt editor UI**: Reuse TipTap. Already integrated, has server-side rendering, adapt existing editor for prompt writing.
- **Timer infrastructure**: Supabase pg_cron. PostgreSQL cron jobs for time-based state transitions (slot expiry, prompt archival, invitation expiry). No external infrastructure.
- **Image resize**: Cloudflare Image Resizing. Zero backend code changes, transforms on CDN edge. Requires Cloudflare Pro plan.

## Open Questions

- **General area derivation**: Exact algorithm for converting coordinates to neighbourhood/postcode. Nominatim reverse geocoding returns structured address data including suburb/neighbourhood — need to decide which level of granularity to show (postcode? neighbourhood name? district?).

## Sources

- DDD plan: `docs/plans/2026-03-24-feat-domain-driven-design-plan.md`
- Design principles: `docs/design/design-principles.md`
- Shared infrastructure guide: `docs/design/shared-infrastructure-opportunities.md`
- User stories: `docs/stories/001-004`
- Full codebase review: conducted 2026-03-24 (TypeScript, security, performance, architecture, simplicity agents)
