---
status: pending
priority: p1
issue_id: "090"
tags: [deploy, supabase, infrastructure]
dependencies: []
---

# Remote Supabase deploy checklist

## Problem Statement

Before deploying for invited testers, the remote Supabase instance needs all migrations applied, RPC functions created, storage bucket configured, and seed images uploaded. Currently only local Supabase has the full schema.

## Checklist

- [ ] Apply all migrations (`supabase/migrations/`) to remote Supabase
- [ ] Verify `uploads` storage bucket exists with public read + authenticated write policies
- [ ] Upload seed cover images to remote storage (or confirm testers will upload their own)
- [ ] Verify RPC functions exist: `validate_invitation`, `use_invitation`, `confirm_user_email`, `expire_slot_invitations`, `accept_invitation_and_create_meeting`
- [ ] Audit `confirm_user_email` function security (todo #044) — it's callable with anon key
- [ ] Create sophie/tom test accounts on remote (or verify invite flow works for first real users)
- [ ] Set env vars on Cloudflare Pages: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- [ ] Verify email delivery works (Mailpit is local-only — need real SMTP or Supabase email for remote)
