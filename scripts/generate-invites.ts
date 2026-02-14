/**
 * Generate invitation links for waitlist contacts
 *
 * Usage:
 *   npx tsx scripts/generate-invites.ts                # Generate for all contacts without invites
 *   npx tsx scripts/generate-invites.ts --limit 50     # Limit to first N contacts
 *   npx tsx scripts/generate-invites.ts --email a@b.c  # Generate for a specific email
 *   npx tsx scripts/generate-invites.ts --dry-run      # Preview without inserting
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing environment variables in .env:');
	console.error('  PUBLIC_SUPABASE_URL');
	console.error('  SUPABASE_SERVICE_ROLE_KEY (required for reading contacts)');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const INVITE_EXPIRY_DAYS = 14;
const BASE_URL = 'https://dyad.berlin';

async function main() {
	const args = process.argv.slice(2);
	let limit: number | null = null;
	let emailFilter: string | null = null;
	let dryRun = false;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--limit' && args[i + 1]) {
			limit = parseInt(args[i + 1], 10);
			i++;
		} else if (args[i] === '--email' && args[i + 1]) {
			emailFilter = args[i + 1];
			i++;
		} else if (args[i] === '--dry-run') {
			dryRun = true;
		}
	}

	// Fetch contacts
	let query = supabase
		.from('contacts')
		.select('id, email, name')
		.order('created_at', { ascending: true });

	if (emailFilter) {
		query = query.eq('email', emailFilter);
	}

	if (limit) {
		query = query.limit(limit);
	}

	const { data: contacts, error: contactsError } = await query;

	if (contactsError) {
		console.error('Error fetching contacts:', contactsError.message);
		process.exit(1);
	}

	if (!contacts || contacts.length === 0) {
		console.log('No contacts found.');
		return;
	}

	// Fetch existing invitations to skip contacts that already have one
	const emails = contacts.map((c) => c.email);
	const { data: existingInvites } = await supabase
		.from('invitations')
		.select('email')
		.in('email', emails);

	const alreadyInvited = new Set(existingInvites?.map((i) => i.email) ?? []);
	const toInvite = contacts.filter((c) => !alreadyInvited.has(c.email));

	if (toInvite.length === 0) {
		console.log(`All ${contacts.length} contacts already have invitations.`);
		return;
	}

	console.log(`\nGenerating invitations for ${toInvite.length} contacts (${alreadyInvited.size} already invited)\n`);

	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

	const invitations = toInvite.map((contact) => ({
		email: contact.email,
		token: nanoid(),
		expires_at: expiresAt.toISOString()
	}));

	if (dryRun) {
		console.log('DRY RUN - would create these invitations:\n');
		for (const inv of invitations) {
			console.log(`  ${inv.email}`);
			console.log(`  ${BASE_URL}/join?token=${inv.token}`);
			console.log('');
		}
		console.log(`Total: ${invitations.length} invitations (not inserted)`);
		return;
	}

	// Insert invitations in batches of 50
	const BATCH_SIZE = 50;
	for (let i = 0; i < invitations.length; i += BATCH_SIZE) {
		const batch = invitations.slice(i, i + BATCH_SIZE);
		const { error: insertError } = await supabase.from('invitations').insert(batch);

		if (insertError) {
			console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError.message);
			process.exit(1);
		}
	}

	console.log('Invitation links:\n');
	for (const inv of invitations) {
		const contact = toInvite.find((c) => c.email === inv.email);
		const displayName = contact?.name ? ` (${contact.name})` : '';
		console.log(`  ${inv.email}${displayName}`);
		console.log(`  ${BASE_URL}/join?token=${inv.token}`);
		console.log('');
	}

	console.log(`\nDone! Generated ${invitations.length} invitations (expire ${expiresAt.toLocaleDateString()}).`);
}

main();
