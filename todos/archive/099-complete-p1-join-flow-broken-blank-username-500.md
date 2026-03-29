---
status: pending
priority: p1
issue_id: "099"
tags: [code-review, bug, auth, v0.1-blocker]
---

# Join flow broken — blank username + 500 on conversations

## Problem Statement

After completing the invitation signup flow (via generated link), the user lands on discover with a blank username (shows `@` with nothing after it). Clicking any conversation gives a 500 error. This is a v0.1 blocker — the entire onboarding flow is broken.

## Findings

- User tested the invitation + approval flow (minus email integration)
- Generated link works and brings to discover
- Username is blank on discover page
- 500 error when clicking any conversation

## Technical Details

- Affected flow: `/join` → signup → redirect to `/discover`
- Likely cause: profile not being created during signup, or username not populated
- The `confirm_user_email` + signup flow may not be creating the profile row correctly
- Could also be a race condition between auth confirmation and profile creation

## Acceptance Criteria

- [ ] After signup via invite link, username displays correctly on discover
- [ ] All conversations are accessible after signup (no 500 errors)
- [ ] Profile row exists with username after signup completes
