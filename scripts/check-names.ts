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
const config = { ...loadEnv(resolve(process.cwd(), '.env.local')), ...loadEnv(resolve(process.cwd(), '.env')) };
const db = createClient(config.PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
	const { data: contacts } = await db.from('contacts').select('email, name');
	const { data: profiles } = await db.from('profiles').select('*').limit(2);

	const withName = contacts?.filter(c => c.name?.trim()) ?? [];
	const withoutName = contacts?.filter(c => !c.name?.trim()) ?? [];

	console.log('=== contacts table ===');
	console.log(`  with name:    ${withName.length} / ${contacts?.length}`);
	console.log(`  without name: ${withoutName.length}`);

	console.log('\n=== profiles table columns ===');
	if (profiles?.[0]) console.log(' ', Object.keys(profiles[0]).join(', '));
	else console.log('  (no rows)');
}
main().catch(console.error);
