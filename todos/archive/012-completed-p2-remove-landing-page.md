---
id: "012"
status: completed
priority: p2
title: "Remove landing page and immediately show login"
created: "2026-01-19"
---

# Remove Landing Page

## Problem
The current landing page adds an extra step before users can log in. For a focused tool, going directly to login is more efficient.

## Solution
Remove or bypass the landing page and redirect unauthenticated users directly to the login page.

## Files to modify
- `src/routes/+page.svelte` - Landing page (remove or redirect)
- `src/hooks.server.ts` - May need to handle root route redirect
