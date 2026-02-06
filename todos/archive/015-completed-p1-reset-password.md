---
id: "015"
status: completed
priority: p1
title: "Implement password reset flow"
created: "2026-01-19"
---

# Password Reset Flow

## Problem
Users have no way to reset their password if they forget it.

## Solution
Implement Supabase password reset flow:

1. Add "Forgot password?" link on login page
2. Create reset request form (enter email)
3. Handle the reset callback from Supabase email link
4. Show "set new password" form

## Files to modify
- `src/routes/login/+page.svelte` - Add "Forgot password?" link, maybe a reset mode
- `src/routes/login/+page.server.ts` - Add `resetPassword` action using `supabase.auth.resetPasswordForEmail()`
- `src/routes/auth/callback/+server.ts` - Handle `type=recovery` in callback, redirect to password update page
- May need `src/routes/auth/update-password/+page.svelte` for setting new password

## Supabase methods
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })` - sends reset email
- `supabase.auth.updateUser({ password })` - sets new password after callback
