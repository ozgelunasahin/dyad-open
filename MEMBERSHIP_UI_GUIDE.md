# Membership UI/UX — contributor guide

This branch is for working on the **membership surfaces** (the screens members and
operators see). It's written so a focused assistant — or anyone — can drive a safe
PR without needing the whole picture. Read this top to bottom once before changing
anything.

## 1. What's already built — do NOT touch

The membership *machinery* is merged and working. **None of it is your job here:**

- migrations (`supabase/migrations/*`), row-level security, the Stripe webhook,
  the Stripe client, the gate logic (`require-membership.ts`, `app.gating_allows`,
  `accept_invitation`). **Do not edit these.** Changing them needs review by a
  senior maintainer, not this PR.

Your job is the **surfaces and the words**: the `/membership` page, the inline
prompts shown when an action is gated, the copy, and resolving the listed UX edge
cases. Surfaces only.

## 2. See every state in the running app

```
npm run setup     # once: starts local Supabase + seeds
npm run dev        # run the app
```

Open **`/dev/membership`** (this route only exists in dev — it 404s in production).
It links to the **real** `/membership` page in every state and shows the exact
gated-action prompt wording. Use it to see what you're changing as you change it.

States you can view: `guest` · `lapsed` · `active` (subscription) · `lifetime` ·
`comp` (granted) · `confirming` (just paid) · `cancelled`.

## 3. Your worklist — the UX edge cases

Each row is a decision the founders make and you implement on the surfaces. The
ones marked **server** are NOT for this PR (they need migrations/RLS/flow changes)
— note them, don't implement them here.

| # | The surface decision | Where it lives |
|---|----------------------|----------------|
| E4 | A new person meets membership only as a 403 — add a `/membership` nav entry? onboarding step? | `FloatingNav.svelte`, `discover` |
| E9 | A lapsed member can cancel/feedback but not accept — show that state *before* the 403 | `meetings/[id]/+page.svelte`, copy |
| E11·a | Post-feedback CTA should send a lapsed member to `/membership`, not discover | `MeetingFeedbackModal.svelte`, copy |
| E16 | "Guest" means two things on `/membership` — pick distinct words | `copy.ts` (membership section) |
| E13–E15 | wording of renew vs join; lapsed-member email wording | `copy.ts`, `membership-error.ts` |
| E1–E3, E5, E12 | **server** — access-window / conference / gathering-host / feedback-deadlock. **Flag, don't code here.** | (review path) |

The full reasoning for each E# is in the edge-case register (ask the maintainer for
`docs/notes/2026-06-26-membership-ux-edge-cases.md` — it's an internal doc).

## 4. Files you may touch

- `src/routes/(app)/membership/+page.svelte` / `+page.server.ts` — the page.
- `src/routes/(app)/conversations/[id]/+page.svelte` — the gated-action prompts (respond / invite / accept).
- `src/lib/utils/membership-error.ts` — maps the gate response to member copy.
- `src/lib/copy.ts` → the `membership` section — **all** user-facing words.
- `src/routes/(app)/dev/membership/` — the states viewer (extend it if you add a state).

## 5. Hard rules

1. **All user-facing words live in `copy.ts`.** Never hardcode a string in a component.
2. **Use design tokens** from `src/app.css` (`--space-*`, `--text-*`, `--radius-*`, `--color-*`). No raw `px` or hex.
3. **Never show a member an internal token or field name.** The gate returns
   `membership_required`; the member must see human copy. The mapping is
   `membership-error.ts` — route through it.
4. **Never serialize `payment_ref` or `stripe_*` to the client.** Loaders select only
   safe display columns; keep it that way.
5. **Don't touch migrations, RLS, the webhook, or the gate logic.** If an edge needs a
   server change, write a one-line note in the PR and stop — don't implement it.
6. Use **they/them** in any user-facing copy that refers to a person in the third person.

## 6. Workflow for each change

1. Pick one edge case. Open its file. View the state at `/dev/membership`.
2. Make the **smallest** change. Words → `copy.ts`. Layout → tokens.
3. Verify your change:
   - `npm run check` — **must report 0 errors.**
   - Lint **only the files you touched**: `npx eslint "src/routes/(app)/membership/+page.svelte"` (etc.) — must be clean. Do **not** run repo-wide `npm run lint`; it reports pre-existing warnings in files you didn't touch and will mislead you.
   - `npm run test` — must pass.
4. Commit, conventional message, **one edge case per commit**: `fix(membership-ui): renew-vs-join copy (E16)`.
5. Update the PR description: what changed, which `E#` it resolves.

## 7. Common mistakes to avoid

- Inventing new gating or server behaviour. (Surfaces only.)
- "Fixing" the **server** edges (E1–E3, E5, E12) in this PR — flag them instead.
- Reformatting files you didn't change.
- Adding dependencies.
- Hardcoding copy or pixel values.

If a change feels like it needs a migration, an RLS policy, or webhook logic — it's
out of scope for this branch. Note it and move on.
