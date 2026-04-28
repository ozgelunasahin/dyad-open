#!/usr/bin/env bash
#
# check-supabase.sh — verify local Supabase is reachable before tests run.
#
# Called by `pretest:integration` so running `npm run test:integration`
# without Supabase up fails fast with a clear message, not with a noisy
# "Failed to sign in" error from inside vitest.
#
# Exits 0 if reachable, 1 otherwise.

set -euo pipefail

API_URL="${PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"

# Safety: don't let this script accidentally probe a production host.
if [[ "$API_URL" != http://127.0.0.1* && "$API_URL" != http://localhost* ]]; then
	echo "error: PUBLIC_SUPABASE_URL is '$API_URL' — this health check only runs against localhost." >&2
	echo "       Unset PUBLIC_SUPABASE_URL or point it at http://127.0.0.1:54321 before running tests." >&2
	exit 1
fi

if ! curl -sf -o /dev/null -m 3 "${API_URL}/rest/v1/" -H "apikey: anon" 2>/dev/null \
	&& ! curl -s -o /dev/null -w '%{http_code}' -m 3 "${API_URL}/rest/v1/" | grep -qE '^(200|401|404)$'; then
	echo "error: local Supabase is not responding at ${API_URL}." >&2
	echo "" >&2
	echo "To start it:" >&2
	echo "  npm run setup          # first-time setup: start + reset + seed" >&2
	echo "  npx supabase start     # if already set up, just bring containers up" >&2
	echo "" >&2
	echo "Then regenerate the env and re-run:" >&2
	echo "  npm run db:env" >&2
	echo "  npm run test:integration" >&2
	exit 1
fi

echo "supabase ok — ${API_URL}"
