# Domain Language

How internal domain vocabulary maps to user-facing language.

## Core Principle

The internal domain model uses precise technical terms. User-facing copy uses natural, everyday language. The user should never encounter domain vocabulary.

## Vocabulary Map

| Internal (code/API/DB) | User-facing | Notes |
|------------------------|-------------|-------|
| `prompt` | **conversation** | A "prompt" is the written starting point. A "conversation" is the whole flow — writing, meeting, talking. Users see "conversation" because that is the human experience, not the technical artifact. |
| `time_slot` | **time** / **available time** | "Pick a time" not "select a slot". |
| `LocationRef` | **location** / **place** | Natural language. |
| `author_id` | **you** / **the author** | No IDs or technical references. |
| `body` (TipTap JSON) | *(not named)* | The user writes; they don't "create a body". |
| `body_html` | *(not named)* | Rendered content — invisible to user. |
| `state: draft` | **draft** | This one passes through as-is — "draft" is natural. |
| `state: published` | **published** / **live** | "Your conversation is live on the discover feed." |
| `state: archived` | **archived** / **past** | Could use "past" in future for softer language. |
| `feedback_form` | **feedback** | "How did it go?" not "complete your feedback form". |
| `rating_tags` | *(not named)* | Tags are presented as selectable words, not "ratings". |
| `meeting` | **meeting** | This one passes through — "meeting" is natural. |
| `invitation` | **invitation** / **invite** | Natural. |
| `comment` (DB: `prompt_comments`) | **response** | Writing a response is intentional and direct — it is engagement with the conversation, not a casual comment on public media. The response is the gateway to the invitation: you must write a response before you can invite to meet. The response IS the meeting context. |
| `region` | **city** / *(implicit)* | Berlin is implicit — don't force users to choose. |
| `general_area` | **neighbourhood** | Natural. |
| `exact_location` | **location** / **where to meet** | Only shown after acceptance. |

## Conflicts to Watch

| Situation | Risk | Resolution |
|-----------|------|------------|
| API returns `prompt` in JSON | Frontend must never display raw API field names | Map at the service/component boundary |
| URL paths use `/prompts/` | Users see URLs in browser bar | Acceptable — URLs are technical, users don't read them carefully. Renaming would break bookmarks. |
| Error messages from API use "prompt" | e.g., "Failed to create prompt" | Catch and rephrase at the UI layer: "Something went wrong. Please try again." |
| "Conversation" could mean a chat feature | Users might expect messaging | We don't have messaging. "Conversation" means the in-person meeting. Clarify in onboarding if needed. |
| Design docs reference "canvas" / "note" | Legacy terms from the canvas era | These are internal only and being phased out. |

## Style Guide Alignment

Per `docs/style-guide.md`:
- **Headings** (Title Case): "My Conversations", "Available Times"
- **Buttons/actions** (lowercase): "start a conversation", "publish", "sign out"
- **Badges/labels** (Sentence case): "Draft", "Published", "Archived"

## Inclusive Language

Per `docs/design/design-principles.md`:
- Avoid "thinkers", "intellectuals", "writers" — these exclude
- Use "people", "you", "someone" — these include
- Test: would a nurse, a barista, a retiree feel addressed?
