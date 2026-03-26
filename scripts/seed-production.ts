/**
 * Production seed script — creates test users and sample conversations.
 * Run with: npx tsx scripts/seed-production.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 * Does NOT delete existing data. Safe to run multiple times (uses upsert/idempotent patterns).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { nanoid } from 'nanoid';

// Load .env only (remote/production credentials), NOT .env.local (local dev)
config({ path: '.env' });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

// ── Test Users ──────────────────────────────────────────────────────────────

const TEST_USERS = [
	{ email: 'tom@dyad.berlin', password: 'dyad2026!', username: 'tom' },
	{ email: 'sophie@dyad.berlin', password: 'dyad2026!', username: 'sophie' },
	// Sample content authors — their prompts populate the discover feed
	{ email: 'alex@dyad.berlin', password: 'dyad2026!', username: 'alex' },
	{ email: 'mira@dyad.berlin', password: 'dyad2026!', username: 'mira' },
	{ email: 'jan@dyad.berlin', password: 'dyad2026!', username: 'jan' },
];

async function createUser(email: string, password: string, username: string): Promise<string> {
	// Check if user already exists
	const { data: existing } = await supabase.auth.admin.listUsers();
	const found = existing?.users?.find(u => u.email === email);
	if (found) {
		console.log(`  User ${email} already exists (${found.id})`);
		// Ensure profile exists
		await supabase.from('profiles').upsert({
			id: found.id, username, berlin_based: true
		}, { onConflict: 'id' });
		return found.id;
	}

	const { data, error } = await supabase.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { username, berlin_based: true }
	});

	if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
	console.log(`  Created ${email} (${data.user.id})`);

	// Ensure profile exists (trigger should create it, but belt & suspenders)
	await supabase.from('profiles').upsert({
		id: data.user.id, username, berlin_based: true
	}, { onConflict: 'id' });

	return data.user.id;
}

// ── Sample Prompts ──────────────────────────────────────────────────────────

const SAMPLE_PROMPTS = [
	{
		authorUsername: 'alex',
		title: 'What does it mean to truly listen?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Listening is not merely the absence of speaking. It is an act of attention that requires us to suspend our own internal monologue — the constant hum of interpretation, judgment, and anticipation — long enough to receive what another person is actually offering.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'When was the last time you felt truly heard? What made it different from a normal conversation?' }] }
			]
		},
		slots: [
			{ area: 'Prenzlauer Berg', lat: 52.5388, lng: 13.4244, daysFromNow: 2, hour: 19 },
			{ area: 'Mitte', lat: 52.5200, lng: 13.4050, daysFromNow: 4, hour: 18 },
		]
	},
	{
		authorUsername: 'mira',
		title: 'On arriving in a city you didn\'t choose',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'There is a particular feeling that arrives when you have left somewhere but not yet arrived somewhere else. Not the physical transit — airports and trains are just corridors — but the interior version of it.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'You carry a history of gestures and references that belong to another place. How do you make a city yours when you didn\'t choose it?' }] }
			]
		},
		slots: [
			{ area: 'Kreuzberg', lat: 52.4988, lng: 13.4238, daysFromNow: 1, hour: 20 },
			{ area: 'Neukölln', lat: 52.4811, lng: 13.4350, daysFromNow: 3, hour: 19 },
		]
	},
	{
		authorUsername: 'jan',
		title: 'The art of disagreeing well',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Somewhere between argument and agreement lies a space most conversations never reach: the place where two people genuinely hold different views and are both changed by the encounter.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Disagreement, done well, is an act of respect. What does it take to disagree without it becoming a fight?' }] }
			]
		},
		slots: [
			{ area: 'Friedrichshain', lat: 52.5148, lng: 13.4540, daysFromNow: 2, hour: 18 },
		]
	},
	{
		authorUsername: 'alex',
		title: 'What we owe each other as strangers',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'The stranger is a peculiar figure — neither friend nor enemy, neither known nor entirely unknown. What is the minimum we owe someone we will never see again?' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'And what might we gain if we treated that encounter as if it mattered?' }] }
			]
		},
		slots: [
			{ area: 'Schöneberg', lat: 52.4850, lng: 13.3530, daysFromNow: 3, hour: 19 },
			{ area: 'Charlottenburg', lat: 52.5070, lng: 13.3040, daysFromNow: 5, hour: 17 },
		]
	},
	{
		authorUsername: 'mira',
		title: 'On being a beginner again',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'There is a particular humility required to be a beginner. Most of us spend our adult lives avoiding it — performing competence, staying in lanes we already know.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'But the beginner\'s mind is where curiosity lives, unencumbered by the weight of expertise. When did you last allow yourself to be terrible at something?' }] }
			]
		},
		slots: [
			{ area: 'Wedding', lat: 52.5500, lng: 13.3590, daysFromNow: 1, hour: 18 },
		]
	},
];

function makeSlotTime(daysFromNow: number, hour: number): string {
	const d = new Date();
	d.setDate(d.getDate() + daysFromNow);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
}

async function createPrompt(
	authorId: string,
	title: string,
	body: object,
	slots: Array<{ area: string; lat: number; lng: number; daysFromNow: number; hour: number }>
) {
	const promptId = nanoid();

	// Check if we already seeded a prompt with this title by this author
	const { data: existing } = await supabase
		.from('prompts')
		.select('id')
		.eq('author_id', authorId)
		.eq('title', title)
		.maybeSingle();

	if (existing) {
		console.log(`  Prompt "${title}" already exists, skipping`);
		return;
	}

	// Create as published
	const { error: promptError } = await supabase.from('prompts').insert({
		id: promptId,
		author_id: authorId,
		title,
		body,
		state: 'published',
		region: 'berlin',
		published_at: new Date().toISOString()
	});

	if (promptError) {
		console.error(`  Failed to create prompt "${title}": ${promptError.message}`);
		return;
	}

	// Create time slots
	for (const slot of slots) {
		const { error: slotError } = await supabase.from('time_slots').insert({
			prompt_id: promptId,
			start_time: makeSlotTime(slot.daysFromNow, slot.hour),
			duration_minutes: 60,
			exact_location: { place_id: `seed-${nanoid(6)}`, name: `Café in ${slot.area}`, address: `${slot.area}, Berlin`, lat: slot.lat, lng: slot.lng },
			general_area: slot.area,
			general_area_lat: slot.lat,
			general_area_lng: slot.lng
		});

		if (slotError) {
			console.error(`  Failed to create slot for "${title}": ${slotError.message}`);
		}
	}

	console.log(`  Created prompt "${title}" with ${slots.length} slot(s)`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
	console.log('Creating test users...');
	const userIds = new Map<string, string>();
	for (const user of TEST_USERS) {
		const id = await createUser(user.email, user.password, user.username);
		userIds.set(user.username, id);
	}

	console.log('\nCreating sample conversations...');
	for (const prompt of SAMPLE_PROMPTS) {
		const authorId = userIds.get(prompt.authorUsername);
		if (!authorId) {
			console.error(`  Author ${prompt.authorUsername} not found, skipping`);
			continue;
		}
		await createPrompt(authorId, prompt.title, prompt.body, prompt.slots);
	}

	console.log('\nDone! Test accounts:');
	console.log('  tom@dyad.berlin / dyad2026!');
	console.log('  sophie@dyad.berlin / dyad2026!');
	console.log('\nSample conversations by: alex, mira, jan');
}

main().catch(console.error);
