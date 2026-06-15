/**
 * Push expired time slots for seed conversations into the next 7 days.
 *
 * Usage: npx tsx scripts/refresh-slots.ts
 */

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

async function main() {
	const now = new Date();

	// Fetch all expired, non-accepted slots
	const { data: slots, error } = await admin
		.from('time_slots')
		.select('id, start_time, prompt_id')
		.eq('accepted', false)
		.lt('start_time', now.toISOString())
		.order('start_time', { ascending: true });

	if (error) { console.error('Fetch error:', error.message); process.exit(1); }
	if (!slots || slots.length === 0) { console.log('No expired slots found.'); return; }

	console.log(`Found ${slots.length} expired slot(s). Rescheduling into the next 7 days...`);

	// Spread slots evenly across days 1–7, keeping the original time of day
	let dayOffset = 1;
	for (const slot of slots) {
		const original = new Date(slot.start_time);
		const newStart = new Date(now);
		newStart.setDate(now.getDate() + dayOffset);
		newStart.setHours(original.getHours(), original.getMinutes(), 0, 0);

		const { error: updateErr } = await admin
			.from('time_slots')
			.update({ start_time: newStart.toISOString() })
			.eq('id', slot.id);

		if (updateErr) {
			console.error(`  Slot ${slot.id} failed:`, updateErr.message);
		} else {
			console.log(`  ${slot.id} → ${newStart.toDateString()} ${newStart.toTimeString().slice(0, 5)}`);
		}

		dayOffset = (dayOffset % 7) + 1;
	}

	console.log('\nDone.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
