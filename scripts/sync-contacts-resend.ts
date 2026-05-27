/**
 * Sync all contacts to the correct Resend audience.
 *
 * Sources:
 *   contacts table     → everyone who signed up on the waitlist
 *   invitations table  → used to determine if someone is invited or a member
 *
 * Audiences:
 *   Waitlist  — in contacts table, no invite sent yet
 *   Invited   — invite sent but not yet accepted
 *   Member    — invite accepted (used_at set)
 *
 * Note: invited/member people who weren't on the waitlist form
 * (invited directly) are also included.
 *
 * Usage:
 *   npx tsx scripts/sync-contacts-resend.ts
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
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
const RESEND_API_KEY = config.RESEND_CONTACTS_API_KEY || config.RESEND_API_KEY;

const AUDIENCE_IDS = {
	waitlist: 'd77c7fdc-1413-4e8e-9381-8116f420a0e4',
	invited:  '01e6914a-e7b6-4548-bac2-c885724cbc4a',
	member:   'dff3a185-885f-42f5-be88-c714a58b71bf',
} as const;

type Stage = keyof typeof AUDIENCE_IDS;

if (!SUPABASE_URL || !SERVICE_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}
if (!RESEND_API_KEY) {
	console.error('Missing RESEND_API_KEY in .env');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});
const resend = new Resend(RESEND_API_KEY);

async function addContact(audienceId: string, email: string, firstName?: string) {
	const { error } = await resend.contacts.create({
		audienceId,
		email,
		firstName,
		unsubscribed: false,
	});
	return error;
}

async function main() {
	// Fetch contacts (waitlist signups)
	const { data: contacts, error: contactsErr } = await supabase
		.from('contacts')
		.select('email, name')
		.order('created_at', { ascending: true });

	if (contactsErr) { console.error('Failed to fetch contacts:', contactsErr.message); process.exit(1); }

	// Fetch invitations
	const { data: invitations, error: invErr } = await supabase
		.from('invitations')
		.select('email, used_at');

	if (invErr) { console.error('Failed to fetch invitations:', invErr.message); process.exit(1); }

	// Build stage map from invitations: email → 'invited' | 'member'
	const inviteMap = new Map<string, 'invited' | 'member'>();
	for (const inv of invitations ?? []) {
		const email = inv.email?.trim().toLowerCase();
		if (!email) continue;
		if (inv.used_at) {
			inviteMap.set(email, 'member'); // member beats invited
		} else if (!inviteMap.has(email)) {
			inviteMap.set(email, 'invited');
		}
	}

	// Fetch member names from profiles via auth.users
	const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
	const emailToDisplayName = new Map<string, string>();
	if (authUsers?.users) {
		const userIds = authUsers.users.map(u => u.id);
		const { data: profileRows } = await supabase
			.from('profiles')
			.select('id, display_name')
			.in('id', userIds);
		const profileMap = new Map(profileRows?.map(p => [p.id, p.display_name]) ?? []);
		for (const u of authUsers.users) {
			const displayName = profileMap.get(u.id);
			if (u.email && displayName?.trim()) {
				emailToDisplayName.set(u.email.toLowerCase(), displayName.trim());
			}
		}
	}

	// Build full contact list: contacts table + anyone in invitations not in contacts
	const contactMap = new Map<string, string | undefined>(); // email → firstName
	for (const c of contacts ?? []) {
		contactMap.set(c.email.trim().toLowerCase(), c.name?.trim() || undefined);
	}
	for (const inv of invitations ?? []) {
		const email = inv.email?.trim().toLowerCase();
		if (email && !contactMap.has(email)) {
			contactMap.set(email, undefined);
		}
	}
	// Overlay display names for members
	for (const [email, displayName] of emailToDisplayName) {
		if (!contactMap.get(email)) {
			contactMap.set(email, displayName);
		}
	}

	// Group by stage
	const groups: Record<Stage, Array<{ email: string; firstName?: string }>> = {
		waitlist: [],
		invited: [],
		member: [],
	};

	for (const [email, firstName] of contactMap) {
		const stage: Stage = inviteMap.get(email) ?? 'waitlist';
		groups[stage].push({ email, firstName });
	}

	console.log(`Total: ${contactMap.size} contacts`);
	for (const stage of ['waitlist', 'invited', 'member'] as Stage[]) {
		console.log(`  ${stage}: ${groups[stage].length}`);
	}
	console.log('');

	let ok = 0, failed = 0;

	for (const stage of ['waitlist', 'invited', 'member'] as Stage[]) {
		const audienceId = AUDIENCE_IDS[stage];
		console.log(`→ Syncing ${groups[stage].length} to ${stage} audience…`);
		for (const contact of groups[stage]) {
			const error = await addContact(audienceId, contact.email, contact.firstName);
			if (error) {
				console.error(`  ✗ ${contact.email}: ${error.message}`);
				failed++;
			} else {
				console.log(`  ✓ ${contact.email}`);
				ok++;
			}
		}
	}

	console.log(`\nDone — ${ok} synced, ${failed} failed.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
