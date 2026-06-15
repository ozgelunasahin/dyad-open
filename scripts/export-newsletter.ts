/**
 * Export unexported newsletter subscribers as a Substack-ready CSV.
 *
 * Usage:
 *   npx tsx scripts/export-newsletter.ts
 *
 * Outputs: newsletter-export-YYYY-MM-DD.csv
 * Then go to: dyad.substack.com → Settings → Subscribers → Import subscribers
 *
 * Flags:
 *   --all     Export all subscribers, not just unexported ones
 *   --dry-run Print count without writing file or marking as exported
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

const config = { ...loadEnv(resolve(process.cwd(), '.env.local')), ...loadEnv(resolve(process.cwd(), '.env')) };
const SUPABASE_URL = config.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const args = process.argv.slice(2);
const exportAll = args.includes('--all');
const dryRun = args.includes('--dry-run');

async function main() {
	let query = admin
		.from('newsletter_subscribers')
		.select('id, email, source, consented_at')
		.order('consented_at', { ascending: true });

	if (!exportAll) {
		query = query.is('exported_at', null);
	}

	const { data: rows, error } = await query;

	if (error) { console.error('Fetch error:', error.message); process.exit(1); }
	if (!rows || rows.length === 0) {
		console.log('No subscribers to export.');
		return;
	}

	console.log(`${rows.length} subscriber(s) to export.`);

	if (dryRun) {
		rows.forEach(r => console.log(`  ${r.email} (${r.source}, ${r.consented_at.slice(0, 10)})`));
		console.log('\nDry run — no file written.');
		return;
	}

	// Substack CSV format: email, name (optional)
	const csv = ['email,name', ...rows.map(r => `${r.email},`)].join('\n');
	const filename = `newsletter-export-${new Date().toISOString().slice(0, 10)}.csv`;
	writeFileSync(filename, csv, 'utf-8');
	console.log(`Written: ${filename}`);

	// Mark as exported
	const ids = rows.map(r => r.id);
	const { error: updateErr } = await admin
		.from('newsletter_subscribers')
		.update({ exported_at: new Date().toISOString() })
		.in('id', ids);

	if (updateErr) {
		console.error('Warning: failed to mark as exported:', updateErr.message);
	} else {
		console.log(`Marked ${ids.length} subscriber(s) as exported.`);
	}

	console.log(`\nNext step: upload ${filename} at dyad.substack.com → Settings → Subscribers → Import subscribers`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
