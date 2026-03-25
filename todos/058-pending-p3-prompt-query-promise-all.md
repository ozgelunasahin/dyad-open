---
id: "058"
priority: p3
status: pending
area: services
tags: [performance, code-review]
created: 2026-03-25
---

# Parallelize prompt query with Promise.all

getPublishedPrompts makes 3 sequential DB queries. Queries 2 (slots) and 3 (usernames) are independent — use Promise.all. Easy 20-50ms savings per request. Also: discover index should cover sort order: (region, published_at DESC) WHERE state = 'published'.
