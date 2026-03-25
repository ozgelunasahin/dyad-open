---
id: "048"
priority: p2
status: pending
area: domain
created: 2026-03-25
---

# Extract hardcoded constants into a configuration layer

## Problem

Domain and service constants are scattered as module-level `const` values across multiple files. This makes them hard to discover, tune, or override per environment.

## Constants to extract

| Constant | File | Value | Purpose |
|----------|------|-------|---------|
| `ROLLING_WINDOW_DAYS` | `domain/prompt.ts` | 7 | How far ahead slots can be scheduled |
| `MIN_SLOTS` | `domain/prompt.ts` | 1 | Minimum slots to publish |
| `MAX_SLOTS` | `domain/prompt.ts` | 3 | Maximum slots per prompt |
| `INVITATION_CUTOFF_HOURS` | `domain/time-slot.ts` | 12 | Hours before slot start when invitations close |
| `SNIPPET_LENGTH` | `services/prompt-query.ts` | 200 | Body text excerpt length for discover feed |
| `NOMINATIM_BASE` | `services/location.ts` | nominatim URL | Geocoding API base URL |
| `USER_AGENT` | `services/location.ts` | dyad.berlin/0.1 | Nominatim User-Agent header |
| `RATE_LIMIT_MS` | `services/location.ts` | 1000 | Nominatim rate limit interval |
| `regionBounds` | `services/location.ts` | Berlin bbox | Region boundary for location validation |

## Suggested approach

Create `src/lib/config.ts` (or `src/lib/domain/config.ts`) that exports all domain/service constants from one place. Environment-specific overrides (e.g. self-hosted Nominatim URL) could come from env vars.
