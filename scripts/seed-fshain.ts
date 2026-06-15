/**
 * Seed Friedrichshain prompts for local dev map preview.
 *
 * Usage:
 *   npx tsx scripts/seed-fshain.ts
 *   npx tsx scripts/seed-fshain.ts --dry-run
 *   npx tsx scripts/seed-fshain.ts --wipe   # delete all fshain seed data first
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing .env: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wipe = args.includes('--wipe');

// ── Seed authors (IDs resolved at runtime after createUser) ──────────────────
const AUTHOR_DEFS = [
	{ username: 'mia_fshain',   email: 'mia@seed.invalid',     avatar: 'https://picsum.photos/seed/mia-fshain/200/200' },
	{ username: 'leon_bxhgn',   email: 'leon@seed.invalid',    avatar: 'https://picsum.photos/seed/leon-bxhgn/200/200' },
	{ username: 'sara_raw',     email: 'sara@seed.invalid',    avatar: 'https://picsum.photos/seed/sara-raw/200/200' },
	{ username: 'jan_volkspark',email: 'jan@seed.invalid',     avatar: 'https://picsum.photos/seed/jan-volkspark/200/200' },
	{ username: 'ele_kma',      email: 'ele@seed.invalid',     avatar: 'https://picsum.photos/seed/ele-kma/200/200' },
];
type Author = (typeof AUTHOR_DEFS)[number] & { id: string };
const AUTHORS: Author[] = [];

// ── Prompts with Friedrichshain locations ─────────────────────────────────────
const PROMPTS: Array<{
	id: string;
	authorIdx: number; // index into AUTHORS
	title: string;
	body: string;
	cover: string;
	area: string;
	lat: number;
	lng: number;
	placeName: string;
	placeAddress: string;
}> = [
	{
		id: 'fsh-001',
		authorIdx: 0,
		title: 'What does the city sound like to you at 6am?',
		body: 'Before the day begins its noise, there is a particular hush over Berlin. I have been waking early just to hear it. What sounds do you associate with the city at its quietest?',
		cover: 'https://picsum.photos/seed/fsh-dawn/800/600',
		area: 'Volkspark Friedrichshain',
		lat: 52.5283,
		lng: 13.4372,
		placeName: 'Volkspark Friedrichshain',
		placeAddress: 'Am Friedrichshain 1, 10249 Berlin',
	},
	{
		id: 'fsh-002',
		authorIdx: 1,
		title: 'On reinventing yourself in a city that forgets fast',
		body: 'Berlin has a short memory. People come, change radically, leave, and no one tracks the transformation. Is that freedom or loss of accountability?',
		cover: 'https://picsum.photos/seed/fsh-reinvent/800/600',
		area: 'Boxhagener Platz',
		lat: 52.5136,
		lng: 13.4556,
		placeName: 'Café Silo',
		placeAddress: 'Boxhagener Str. 76, 10245 Berlin',
	},
	{
		id: 'fsh-003',
		authorIdx: 2,
		title: 'When did you last feel genuinely surprised by a person?',
		body: 'Not shocked. Not impressed. Actually surprised — where your model of someone dissolved and you had to start again. I have been thinking about this kind of encounter.',
		cover: 'https://picsum.photos/seed/fsh-surprise/800/600',
		area: 'RAW-Gelände',
		lat: 52.5094,
		lng: 13.4527,
		placeName: 'Cassiopeia',
		placeAddress: 'Revaler Str. 99, 10245 Berlin',
	},
	{
		id: 'fsh-004',
		authorIdx: 3,
		title: 'The places you carry that no longer exist',
		body: 'There are cafés I return to that closed years ago. I still walk by, expecting the light. What places that are gone do you still carry with you?',
		cover: 'https://picsum.photos/seed/fsh-gone/800/600',
		area: 'Frankfurter Tor',
		lat: 52.5162,
		lng: 13.4584,
		placeName: 'Frankfurter Tor',
		placeAddress: 'Karl-Marx-Allee 72, 10243 Berlin',
	},
	{
		id: 'fsh-005',
		authorIdx: 4,
		title: 'What are you building toward, slowly?',
		body: 'Not the career answer. The actual thing. The practice or capability or relationship that you are quietly tending. I want to meet someone who is building something they cannot yet name.',
		cover: 'https://picsum.photos/seed/fsh-build/800/600',
		area: 'Karl-Marx-Allee',
		lat: 52.5147,
		lng: 13.4397,
		placeName: 'Café Moskau',
		placeAddress: 'Karl-Marx-Allee 34, 10178 Berlin',
	},
	{
		id: 'fsh-006',
		authorIdx: 0,
		title: 'On the particular loneliness of being understood',
		body: 'Sometimes when someone understands you completely, it is more isolating than when they do not. What happens in that moment?',
		cover: 'https://picsum.photos/seed/fsh-lonely/800/600',
		area: 'Samariterviertel',
		lat: 52.5180,
		lng: 13.4530,
		placeName: 'Samariterstraße',
		placeAddress: 'Samariterstr. 13, 10247 Berlin',
	},
	{
		id: 'fsh-007',
		authorIdx: 1,
		title: 'How do you know when you are ready for something?',
		body: 'We often wait for a feeling of readiness that never fully arrives. Is readiness a feeling or a decision? How have you navigated this?',
		cover: 'https://picsum.photos/seed/fsh-ready/800/600',
		area: 'Warschauer Straße',
		lat: 52.5075,
		lng: 13.4490,
		placeName: 'Wriezener Bahnhof',
		placeAddress: 'Warschauer Str. 78, 10243 Berlin',
	},
	{
		id: 'fsh-008',
		authorIdx: 2,
		title: 'What responsibility do we have to our past selves?',
		body: 'You make a promise, a commitment, an identity claim. Then you grow out of it. Do you owe your past self fidelity, or is moving on the only honest act?',
		cover: 'https://picsum.photos/seed/fsh-past/800/600',
		area: 'Stralauer Allee',
		lat: 52.5055,
		lng: 13.4395,
		placeName: 'East Side Gallery',
		placeAddress: 'Stralauer Allee 1, 10245 Berlin',
	},
	{
		id: 'fsh-009',
		authorIdx: 3,
		title: 'The parts of yourself you perform without choosing to',
		body: 'We all have automatic performances — postures, voices, gestures that belong to roles we once needed. Which of yours have you noticed?',
		cover: 'https://picsum.photos/seed/fsh-perform/800/600',
		area: 'Rigaer Kiez',
		lat: 52.5198,
		lng: 13.4618,
		placeName: 'Rigaer Straße',
		placeAddress: 'Rigaer Str. 83, 10247 Berlin',
	},
	{
		id: 'fsh-010',
		authorIdx: 4,
		title: 'On choosing depth over breadth, or not',
		body: 'At some point I stopped collecting new experiences and started returning to fewer things more deeply. Was that maturity, or did I lose something?',
		cover: 'https://picsum.photos/seed/fsh-depth/800/600',
		area: 'Ostkreuz',
		lat: 52.5030,
		lng: 13.4701,
		placeName: 'Ostkreuz',
		placeAddress: 'Marktstraße 1, 10317 Berlin',
	},
	{
		id: 'fsh-011',
		authorIdx: 0,
		title: 'What is the difference between habit and ritual?',
		body: 'I make coffee the same way every morning, but some days it is mechanical and other days it is sacred. What makes the difference?',
		cover: 'https://picsum.photos/seed/fsh-ritual/800/600',
		area: 'Simon-Dach-Kiez',
		lat: 52.5120,
		lng: 13.4540,
		placeName: 'Trinkteufel',
		placeAddress: 'Simon-Dach-Str. 39, 10245 Berlin',
	},
	{
		id: 'fsh-012',
		authorIdx: 1,
		title: 'On the ethics of being someone people confide in',
		body: 'People tell me things. I did not ask for this role, but I have come to inhabit it. What do we owe to those who make us witnesses?',
		cover: 'https://picsum.photos/seed/fsh-confide/800/600',
		area: 'Berghain area',
		lat: 52.5106,
		lng: 13.4421,
		placeName: 'Berghain / Panorama Bar',
		placeAddress: 'Am Wriezener Bahnhof, 10243 Berlin',
	},
	{
		id: 'fsh-013',
		authorIdx: 2,
		title: 'What would you do with one quiet week alone?',
		body: 'Not a holiday. Not productive. Just time — a week with no obligations, no one to see. I keep imagining what I would actually do versus what I imagine I would do.',
		cover: 'https://picsum.photos/seed/fsh-quiet/800/600',
		area: 'Volkspark Friedrichshain',
		lat: 52.5298,
		lng: 13.4401,
		placeName: 'Märchenbrunnen',
		placeAddress: 'Am Friedrichshain, 10249 Berlin',
	},
	{
		id: 'fsh-014',
		authorIdx: 3,
		title: 'How do you hold grief and gratitude simultaneously?',
		body: 'The two feelings seem to cancel each other but actually they coexist. Something can be over and still be something you are glad happened. How do you live in that?',
		cover: 'https://picsum.photos/seed/fsh-grief/800/600',
		area: 'Spree-Ufer',
		lat: 52.5068,
		lng: 13.4344,
		placeName: 'Holzmarkt 25',
		placeAddress: 'Holzmarktstraße 25, 10243 Berlin',
	},
	{
		id: 'fsh-015',
		authorIdx: 4,
		title: 'The version of yourself you never became',
		body: 'There are paths not taken that I think about without regret, just curiosity. Who would you have been if one thing had gone differently?',
		cover: 'https://picsum.photos/seed/fsh-paths/800/600',
		area: 'Frankfurter Allee',
		lat: 52.5133,
		lng: 13.4680,
		placeName: 'Frankfurter Allee',
		placeAddress: 'Frankfurter Allee 91, 10247 Berlin',
	},
];

function tiptapBody(text: string) {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

async function wipeSeeds() {
	const promptIds = PROMPTS.map(p => p.id);
	const emails = AUTHOR_DEFS.map(a => a.email);

	console.log('Wiping fshain seed prompts...');
	await supabase.from('time_slots').delete().in('prompt_id', promptIds);
	await supabase.from('prompts').delete().in('id', promptIds);

	// Delete auth users by email
	const { data: users } = await supabase.auth.admin.listUsers();
	const seedUsers = (users?.users ?? []).filter(u => emails.includes(u.email ?? ''));
	for (const u of seedUsers) {
		await supabase.auth.admin.deleteUser(u.id);
		console.log(`  deleted @${u.email}`);
	}
	console.log('Done wiping.');
}

async function main() {
	if (wipe) {
		await wipeSeeds();
		return;
	}

	// 1. Ensure seed authors exist — create or reuse by email
	const { data: existingUsers } = await supabase.auth.admin.listUsers();
	const existingByEmail = new Map((existingUsers?.users ?? []).map(u => [u.email, u.id]));

	for (const def of AUTHOR_DEFS) {
		if (dryRun) { console.log(`  WOULD CREATE user @${def.username}`); AUTHORS.push({ ...def, id: 'dry-run' }); continue; }

		let userId = existingByEmail.get(def.email);
		if (!userId) {
			const { data, error } = await supabase.auth.admin.createUser({
				email: def.email,
				password: 'seedpass123!',
				email_confirm: true,
				user_metadata: { username: def.username },
			});
			if (error || !data.user) { console.error(`  ERROR creating ${def.email}: ${error?.message}`); continue; }
			userId = data.user.id;
		}

		await supabase.from('profiles').upsert({
			id: userId,
			username: def.username,
			avatar_url: def.avatar,
			onboarded: true,
			berlin_based: true,
		}, { onConflict: 'id' });

		AUTHORS.push({ ...def, id: userId });
		console.log(`  ✓ @${def.username} (${userId})`);
	}

	// 2. Create prompts + slots
	const futureBase = new Date();
	futureBase.setDate(futureBase.getDate() + 3);

	for (const p of PROMPTS) {
		if (dryRun) { console.log(`  WOULD CREATE "${p.title}" → ${p.area}`); continue; }

		const slotTime = new Date(futureBase);
		slotTime.setDate(slotTime.getDate() + PROMPTS.indexOf(p));
		slotTime.setHours(19, 0, 0, 0);

		// Create prompt if not exists
		const { data: existing } = await supabase.from('prompts').select('id').eq('id', p.id).maybeSingle();
		if (!existing) {
			const { error: pe } = await supabase.from('prompts').insert({
				id: p.id,
				author_id: AUTHORS[p.authorIdx].id,
				title: p.title,
				body: tiptapBody(p.body),
				cover_image_url: p.cover,
				state: 'published',
				region: 'berlin',
				published_at: new Date().toISOString(),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			});
			if (pe) { console.error(`  ERROR prompt "${p.title}": ${pe.message}`); continue; }
		}

		// Create slot if not exists
		const { count: slotCount } = await supabase.from('time_slots').select('id', { count: 'exact', head: true }).eq('prompt_id', p.id);
		if ((slotCount ?? 0) > 0) { console.log(`  SKIP "${p.title}" (slot exists)`); continue; }

		const { error: se } = await supabase.from('time_slots').insert({
			id: crypto.randomUUID(),
			prompt_id: p.id,
			start_time: slotTime.toISOString(),
			duration_minutes: 75,
			exact_location: JSON.stringify({
				place_id: p.id,
				name: p.placeName,
				address: p.placeAddress,
				lat: p.lat,
				lng: p.lng,
			}),
			general_area: p.area,
			general_area_lat: p.lat,
			general_area_lng: p.lng,
		});

		if (se) { console.error(`  ERROR slot for "${p.title}": ${se.message}`); }
		else { console.log(`  ✓ "${p.title}" → ${p.area}`); }
	}

	console.log('\nDone. Reload the discover map to see Friedrichshain pins.');
}

main();
