# Resend segment sync

Keeps three Resend audience segments — `waitlist`, `invited`, `member` — in step
with Supabase, with **Supabase as the source of truth**. This is **membership
sync only**: it moves contacts between segments and never sends email. It pushes
**only the email address** to Resend — no name, city, or other personal data
(see CLAUDE.md "Data Collection and Values"; enrichment would be a new data use
needing a `/datenschutz` decision).

```
contacts    INSERT/UPDATE/DELETE ─┐
invitations INSERT/UPDATE/DELETE ─┼─▶ Supabase DB Webhook ─▶ POST /api/webhooks/resend-sync ─▶ Resend segments
profiles    UPDATE (onboarded)  ──┘     (x-webhook-secret)        (contact_segment RPC)            (no email sent)
```

The handler recomputes the segment from the DB (via `contact_segment(email)`)
rather than trusting which table fired, so it's idempotent — any of the three
triggers converges on the same answer.

## Segment authority

`contact_segment(email)` (migration `20260619120100_contact_segment.sql`) is the
single source of truth, precedence highest-first:

| Segment    | Condition |
|------------|-----------|
| `member`   | confirmed `auth.users` account **and** `profiles.onboarded = true` |
| `invited`  | an `invitations` row exists for the email |
| `waitlist` | a `contacts` row exists for the email |
| (removed)  | email unknown → contact removed from all managed segments |

`member` depends on `profiles.onboarded`, which is set by the onboarding-persistence
change (`mark_self_onboarded()`). Until that lands, no one resolves to `member`,
which is correct.

## Configuration

Environment variables (see `.env.example`):

| Var | Purpose |
|-----|---------|
| `RESEND_API_KEY` | Resend API key (already used for transactional email). |
| `RESEND_SEGMENT_WAITLIST` / `_INVITED` / `_MEMBER` | Segment ids from Resend → Audiences → Segments. |
| `RESEND_SYNC_SECRET` | Long random string; shared with the Supabase webhook's `x-webhook-secret` header. |
| `SUPABASE_SERVICE_ROLE_KEY` | Already required; the handler uses it to read the DB. |

If `RESEND_API_KEY` or any segment id is unset, the handler accepts webhooks and
no-ops (so a preview deploy doesn't retry forever).

## Wiring the Supabase Database Webhooks

In the Supabase dashboard → Database → Webhooks, create **three** webhooks
(one each for `contacts`, `invitations`, `profiles`), all identical except the table:

- Events: Insert, Update, Delete (Update alone is enough for `profiles`).
- Type: HTTP Request, method `POST`.
- URL: `https://dyad.berlin/api/webhooks/resend-sync`
- HTTP header: `x-webhook-secret: <RESEND_SYNC_SECRET>`

## Initial backfill

After wiring the webhooks, reconcile everyone already in the DB:

```bash
npm run sync:resend -- --dry-run   # preview computed segments, no Resend writes
npm run sync:resend                # perform the reconcile
```

The script pages through `contacts` + `invitations`, computes each segment, and
reconciles Resend. It's idempotent and prints any emails that failed so a re-run
targets just those (it exits non-zero if any failed).

## Verifying

```sql
-- segment distribution
SELECT contact_segment(email) AS seg, count(*)
FROM (SELECT email FROM contacts UNION SELECT email FROM invitations) e
GROUP BY 1 ORDER BY 1;

-- a confirmed, onboarded account should resolve to 'member'
SELECT contact_segment('someone@example.com');
```

## What this is not

It does not send email, and it does not delete Resend contact records — on
removal it strips segment membership only. A GDPR erasure request that must also
remove the Resend contact is a separate, manual step.
