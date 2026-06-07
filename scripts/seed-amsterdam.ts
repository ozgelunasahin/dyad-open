/**
 * Amsterdam seed, PublicSpaces Conference, June 5 2026.
 * Populates the discover feed with conversations inspired by conference themes:
 * digital autonomy, public AI, the open social web, democracy & technology.
 *
 * Run with: npx tsx scripts/seed-amsterdam.ts
 * Requires PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { nanoid } from 'nanoid';

config({ path: '.env.local' });
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

// ── Seed Users ───────────────────────────────────────────────────────────────

const SEED_USERS = [
	{ email: 'roos@dyad.berlin', password: 'dyad2026!', username: 'roos' },
	{ email: 'sander@dyad.berlin', password: 'dyad2026!', username: 'sander' },
	{ email: 'elif@dyad.berlin', password: 'dyad2026!', username: 'elif' },
	{ email: 'luca@dyad.berlin', password: 'dyad2026!', username: 'luca' },
];

async function getOrCreateUser(email: string, password: string, username: string): Promise<string> {
	const { data: existing } = await supabase.auth.admin.listUsers();
	const found = existing?.users?.find(u => u.email === email);
	if (found) {
		console.log(`  User ${email} already exists (${found.id})`);
		await supabase.from('profiles').upsert({ id: found.id, username }, { onConflict: 'id' });
		return found.id;
	}

	const { data, error } = await supabase.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { username }
	});

	if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
	console.log(`  Created ${email} (${data.user.id})`);

	await supabase.from('profiles').upsert({ id: data.user.id, username }, { onConflict: 'id' });
	return data.user.id;
}

// ── Amsterdam Locations ──────────────────────────────────────────────────────
// Neighbourhoods within walking / biking distance of the conference venue area.

const AMS = {
	centrum:     { lat: 52.3702, lng: 4.8952, area: 'Centrum' },
	jordaan:     { lat: 52.3754, lng: 4.8821, area: 'Jordaan' },
	dePijp:      { lat: 52.3535, lng: 4.8983, area: 'De Pijp' },
	oost:        { lat: 52.3622, lng: 4.9281, area: 'Oost' },
	westerpark:  { lat: 52.3866, lng: 4.8760, area: 'Westerpark' },
	plantage:    { lat: 52.3663, lng: 4.9128, area: 'Plantage' },
};

// ── Conversations ────────────────────────────────────────────────────────────
// Inspired by PublicSpaces Conference 2026-06-05 sessions.
// Framed as personal, open-ended questions, dyad style, not panel style.

const PROMPTS = [
	{
		authorUsername: 'roos',
		title: 'What would you actually give up to leave the big platforms?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'We talk about digital autonomy as if it were simply a matter of values. But values live alongside habits, networks, livelihoods. The photos are there. The groups are there. The job announcements are there.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What would it concretely cost you to leave, and what would have to change in the alternatives before you\'d do it?' }] }
			]
		},
		slots: [
			{ ...AMS.jordaan, daysFromNow: 0, hour: 12 },
			{ ...AMS.centrum, daysFromNow: 0, hour: 19 },
		]
	},
	{
		authorUsername: 'sander',
		title: 'Can a community actually govern an AI system?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Public AI, AI owned or steered by communities rather than corporations, sounds right. But communities disagree. They exclude. They are slow. They can be captured by whoever shows up.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What does meaningful community governance of a technology actually look like? Have you seen it work anywhere, in tech or elsewhere?' }] }
			]
		},
		slots: [
			{ ...AMS.dePijp, daysFromNow: 0, hour: 13 },
			{ ...AMS.westerpark, daysFromNow: 1, hour: 18 },
		]
	},
	{
		authorUsername: 'elif',
		title: 'Who shaped the AI you use, and does it matter?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Every AI system encodes assumptions about language, knowledge, value. Most of those choices were made by a small group of people, in a few places, optimising for particular outcomes.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Do you notice it in practice, the gaps, the defaults, the absences? Or does it mostly just work for you? And what would it mean if it were different?' }] }
			]
		},
		slots: [
			{ ...AMS.plantage, daysFromNow: 0, hour: 14 },
			{ ...AMS.oost, daysFromNow: 1, hour: 19 },
		]
	},
	{
		authorUsername: 'luca',
		title: 'What makes an online space feel like it belongs to you?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'There have been moments, a forum, a group chat, a comment section, where an online space felt genuinely like yours. Not because you owned it, but because it had the texture of a place with norms, memory, consequences.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What made that feeling possible? And what destroyed it, if it was destroyed?' }] }
			]
		},
		slots: [
			{ ...AMS.centrum, daysFromNow: 0, hour: 20 },
			{ ...AMS.jordaan, daysFromNow: 1, hour: 17 },
		]
	},
	{
		authorUsername: 'roos',
		title: 'Is hope a strategy, or just a feeling?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'A lot of work on building alternatives to the dominant tech landscape runs on hope. Not naive optimism, but something more deliberate, the decision to act as if change is possible, because the alternative is paralysis.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'How do you hold hope without it becoming denial? And what sustains it when things don\'t move?' }] }
			]
		},
		slots: [
			{ ...AMS.westerpark, daysFromNow: 0, hour: 18 },
			{ ...AMS.dePijp, daysFromNow: 1, hour: 20 },
		]
	},
	{
		authorUsername: 'sander',
		title: 'What does it mean to build in public, and for the public?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Public libraries, public broadcasting, public squares, these were built on the idea that some things should be available to everyone, regardless of ability to pay, and governed in the interest of all.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What would a genuinely public internet infrastructure look like? And who would have to want it for it to exist?' }] }
			]
		},
		slots: [
			{ ...AMS.oost, daysFromNow: 0, hour: 17 },
			{ ...AMS.centrum, daysFromNow: 1, hour: 12 },
		]
	},
	{
		authorUsername: 'elif',
		title: 'When did you last change your mind because of something you read online?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'The promise of a networked public sphere was that we\'d encounter genuinely different views, and be moved by evidence and argument. The fear is that it mostly hardens us instead.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Has it ever actually changed your mind, not your position, but the underlying model of something? What were the conditions that made that possible?' }] }
			]
		},
		slots: [
			{ ...AMS.plantage, daysFromNow: 1, hour: 13 },
			{ ...AMS.jordaan, daysFromNow: 2, hour: 19 },
		]
	},
	{
		authorUsername: 'luca',
		title: 'What does children\'s attention cost, and who is paying it?',
		body: {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Engagement maximisation was designed by adults, for adults, measured in minutes and clicks. Children arrived in that system without the same cognitive defences, and without choosing to be there.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What do you think we actually owe children in the design of digital environments? And what would it take to actually deliver it?' }] }
			]
		},
		slots: [
			{ ...AMS.dePijp, daysFromNow: 1, hour: 14 },
			{ ...AMS.westerpark, daysFromNow: 2, hour: 18 },
		]
	},
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSlotTime(daysFromNow: number, hour: number): string {
	const d = new Date('2026-06-05T00:00:00Z');
	d.setDate(d.getDate() + daysFromNow);
	d.setUTCHours(hour, 0, 0, 0);
	return d.toISOString();
}

async function createPrompt(
	authorId: string,
	title: string,
	body: object,
	slots: Array<{ area: string; lat: number; lng: number; daysFromNow: number; hour: number }>
) {
	const { data: existing } = await supabase
		.from('prompts')
		.select('id')
		.eq('author_id', authorId)
		.eq('title', title)
		.maybeSingle();

	if (existing) {
		console.log(`  Skipping "${title}" (already exists)`);
		return;
	}

	const promptId = nanoid();

	const { error: promptError } = await supabase.from('prompts').insert({
		id: promptId,
		author_id: authorId,
		title,
		body,
		state: 'published',
		region: 'amsterdam',
		published_at: new Date().toISOString()
	});

	if (promptError) {
		console.error(`  Failed to create "${title}": ${promptError.message}`);
		return;
	}

	for (const slot of slots) {
		const { error: slotError } = await supabase.from('time_slots').insert({
			prompt_id: promptId,
			start_time: makeSlotTime(slot.daysFromNow, slot.hour),
			duration_minutes: 60,
			exact_location: {
				place_id: `seed-${nanoid(6)}`,
				name: `Café in ${slot.area}`,
				address: `${slot.area}, Amsterdam`,
				lat: slot.lat,
				lng: slot.lng
			},
			general_area: slot.area,
			general_area_lat: slot.lat,
			general_area_lng: slot.lng
		});

		if (slotError) {
			console.error(`  Slot error for "${title}": ${slotError.message}`);
		}
	}

	console.log(`  Created "${title}" (${slots.length} slot(s))`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log('Creating Amsterdam seed users...');
	const userIds = new Map<string, string>();
	for (const u of SEED_USERS) {
		const id = await getOrCreateUser(u.email, u.password, u.username);
		userIds.set(u.username, id);
	}

	console.log('\nCreating Amsterdam conversations (PublicSpaces Conference themes)...');
	for (const prompt of PROMPTS) {
		const authorId = userIds.get(prompt.authorUsername);
		if (!authorId) {
			console.error(`  Author ${prompt.authorUsername} not found, skipping`);
			continue;
		}
		await createPrompt(authorId, prompt.title, prompt.body, prompt.slots);
	}

	console.log('\nDone. 8 conversations seeded for Amsterdam / PublicSpaces Conference 2026-06-05.');
	console.log('Seed accounts: roos, sander, elif, luca @dyad.berlin / dyad2026!');
}

main().catch(console.error);
