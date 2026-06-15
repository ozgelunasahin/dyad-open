/**
 * Run a raw SQL migration against the remote Supabase database.
 * Usage: npx tsx scripts/run-migration.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv(path: string): Record<string, string> {
	if (!existsSync(path)) return {};
	const env: Record<string, string> = {};
	for (const line of readFileSync(path, 'utf-8').split('\n')) {
		const m = line.match(/^([^#=]+)=(.*)$/);
		if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
	}
	return env;
}

const config = {
	...loadEnv(resolve(process.cwd(), '.env.local')),
	...loadEnv(resolve(process.cwd(), '.env'))
};

const db = createClient(config.PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
	const sql = `alter table public.contacts add column if not exists referral_source text;`;
	const { error } = await db.from('contacts').select('referral_source').limit(1);
	if (!error) {
		console.log('Column referral_source already exists or contacts table accessible — checking...');
	}
	// Use pg REST endpoint
	const res = await fetch(`${config.PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'apikey': config.SUPABASE_SERVICE_ROLE_KEY,
			'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`
		},
		body: JSON.stringify({ sql })
	});
	if (!res.ok) {
		console.log('RPC not available — apply this SQL manually in Supabase SQL editor:');
		console.log('\n  ' + sql + '\n');
	} else {
		console.log('Migration applied.');
	}
}
main().catch(console.error);
