---
id: "052"
priority: p2
status: pending
area: services
tags: [performance, code-review]
created: 2026-03-25
---

# Discover feed post-fetch filtering

getPublishedPrompts fetches N prompts then filters out those with no available slots in JS. Causes under-filled pages as prompts age. Should push availability filtering into the database query. Also: cursor is based on published_at but results re-sorted by soonest_slot — pagination semantics break.
