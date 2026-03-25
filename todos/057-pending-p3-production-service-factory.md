---
id: "057"
priority: p3
status: pending
area: api
tags: [architecture, code-review]
created: 2026-03-25
---

# Production service factory

Route handlers instantiate SupabasePromptCommandService directly. Should centralize via a factory (similar to tests/helpers/db.ts) so swapping Supabase only requires changing one place in production code too.
