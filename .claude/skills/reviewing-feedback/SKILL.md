---
name: reviewing-feedback
description: Review and triage user feedback from the dyad.berlin app. Use when the user asks to check feedback, review bug reports, or triage feature requests.
---

# Reviewing Feedback

Review user feedback submitted through the in-app feedback system and decide how to act on each item.

## Quick Start

```bash
npm run feedback                                    # Show new feedback items
npm run feedback -- --all                           # Show all feedback
npm run feedback -- --json                          # Get JSON for processing
npm run feedback -- update <id> <status> [notes]    # Update feedback status
```

## Workflow

### 1. Fetch New Feedback

Run `npm run feedback` to see items with status `new`.

### 2. For Each Item, Evaluate

**Bug Reports (🐛)**
- Can I reproduce it based on the context?
- Is the description clear enough to act on?
- What's the severity? (blocks usage vs minor annoyance)

**Feature Requests (✨)**
- Does it align with the product vision?
- How much effort vs impact?
- Is there already a plan for this?

**Other (💬)**
- Is this actually a bug or feature in disguise?
- Is it general feedback or actionable?

### 3. Decide on Action

| Decision | Status | Action |
|----------|--------|--------|
| Will fix soon | `in_progress` | Create task, start work |
| Will fix later | `reviewed` | Add to backlog with notes |
| Need more info | `reviewed` | Note what's unclear |
| Won't do | `wont_fix` | Explain reasoning in notes |
| Already fixed | `resolved` | Note when it was fixed |

### 4. Update Status

Use the update command:

```bash
npm run feedback -- update <id> <status> [notes]
```

**Status options:** `new`, `reviewed`, `in_progress`, `resolved`, `wont_fix`

**Examples:**
```bash
npm run feedback -- update abc123 resolved "Fixed in commit xyz"
npm run feedback -- update def456 reviewed "Backlog for v2"
npm run feedback -- update ghi789 wont_fix "Out of scope"
```

## Context Fields

Each feedback item includes captured context:

| Field | Description |
|-------|-------------|
| `focusedCardId` | Which note card was active |
| `cardCount` | How many cards were open |
| `camera` | Pan/zoom position (x, y, zoom) |
| `viewport` | Screen size (width x height) |
| `userAgent` | Browser info |
| `recentErrors` | Console errors before submission |

Use this context to:
- Reproduce bugs in similar conditions
- Understand what the user was doing
- Identify if errors preceded the report

## Status Values

- `new` - Just submitted, needs review
- `reviewed` - Looked at, decision made
- `in_progress` - Actively being worked on
- `resolved` - Fixed/implemented
- `wont_fix` - Declined with explanation

## Example Review Session

```
📬 Reviewing feedback...

🐛 [BUG] Camera jumps when opening links
   Context: 3 cards, zoom=0.8, Chrome
   → Reproduce: Open note with multiple links, click one
   → Status: in_progress, creating fix

✨ [FEATURE] Add keyboard shortcut for new note
   → Already planned for v2
   → Status: reviewed, notes: "Planned for keyboard shortcuts epic"

🐛 [BUG] Can't save note
   Context: recentErrors: [TypeError: undefined is not a function]
   → Error captured! Check the stack trace
   → Status: in_progress, high priority
```

## Guidelines

- Always read the full description before deciding
- Check `recentErrors` for bugs - often reveals the cause
- Add clear notes explaining your decision
- If unsure, mark as `reviewed` with questions in notes
- Batch similar feedback items together
- **Mark items as you review them** - don't leave items in `new` status after reviewing
- Use `--json` to get full context details including all errors
