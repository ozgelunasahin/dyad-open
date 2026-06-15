/**
 * Bumps all past time slots to future dates for demo purposes.
 * Run with: npx tsx scripts/bump-slot-dates.ts
 *
 * Each past slot is shifted forward so its time-of-day is preserved,
 * distributed across the next 7 days starting tomorrow.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const now = new Date();

const { data: pastSlots, error } = await supabase
	.from('time_slots')
	.select('id, start_time')
	.lt('start_time', now.toISOString());

if (error) {
	console.error('Failed to fetch slots:', error.message);
	process.exit(1);
}

if (!pastSlots || pastSlots.length === 0) {
	console.log('No past slots found — nothing to do.');
	process.exit(0);
}

console.log(`Found ${pastSlots.length} past slot(s) to bump.`);

// Distribute across the next 7 days, preserving time-of-day
let dayOffset = 1;
for (const slot of pastSlots) {
	const original = new Date(slot.start_time);
	const bumped = new Date();
	bumped.setDate(bumped.getDate() + dayOffset);
	bumped.setHours(original.getHours(), original.getMinutes(), 0, 0);

	const { error: updateErr } = await supabase
		.from('time_slots')
		.update({ start_time: bumped.toISOString() })
		.eq('id', slot.id);

	if (updateErr) {
		console.error(`  FAIL  ${slot.id}: ${updateErr.message}`);
	} else {
		console.log(`  OK  ${slot.id}  →  ${bumped.toDateString()} ${bumped.toTimeString().slice(0, 5)}`);
	}

	dayOffset = (dayOffset % 7) + 1;
}

console.log('\nDone — refresh the app to see future conversations.');
