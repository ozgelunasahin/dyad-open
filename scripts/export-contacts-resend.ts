/**
 * Export contacts from Supabase as a Resend-ready CSV.
 *
 * Includes stage (waitlist / invited / member) so contacts can be
 * imported into the single Resend audience with the correct segment.
 *
 * Usage:
 *   npx tsx scripts/export-contacts-resend.ts
 *
 * Output: contacts-resend-YYYY-MM-DD.csv
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv(path: string): Record<string, string> {
	if (!existsSync(path)) return {};
	const lines = readFileSync(path, 'utf-8').split('\n');
	const env: Record<string, string> = {};
	for (const line of lines) {
		const match = line.match(/^([^#=]+)=(.*)$/);
		if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
	}
	return env;
}

const config = {
	...loadEnv(resolve(process.cwd(), '.env.local')),
	...loadEnv(resolve(process.cwd(), '.env'))
};

const SUPABASE_URL = config.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

function csvEscape(val: string | null | undefined): string {
	if (!val) return '';
	if (val.includes(',') || val.includes('"') || val.includes('\n')) {
		return `"${val.replace(/"/g, '""')}"`;
	}
	return val;
}

async function main() {
	// Fetch all contacts
	const { data: contacts, error: contactsErr } = await admin
		.from('contacts')
		.select('email, name, based_in, created_at')
		.order('created_at', { ascending: true });

	if (contactsErr) { console.error('Failed to fetch contacts:', contactsErr.message); process.exit(1); }
	if (!contacts || contacts.length === 0) { console.log('No contacts found.'); return; }

	// Fetch all invitations to determine stage
	const { data: invitations, error: invErr } = await admin
		.from('invitations')
		.select('email, used_at');

	if (invErr) { console.error('Failed to fetch invitations:', invErr.message); process.exit(1); }

	// Build a map: email → stage
	const inviteMap = new Map<string, 'invited' | 'member'>();
	for (const inv of invitations ?? []) {
		const email = inv.email?.trim().toLowerCase();
		if (!email) continue;
		// member beats invited — don't downgrade
		if (inv.used_at) {
			inviteMap.set(email, 'member');
		} else if (!inviteMap.has(email)) {
			inviteMap.set(email, 'invited');
		}
	}

	// Build CSV rows
	// Resend CSV columns: email, first_name, last_name, data[stage]
	const headers = ['email', 'first_name', 'based_in', 'stage', 'subscribed_at'];
	const rows = contacts.map(c => {
		const email = c.email.trim().toLowerCase();
		const stage = inviteMap.get(email) ?? 'waitlist';
		return [
			csvEscape(email),
			csvEscape(c.name),
			csvEscape(c.based_in),
			stage,
			c.created_at?.slice(0, 10) ?? ''
		].join(',');
	});

	const csv = [headers.join(','), ...rows].join('\n');
	const filename = `contacts-resend-${new Date().toISOString().slice(0, 10)}.csv`;
	writeFileSync(resolve(process.cwd(), filename), csv, 'utf-8');

	// Summary
	const stages = { waitlist: 0, invited: 0, member: 0 };
	for (const c of contacts) {
		const stage = inviteMap.get(c.email.trim().toLowerCase()) ?? 'waitlist';
		stages[stage]++;
	}

	console.log(`Exported ${contacts.length} contact(s) → ${filename}`);
	console.log(`  waitlist: ${stages.waitlist}`);
	console.log(`  invited:  ${stages.invited}`);
	console.log(`  member:   ${stages.member}`);
	console.log(`\nNext: Resend dashboard → Audiences → Dyad → Contacts → Import`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
