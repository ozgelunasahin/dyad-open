---
id: "054"
priority: p2
status: pending
area: api
tags: [code-review]
created: 2026-03-25
---

# Typed errors and proper HTTP status codes

All API catch blocks return 400. Service errors should use typed error classes (NotFoundError, ValidationError, etc.) so API layer can map to proper HTTP status codes (404, 422, 500). Also: error messages currently leak DB internals to client.
