---
review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle, architecture-strategist]
plan_review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer]
---

# Review Context

SvelteKit app with Svelte 5 runes. Supabase backend. d3-zoom for canvas.

## Architectural Constraints
- canvasStore is a singleton — flag any code that assumes multiple instances
- Map/Set mutations must use copy-on-write for Svelte 5 reactivity
- d3-zoom cleanup is critical — verify .on('.zoom', null) on unmount
- Generation counters (`initGeneration`, `activationGeneration`) guard async races

## Design Alignment Checks
When reviewing new features or architectural changes, verify alignment with:
- **EU sovereignty**: Prefer self-hostable, EU-hosted dependencies. No US cloud lock-in (Google Maps, AWS, SendGrid). See `docs/design/shared-infrastructure-opportunities.md` — architectural decisions section.
- **Extract early**: Location, notifications, calendar, and data export should be built as modules with clean API boundaries, not tightly coupled to the app.
- **Interoperability**: Identity should be OIDC-compatible for future DID/VC support. Reputation should remain as discrete signals (not scores) to enable future Verifiable Credential issuance. See `docs/design/interoperability-and-open-infrastructure.md`.
- **Design principles**: No pre-meeting contact, healthy brain (minimal notifications), feedback gate, symmetric cancellation, enabler of in-person community. See `docs/design/design-principles.md`.
