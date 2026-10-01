# Request to join (archived)

The request-to-join gate was removed when signup opened to everyone. The full
flow is preserved at the git tag `archive/request-to-join`.

## What the gate was

New accounts could only come from two places:

- **A reviewed request.** Visitors filled in the "Request to join" form at
  `/waitlist` (or the waitlist mode of `AuthDialog` on the landing page):
  why they wanted to join, name, email, city, where they heard of dyad, and two
  acknowledgement cards (Community Standards, Member Agreements). The form
  POSTed to `/api/contact`, which rate-limited by IP, skipped emails that already
  had an account, wrote a `contacts` row and sent a waitlist welcome email. An
  operator reviewed the request at `/admin/waitlist` and sent an invite.
- **A member referral.** `/signup` required `?ref=<username>` and redirected
  to `/` without it.

Group links at `/join` were, and still are, a separate path.

## Why it was removed

Signup is open. Anyone can create an account at `/signup`, and the membership
subscription lives at `/membership`. Reviewing each request by hand is no
longer the gate.

Referrals still work. `?ref=<username>` on any URL is stored in the `dyad_ref`
cookie, and `/signup` records it as `referred_by` on the new profile.

## What changed

Removed:

- `src/routes/(auth)/waitlist/+page.svelte`: the request form
- `src/routes/api/contact/+server.ts`: the submission endpoint
- `src/routes/api/contact/render-waitlist-welcome.ts` and its test: the welcome email
- `src/lib/components/CitySearch.svelte`: only the request form used it
- The `waitlist` mode of `src/lib/components/AuthDialog.svelte` (fields,
  consent cards, submit handler, styles). The dialog now only handles login.
- Copy: the `copy.waitlist` request-form keys, `copy.seo.waitlist`,
  `copy.email.waitlistSubject`, `copy.auth.name`, and the `waitlist_requested`
  analytics event.

Changed:

- `src/routes/(auth)/waitlist/+page.server.ts` (new): permanent 308 redirect
  to `/signup`, keeping the query string so old `/waitlist?ref=` links keep
  their referral.
- `src/routes/(auth)/signup/`: no `ref` required; the heading no longer says
  "You're invited".
- Every `/waitlist` link (landing, login, AuthDialog, zine header and footer,
  `MembershipInvite`, the profile "invite a friend" link) now points to `/signup`.
- `src/lib/seo.ts`: `/waitlist` is no longer a public, sitemapped path.

Still in place:

- The admin plane (`/admin/waitlist`), which lists past requests.
  `copy.waitlist.referralOptions` stays so it can label them.
- The `contacts` table, the `email_is_registered` RPC and the other migrations.
- The Resend `waitlist` segment sync.
- The ATProto "ask to join" path (`/login/atproto`, `/api/atproto/waitlist`).

## How to restore

Check the archived files back out from the tag, then re-add the `/signup` ref
requirement and the links:

```sh
git checkout archive/request-to-join -- \
  'src/routes/(auth)/waitlist/+page.svelte' \
  src/routes/api/contact \
  src/lib/components/CitySearch.svelte \
  src/lib/components/AuthDialog.svelte \
  'src/routes/(auth)/signup/+page.server.ts' \
  'src/routes/(auth)/signup/+page.svelte'
git rm 'src/routes/(auth)/waitlist/+page.server.ts'
```

Then restore the matching copy keys in `src/lib/copy.ts`, the `/waitlist`
entries in `src/lib/seo.ts` and `src/routes/page-titles.test.ts`, and the links
listed above. `git diff archive/request-to-join -- src tests` shows everything
that differs.
