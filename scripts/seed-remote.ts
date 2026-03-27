/**
 * Seed remote Supabase with cover images and diverse conversations.
 *
 * Usage: npx tsx scripts/seed-remote.ts
 *
 * Reads PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env manually (takes precedence)
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

const envLocal = loadEnv(resolve(process.cwd(), '.env.local'));
const env = loadEnv(resolve(process.cwd(), '.env'));
// .env takes precedence over .env.local
const config = { ...envLocal, ...env };

const SUPABASE_URL = config.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;

const SEED_PASSWORD = config.SEED_PASSWORD;

if (!SUPABASE_URL || !SERVICE_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

if (!SEED_PASSWORD) {
	console.error('Missing SEED_PASSWORD in .env — required for creating test users');
	process.exit(1);
}

console.log(`Seeding remote: ${SUPABASE_URL}`);

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/uploads`;

// Download stock images from picsum
async function downloadImage(seed: string): Promise<Buffer> {
	const res = await fetch(`https://picsum.photos/seed/${seed}/800/400`);
	return Buffer.from(await res.arrayBuffer());
}

async function uploadImage(name: string, buffer: Buffer): Promise<string> {
	const path = `seed/${name}`;
	const { error } = await admin.storage.from('uploads').upload(path, buffer, {
		contentType: 'image/jpeg',
		upsert: true
	});
	if (error) {
		console.error(`  Failed to upload ${name}:`, error.message);
		throw error;
	}
	return `${STORAGE_BASE}/seed/${name}`;
}

// Users to create
const users = [
	{ id: '33333333-3333-3333-3333-333333333333', email: 'sophie@dyad.berlin', username: 'sophie', password: SEED_PASSWORD },
	{ id: '44444444-4444-4444-4444-444444444444', email: 'tom@dyad.berlin', username: 'tom', password: SEED_PASSWORD },
	{ id: '55555555-5555-5555-5555-555555555555', email: 'luna@dyad.berlin', username: 'luna', password: SEED_PASSWORD },
	{ id: '66666666-6666-6666-6666-666666666666', email: 'kai@dyad.berlin', username: 'kai', password: SEED_PASSWORD },
];

// Conversations with different styles
const conversations = [
	{
		id: 'seed-conv-strangers',
		author: '33333333-3333-3333-3333-333333333333', // sophie
		title: 'What we owe each other as strangers',
		body: 'The stranger is a peculiar figure — neither friend nor enemy, neither known nor entirely unknown. What is the minimum we owe someone we will never see again? I keep thinking about the small courtesies that hold a city together: the nod on the street, holding the door, the unspoken rules of shared space.',
		image_seed: 'dyad-strangers',
		slots: [
			{ days: 2, hours: 15, duration: 90, place: 'Café am Neuen See', address: 'Lichtensteinallee 2, 10787 Berlin', lat: 52.5095, lng: 13.3405, area: 'Tiergarten' },
			{ days: 4, hours: 11, duration: 60, place: 'Tempelhofer Feld', address: 'Tempelhofer Damm, 12101 Berlin', lat: 52.4731, lng: 13.4015, area: 'Tempelhof' },
		]
	},
	{
		id: 'seed-conv-language',
		author: '44444444-4444-4444-4444-444444444444', // tom
		title: 'Language and what slips through it',
		body: 'Every language carves the world differently. Some things that are effortless in one tongue become impossible in another. I grew up between German and English, and the gap between them taught me more about thinking than any philosophy class.',
		image_seed: 'dyad-language',
		slots: [
			{ days: 3, hours: 16, duration: 60, place: 'Markthalle Neun', address: 'Eisenbahnstraße 42/43, 10999 Berlin', lat: 52.5006, lng: 13.4284, area: 'Kreuzberg' },
		]
	},
	{
		id: 'seed-conv-silence',
		author: '55555555-5555-5555-5555-555555555555', // luna
		title: 'The shape of comfortable silence',
		body: 'There is a particular quality of silence between two people who are comfortable together. It is different from the silence of strangers on a train, or the loaded silence after an argument. How do we get there with someone new?',
		image_seed: 'dyad-silence',
		slots: [
			{ days: 1, hours: 10, duration: 45, place: 'Volkspark Friedrichshain', address: 'Am Friedrichshain, 10249 Berlin', lat: 52.5283, lng: 13.4372, area: 'Friedrichshain' },
			{ days: 5, hours: 14, duration: 60, place: 'Café Blume', address: 'Schönhauser Allee 6, 10119 Berlin', lat: 52.5310, lng: 13.4112, area: 'Prenzlauer Berg' },
		]
	},
	{
		id: 'seed-conv-belonging',
		author: '66666666-6666-6666-6666-666666666666', // kai
		title: 'Belonging somewhere you weren\'t born',
		body: 'Berlin is full of people who chose to be here. What does it mean to belong to a place that didn\'t raise you? I moved here six years ago and still sometimes feel like a guest in my own neighbourhood. But then a stranger greets me by name at the bakery, and the feeling dissolves.',
		image_seed: 'dyad-belonging',
		slots: [
			{ days: 2, hours: 17, duration: 75, place: 'Klunkerkranich', address: 'Karl-Marx-Straße 66, 12043 Berlin', lat: 52.4815, lng: 13.4329, area: 'Neukölln' },
		]
	},
	{
		id: 'seed-conv-beginner',
		author: '33333333-3333-3333-3333-333333333333', // sophie
		title: 'On being a beginner again',
		body: 'There is a particular humility required to be a beginner. Most of us spend our adult lives avoiding it. We stay in lanes where we are competent, where we know the rules. But the moments I have learned the most have always started with the admission: I have no idea what I am doing.',
		image_seed: 'dyad-beginner',
		slots: [
			{ days: 3, hours: 11, duration: 60, place: 'Betahaus', address: 'Rudi-Dutschke-Straße 23, 10969 Berlin', lat: 52.5069, lng: 13.3918, area: 'Kreuzberg' },
			{ days: 6, hours: 15, duration: 90, place: 'Prinzessinnengarten', address: 'Prinzenstraße 35-38, 10969 Berlin', lat: 52.5025, lng: 13.4104, area: 'Kreuzberg' },
		]
	},
	{
		id: 'seed-conv-listening',
		author: '44444444-4444-4444-4444-444444444444', // tom
		title: 'What does it mean to really listen?',
		body: 'Most conversations are two people waiting for their turn to speak. Real listening is something else entirely — a kind of surrender. You let go of your agenda and enter someone else\'s world for a while. It is harder than it sounds and rarer than we pretend.',
		image_seed: 'dyad-listening',
		slots: [
			{ days: 4, hours: 10, duration: 60, place: 'Bonanza Coffee', address: 'Oderberger Str. 35, 10435 Berlin', lat: 52.5393, lng: 13.4112, area: 'Prenzlauer Berg' },
		]
	},
];

async function main() {
	// 1. Ensure uploads bucket exists
	console.log('Ensuring uploads bucket...');
	const { data: buckets } = await admin.storage.listBuckets();
	if (!buckets?.find(b => b.name === 'uploads')) {
		await admin.storage.createBucket('uploads', { public: true });
		console.log('  Created uploads bucket');
	}

	// 2. Upload cover images
	console.log('Uploading cover images...');
	const imageUrls: Record<string, string> = {};
	for (const conv of conversations) {
		console.log(`  Downloading ${conv.image_seed}...`);
		const buffer = await downloadImage(conv.image_seed);
		const url = await uploadImage(`${conv.image_seed}.jpg`, buffer);
		imageUrls[conv.id] = url;
		console.log(`  Uploaded → ${url}`);
	}

	// 3. Create or find users — resolve real auth UUIDs
	console.log('Resolving users...');
	const userIdMap: Record<string, string> = {}; // placeholder ID → real auth UUID
	const { data: existingUsers } = await admin.auth.admin.listUsers();

	for (const user of users) {
		// Try by email first
		const byEmail = existingUsers?.users.find(u => u.email === user.email);
		if (byEmail) {
			userIdMap[user.id] = byEmail.id;
			console.log(`  ${user.username} found by email → ${byEmail.id}`);
		} else {
			// Try by username in profiles (user may exist under a different email)
			const { data: profile } = await admin.from('profiles').select('id').eq('username', user.username).single();
			if (profile) {
				userIdMap[user.id] = profile.id;
				console.log(`  ${user.username} found by profile → ${profile.id}`);
			} else {
				// Create new user
				const { data: created, error } = await admin.auth.admin.createUser({
					email: user.email,
					password: user.password,
					email_confirm: true,
					user_metadata: { username: user.username }
				});
				if (error) {
					console.error(`  Failed to create ${user.username}:`, error.message);
				} else if (created.user) {
					userIdMap[user.id] = created.user.id;
					console.log(`  Created ${user.username} → ${created.user.id}`);
				}
			}
		}

		// Ensure profile exists with correct username
		const realId = userIdMap[user.id];
		if (realId) {
			await admin.from('profiles').upsert({
				id: realId,
				username: user.username,
				onboarded: true
			}, { onConflict: 'id' });
		}
	}

	// Helper to resolve placeholder IDs to real auth UUIDs
	function resolveId(placeholderId: string): string {
		return userIdMap[placeholderId] ?? placeholderId;
	}

	// 5. Insert conversations
	console.log('Creating conversations...');
	for (const conv of conversations) {
		const tiptapBody = {
			type: 'doc',
			content: conv.body.split('\n\n').map(p => ({
				type: 'paragraph',
				content: [{ type: 'text', text: p }]
			}))
		};

		const { error } = await admin.from('prompts').upsert({
			id: conv.id,
			author_id: resolveId(conv.author),
			title: conv.title,
			body: tiptapBody,
			cover_image_url: imageUrls[conv.id],
			state: 'published',
			region: 'berlin',
			published_at: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
			created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
			updated_at: new Date().toISOString()
		}, { onConflict: 'id' });

		if (error) {
			console.error(`  ${conv.title}:`, error.message);
		} else {
			console.log(`  ${conv.title}`);
		}

		// Insert slots
		for (const slot of conv.slots) {
			const startTime = new Date();
			startTime.setDate(startTime.getDate() + slot.days);
			startTime.setHours(slot.hours, 0, 0, 0);

			const { error: slotErr } = await admin.from('time_slots').insert({
				prompt_id: conv.id,
				start_time: startTime.toISOString(),
				duration_minutes: slot.duration,
				exact_location: { place_id: `seed-${slot.place.toLowerCase().replace(/\s/g, '-')}`, name: slot.place, address: slot.address, lat: slot.lat, lng: slot.lng },
				general_area: slot.area,
				general_area_lat: slot.lat + (Math.random() - 0.5) * 0.005,
				general_area_lng: slot.lng + (Math.random() - 0.5) * 0.005
			});
			if (slotErr && !slotErr.message.includes('duplicate')) {
				console.error(`    Slot error:`, slotErr.message);
			}
		}
	}

	// 6. Add some comments/engagement
	console.log('Adding engagement...');
	const engagements = [
		{ prompt: 'seed-conv-strangers', author: resolveId('44444444-4444-4444-4444-444444444444'), body: 'This resonates deeply. I\'ve been thinking about the unwritten social contracts that hold Berlin together.' },
		{ prompt: 'seed-conv-language', author: resolveId('33333333-3333-3333-3333-333333333333'), body: 'I grew up trilingual and the spaces between languages are where the most interesting things happen.' },
		{ prompt: 'seed-conv-silence', author: resolveId('66666666-6666-6666-6666-666666666666'), body: 'I think about this often. The silence on the U-Bahn is so different from the silence in a forest.' },
		{ prompt: 'seed-conv-belonging', author: resolveId('55555555-5555-5555-5555-555555555555'), body: 'Six years in Berlin too. The bakery moment — yes, exactly. Belonging is built in these tiny recognitions.' },
	];

	for (const eng of engagements) {
		const { error } = await admin.from('prompt_comments').upsert({
			prompt_id: eng.prompt,
			author_id: eng.author,
			body: eng.body
		}, { onConflict: 'prompt_id,author_id' });
		if (error) console.error(`  Comment error:`, error.message);
	}

	console.log('\nDone! Seeded 4 users, 6 conversations, and 4 comments.');
}

main().catch(err => {
	console.error('Fatal:', err);
	process.exit(1);
});
