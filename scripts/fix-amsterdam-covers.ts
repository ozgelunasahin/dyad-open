/**
 * Add cover images to Amsterdam prompts that have none.
 * Run: npx tsx scripts/fix-amsterdam-covers.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/uploads`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
	const { data: prompts } = await admin
		.from('prompts')
		.select('id, title')
		.eq('region', 'amsterdam')
		.is('cover_image_url', null);

	console.log(`Amsterdam prompts without covers: ${prompts?.length ?? 0}`);

	for (const prompt of prompts ?? []) {
		const seed = 'ams-' + prompt.id.slice(0, 8);
		const res = await fetch(`https://picsum.photos/seed/${seed}/800/400`);
		const buffer = Buffer.from(await res.arrayBuffer());
		const path = `seed/${seed}.jpg`;
		await admin.storage.from('uploads').upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
		const url = `${STORAGE_BASE}/${path}`;
		await admin.from('prompts').update({ cover_image_url: url }).eq('id', prompt.id);
		console.log(`  ✓ ${prompt.title?.slice(0, 55)}`);
	}

	console.log('Done.');
}

main().catch(console.error);
