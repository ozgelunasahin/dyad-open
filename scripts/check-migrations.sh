#!/usr/bin/env bash
#
# Migration safety gate — runs on every PR that touches supabase/migrations/**.
#
# Why this exists: migrations only reach the remote via `supabase db push` in the
# Migrate workflow, which runs POST-merge on `main` — so a migration that can't
# be pushed has historically failed silently after merge, never blocking the PR.
# (See the June 2026 incident: a non-idempotent `ADD COLUMN` wedged db push for
# ~2 weeks because the column already existed on the remote.)
#
# This gate moves two deterministic, credential-free checks to the PR:
#   1. Filename parses as a migration version (else the CLI SILENTLY SKIPS it).
#   2. DDL is idempotent, so `db push` is a true no-op on re-run / under drift
#      and can never wedge on "already exists".
#
# Scoped to migrations CHANGED in the PR (diff vs base) — history is grandfathered.
# Run locally: bash scripts/check-migrations.sh [base-ref]   (default origin/main)
set -euo pipefail

BASE="${1:-origin/main}"
MIG_DIR="supabase/migrations"

# Resolve the diff base; fall back to HEAD~1 if the ref is unavailable (local use).
if ! git rev-parse --verify "$BASE" >/dev/null 2>&1; then
	BASE="HEAD~1"
fi

# Two-dot diff (base vs working tree) so this catches both committed PR changes
# in CI and not-yet-committed migrations when run locally.
mapfile -t changed < <(git diff --name-only --diff-filter=AM "$BASE" -- "$MIG_DIR" | grep '\.sql$' || true)

if [ "${#changed[@]}" -eq 0 ]; then
	echo "No changed migrations vs $BASE — nothing to check."
	exit 0
fi

violations=0
note() { echo "  ✗ $1"; violations=$((violations + 1)); }

for f in "${changed[@]}"; do
	[ -f "$f" ] || continue
	base=$(basename "$f")
	echo "checking $f"

	# 1. Filename must parse as <14-digit timestamp>_<snake_name>.sql. The Supabase
	#    CLI keys the migration tracker on the leading digits; a letter suffix
	#    (e.g. 20260401b_...) or short date is silently skipped or collides.
	if [[ ! "$base" =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
		note "filename '$base' must be YYYYMMDDHHMMSS_snake_name.sql (CLI silently skips others)"
	fi

	# Strip line comments so commented examples don't trip the checks.
	sql=$(sed 's/--.*$//' "$f")
	low=$(printf '%s' "$sql" | tr '[:upper:]' '[:lower:]')

	# 2. Idempotency: each create/alter must tolerate re-application.
	if grep -Eq 'add[[:space:]]+column' <<<"$low" && ! grep -Eq 'add[[:space:]]+column[[:space:]]+if[[:space:]]+not[[:space:]]+exists' <<<"$low"; then
		note "ADD COLUMN must be 'ADD COLUMN IF NOT EXISTS'"
	fi
	if grep -Eq 'create[[:space:]]+table' <<<"$low" && ! grep -Eq 'create[[:space:]]+table[[:space:]]+if[[:space:]]+not[[:space:]]+exists' <<<"$low"; then
		note "CREATE TABLE must be 'CREATE TABLE IF NOT EXISTS'"
	fi
	if grep -Eq 'create[[:space:]]+(unique[[:space:]]+)?index' <<<"$low" && ! grep -Eq 'create[[:space:]]+(unique[[:space:]]+)?index[[:space:]]+if[[:space:]]+not[[:space:]]+exists' <<<"$low"; then
		note "CREATE INDEX must be 'CREATE INDEX IF NOT EXISTS'"
	fi
	if grep -Eq 'create[[:space:]]+function' <<<"$low" && ! grep -Eq 'create[[:space:]]+or[[:space:]]+replace[[:space:]]+function' <<<"$low"; then
		note "CREATE FUNCTION must be 'CREATE OR REPLACE FUNCTION'"
	fi
	# Triggers/policies have no IF NOT EXISTS: require OR REPLACE (PG14+) or a DROP guard.
	if grep -Eq 'create[[:space:]]+trigger' <<<"$low" \
		&& ! grep -Eq 'create[[:space:]]+or[[:space:]]+replace[[:space:]]+trigger' <<<"$low" \
		&& ! grep -Eq 'drop[[:space:]]+trigger[[:space:]]+if[[:space:]]+exists' <<<"$low"; then
		note "CREATE TRIGGER needs 'CREATE OR REPLACE TRIGGER' or a preceding 'DROP TRIGGER IF EXISTS'"
	fi
	if grep -Eq 'create[[:space:]]+policy' <<<"$low" && ! grep -Eq 'drop[[:space:]]+policy[[:space:]]+if[[:space:]]+exists' <<<"$low"; then
		note "CREATE POLICY needs a preceding 'DROP POLICY IF EXISTS' (policies have no IF NOT EXISTS)"
	fi
done

echo ""
if [ "$violations" -gt 0 ]; then
	echo "✗ $violations migration issue(s). Migrations must be idempotent so 'db push'"
	echo "  re-runs cleanly even when the remote already has the object (drift)."
	exit 1
fi
echo "✓ changed migrations are well-named and idempotent."
