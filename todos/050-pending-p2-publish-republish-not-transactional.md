---
id: "050"
priority: p2
status: pending
area: services
tags: [data-integrity, code-review]
created: 2026-03-25
---

# publish/republish not transactional

publish() and republish() in PromptCommandService insert slots before updating state. If state update fails, orphan slots exist. Supabase JS doesn't support transactions natively — need RPC function or reverse the operation order.
