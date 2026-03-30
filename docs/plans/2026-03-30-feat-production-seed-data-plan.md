---
title: "feat: Production seed data — archetype-voiced prompts with real images"
type: feat
status: active
date: 2026-03-30
---

# Production Seed Data

Replace the dev/test seed prompts with production-quality conversations that demonstrate what dyad is — through the writing itself. Each prompt should read like it was written by a real person, not generated. The discover page is the first thing testers see; it must pass the "would I want to meet this person?" test.

## Why this matters

From `docs/design/user-archetypes.md`:
- **Jackson (seeker)**: "The quality of the writing on the discover page IS the signal." He's deciding whether the community has depth based on what he reads.
- **Deniz (in-betweener)**: "Are the highlighted people representative, or is it a curated front?" Wants to see real people, not polished marketing.
- **Miri (explorer)**: Fears conversations that intellectualise. Needs to see that simple, human writing is welcome too.

The seed data IS the product demo. Generic-sounding prompts will trigger every AI-content detector in people's heads.

## Acceptance Criteria

- [ ] 6–8 published prompts, each written in a distinct voice that maps to an archetype
- [ ] No two prompts by the same "user" — each seed user gets at most one published prompt
- [ ] Cover images from Unsplash with specific Berlin or thematic subjects (not random picsum.photos)
- [ ] Each prompt has 1–2 future time slots in different Berlin neighbourhoods
- [ ] Every prompt has a cover image (Unsplash, not picsum)
- [ ] Body text uses natural sentence rhythm — short sentences mixed with longer ones, occasional fragments, varied paragraph length
- [ ] No prompt uses the word "explore," "journey," "delve," "tapestry," "nuanced," "multifaceted," or "it's important to note"
- [ ] At least one prompt is just 2–3 sentences (not everything needs to be an essay)
- [ ] The test seed (for E2E) stays separate from the production seed — tests must not break

## Voice guidelines (anti-AI tells)

**Do:**
- Start mid-thought, not with a thesis statement
- Use "I" sometimes, "you" sometimes, neither sometimes
- Leave a question genuinely open — don't answer it in the next paragraph
- Reference specific Berlin places, weather, experiences
- Be uneven — one paragraph can be longer, the next just a line
- Use dashes — like this — instead of always parentheses
- Occasionally break grammar rules the way real people do

**Don't:**
- Start with "In a world where..." or "Have you ever wondered..."
- Use three parallel examples in a row (the AI triplet pattern)
- End every paragraph with a question
- Use "ultimately," "fundamentally," "at its core"
- Make every sentence roughly the same length
- Be relentlessly profound — some prompts can be lighter

## Prompt sketches by archetype

### Seeker voice (1–2 prompts)
Dense, referential, but personal. The kind of person who's been turning something over for weeks. Doesn't cite sources but you can tell they've read about it. Example mood: "I keep coming back to this thing about how we decide what's true..."

### Explorer voice (1–2 prompts)
Looser, more sensory. Starts from a moment, not an idea. Shorter. Might reference a walk, a train ride, a café. Not trying to sound smart. Example mood: "Sat in Görlitzer Park yesterday and watched two strangers share a bench for an hour without talking..."

### Gatherer voice (1 prompt)
Practical and warm. Comes from experience organising or facilitating. References community work, bridging divides. Has a directness that comes from doing, not theorising. Example mood: "I run a neighbourhood group and I've noticed we keep having the same conversation with the same people..."

### In-betweener voice (1–2 prompts)
Between things. Honest about not knowing. Might reference being new to Berlin, or being between identities, or having recently left something. Resists categorisation. Example mood: "Moved here eight months ago and still haven't figured out if this is home or just somewhere I am..."

## Images

Replace `picsum.photos/seed/...` URLs with Unsplash direct links. Mix of subjects — not exclusively Berlin:
- Some Berlin (Spree, U-Bahn, Tempelhofer Feld, bridges)
- Some universal (hands on a table, rain on glass, an empty chair, a worn book)
- Some nature/atmospheric (fog, light through trees, water)
- Some unexpected (a map with coffee stains, a kitchen counter, shoes by a door)

Use Unsplash's direct URL format: `https://images.unsplash.com/photo-{id}?w=800&h=400&fit=crop`

Every prompt must have a cover image.

## Implementation

### Separate production seed from test seed

Create a new file: `supabase/seed-production.sql`

This file:
- Inserts 4–6 "real" users into auth.users + profiles (distinct from the 8 test users)
- Inserts 6–8 published prompts with varied body text
- Inserts time slots in real Berlin locations
- Does NOT create meetings, invitations, feedback forms, or comments — the testers create those

The existing `supabase/seed.sql` (test data) stays untouched. It's used by `supabase start` locally and in CI.

### Running against production

```bash
# Apply production seed to remote Supabase
npx supabase db execute --file supabase/seed-production.sql
```

Or paste into the Supabase SQL editor on the dashboard.

### Cleanup before seeding

If the production DB already has stale seed data, delete the old seed prompts first:
```sql
-- Remove old picsum-based seed prompts (identifiable by seed- prefix IDs)
DELETE FROM time_slots WHERE prompt_id LIKE 'seed-prompt-%';
DELETE FROM prompts WHERE id LIKE 'seed-prompt-%';
```

Production users created through the normal invite flow should NOT be deleted.

## Files

- `supabase/seed-production.sql` (new) — production-quality seed data
- `supabase/seed.sql` — unchanged (test data for CI/local)

## Out of scope

- Responses/comments on seed prompts (testers will create these naturally)
- Meetings or feedback (these emerge from real interactions)
- Non-Berlin regions (v0.2)

## Sources

- User archetypes: `docs/design/user-archetypes.md`
- Design principles (anti-sorting, commons not feed): `docs/design/design-principles.md`
- Current seed data: `supabase/seed.sql`
