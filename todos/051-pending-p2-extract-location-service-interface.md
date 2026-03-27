---
id: "051"
priority: p2
status: pending
area: services
tags: [architecture, code-review]
created: 2026-03-25
---

# Extract LocationService interface

LocationService exports bare functions instead of an interface like the other services. PromptCommandService imports deriveGeneralArea/validateRegion directly, creating hard coupling. Should be injectable via constructor. This is the one service the sovereignty docs call out as "extract early, not late."
