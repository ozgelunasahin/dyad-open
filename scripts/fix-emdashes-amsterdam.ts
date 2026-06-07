/**
 * Replace em-dashes in all Amsterdam prompt titles and body text.
 * Run once: npx tsx scripts/fix-emdashes-amsterdam.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
	{ auth: { autoRefreshToken: false, persistSession: false } }
);

function stripEmdash(s: string): string {
	return s.replace(/ — /g, ', ').replace(/—/g, ', ');
}

function patchJson(obj: unknown): unknown {
	if (typeof obj === 'string') return stripEmdash(obj);
	if (Array.isArray(obj)) return obj.map(patchJson);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, patchJson(v)]));
	}
	return obj;
}

async function main() {
	const { data: prompts, error } = await supabase
		.from('prompts')
		.select('id, title, body')
		.eq('region', 'amsterdam');

	if (error) { console.error(error.message); process.exit(1); }

	console.log(`Patching ${prompts?.length ?? 0} Amsterdam prompts...`);

	for (const p of prompts ?? []) {
		const newTitle = stripEmdash(p.title ?? '');
		const newBody = patchJson(p.body);

		const { error: err } = await supabase
			.from('prompts')
			.update({ title: newTitle, body: newBody })
			.eq('id', p.id);

		if (err) {
			console.error(`  Failed ${p.id}: ${err.message}`);
		} else {
			console.log(`  ✓ ${newTitle.slice(0, 65)}`);
		}
	}

	console.log('Done.');
}

main().catch(console.error);
