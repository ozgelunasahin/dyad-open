---
id: "055"
priority: p3
status: pending
area: testing
tags: [testing, code-review]
created: 2026-03-25
---

# Domain layer unit tests

Plan lists domain unit tests as a quality gate. canPublish, canRepublish, isWithinRollingWindow, deriveSlotState are pure functions with injectable `now` — trivially testable but currently untested.
