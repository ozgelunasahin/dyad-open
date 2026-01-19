#!/bin/bash
# Fetch feedback from Supabase
# Usage: ./scripts/fetch-feedback.sh

echo "📬 Fetching feedback from Supabase..."
echo ""

npx supabase db dump --data-only -f /tmp/db_dump.sql 2>/dev/null

# Extract feedback section
awk '/Data for Name: feedback/,/Data for Name:/' /tmp/db_dump.sql | head -30

rm -f /tmp/db_dump.sql
