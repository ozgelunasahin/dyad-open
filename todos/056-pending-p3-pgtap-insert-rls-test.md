---
id: "056"
priority: p3
status: pending
area: testing
tags: [testing, security, code-review]
created: 2026-03-25
---

# pgTAP INSERT RLS test

pgTAP tests don't verify INSERT enforcement — can user B insert a prompt with author_id = user A? RLS should prevent this but it's untested. Also worth testing: SELECT on exact_location column via direct table access vs view.
