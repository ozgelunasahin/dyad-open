---
id: "053"
priority: p2
status: pending
area: services
tags: [performance, code-review]
created: 2026-03-25
---

# Nominatim optimization

deriveGeneralArea makes sequential Nominatim calls (1 req/sec rate limit) during publish — 3+ seconds for 3 slots. The neighbourhood data is already in the searchLocations response. Should pre-compute at location-selection time. Also: module-level rate limiter doesn't work on serverless (per-isolate state).
