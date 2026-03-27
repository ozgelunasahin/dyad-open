/**
 * Fix missing cover images on existing prompts + add more conversations.
 * Usage: npx tsx scripts/fix-covers-and-add-more.ts
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
const SUPABASE_URL = config.PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = config.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/uploads`;

async function downloadAndUpload(seed: string): Promise<string> {
	const res = await fetch(`https://picsum.photos/seed/${seed}/800/400`);
	const buffer = Buffer.from(await res.arrayBuffer());
	const path = `seed/${seed}.jpg`;
	await admin.storage.from('uploads').upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
	return `${STORAGE_BASE}/${path}`;
}

async function main() {
	// 1. Fix existing prompts with no cover image
	console.log('Fixing missing covers...');
	const { data: noCover } = await admin.from('prompts').select('id, title').is('cover_image_url', null).eq('state', 'published');
	if (noCover && noCover.length > 0) {
		for (const prompt of noCover) {
			const seed = `fix-${prompt.id.slice(0, 8)}`;
			console.log(`  Uploading cover for: ${prompt.title}`);
			const url = await downloadAndUpload(seed);
			await admin.from('prompts').update({ cover_image_url: url }).eq('id', prompt.id);
			console.log(`    → ${url}`);
		}
	} else {
		console.log('  All published prompts have covers.');
	}

	// 2. Resolve users by username
	console.log('Resolving users...');
	const userMap: Record<string, string> = {};
	for (const username of ['sophie', 'tom', 'luna', 'kai']) {
		const { data } = await admin.from('profiles').select('id').eq('username', username).single();
		if (data) {
			userMap[username] = data.id;
			console.log(`  ${username} → ${data.id}`);
		}
	}

	// 3. Add more conversations
	const moreConversations = [
		{
			id: 'seed-conv-routine',
			author: 'luna',
			title: 'The rituals that hold your day together',
			body: 'Morning coffee. The walk to the station. The playlist for the commute. We build these small rituals without noticing, and they become the scaffold of our lives. What happens when you change one?',
			image_seed: 'dyad-routine',
			slots: [
				{ days: 2, hours: 10, duration: 60, place: 'Five Elephant', address: 'Reichenberger Str. 101, 10999 Berlin', lat: 52.4985, lng: 13.4285, area: 'Kreuzberg' },
			]
		},
		{
			id: 'seed-conv-attention',
			author: 'kai',
			title: 'Where does your attention go when nobody is watching?',
			body: 'We perform focus for others — heads down, screens glowing, productive postures. But alone, attention wanders. It drifts to old memories, half-formed plans, the sound of rain. What do you actually pay attention to when there is no one to perform for?',
			image_seed: 'dyad-attention',
			slots: [
				{ days: 1, hours: 14, duration: 45, place: 'Viktoriapark', address: 'Kreuzbergstraße, 10965 Berlin', lat: 52.4888, lng: 13.3812, area: 'Kreuzberg' },
				{ days: 3, hours: 11, duration: 60, place: 'Café CK', address: 'Mariannenstraße 33, 10999 Berlin', lat: 52.5005, lng: 13.4235, area: 'Kreuzberg' },
			]
		},
		{
			id: 'seed-conv-home',
			author: 'sophie',
			title: 'What makes a place feel like home?',
			body: 'Is it the furniture you chose? The light at a certain hour? The neighbour who knows your name? Or is home something you carry — a feeling that you can set down anywhere, given enough time?',
			image_seed: 'dyad-home',
			slots: [
				{ days: 4, hours: 16, duration: 75, place: 'Körnerpark', address: 'Schierker Str. 8, 12051 Berlin', lat: 52.4709, lng: 13.4406, area: 'Neukölln' },
			]
		},
		{
			id: 'seed-conv-strangers-train',
			author: 'tom',
			title: 'The conversations you overhear on trains',
			body: 'Two strangers on the S-Bahn last week were arguing about whether birds dream. It was the most alive I had felt all day. There is something about accidental eavesdropping — you hear people at their most unguarded.',
			image_seed: 'dyad-trains',
			slots: [
				{ days: 5, hours: 15, duration: 60, place: 'Mauerpark', address: 'Bernauer Str. 63-64, 13355 Berlin', lat: 52.5433, lng: 13.4025, area: 'Prenzlauer Berg' },
				{ days: 2, hours: 10, duration: 45, place: 'Café Krone', address: 'Kastanienallee 49, 10119 Berlin', lat: 52.5366, lng: 13.4095, area: 'Prenzlauer Berg' },
			]
		},
	];

	console.log('Adding more conversations...');
	for (const conv of moreConversations) {
		const authorId = userMap[conv.author];
		if (!authorId) { console.error(`  No user for ${conv.author}`); continue; }

		console.log(`  Uploading cover: ${conv.image_seed}...`);
		const coverUrl = await downloadAndUpload(conv.image_seed);

		const tiptapBody = {
			type: 'doc',
			content: conv.body.split('\n\n').map(p => ({
				type: 'paragraph',
				content: [{ type: 'text', text: p }]
			}))
		};

		const { error } = await admin.from('prompts').upsert({
			id: conv.id,
			author_id: authorId,
			title: conv.title,
			body: tiptapBody,
			cover_image_url: coverUrl,
			state: 'published',
			region: 'berlin',
			published_at: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
			created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
			updated_at: new Date().toISOString()
		}, { onConflict: 'id' });

		if (error) { console.error(`  ${conv.title}:`, error.message); continue; }
		console.log(`  ✓ ${conv.title}`);

		for (const slot of conv.slots) {
			const startTime = new Date();
			startTime.setDate(startTime.getDate() + slot.days);
			startTime.setHours(slot.hours, 0, 0, 0);
			await admin.from('time_slots').insert({
				prompt_id: conv.id,
				start_time: startTime.toISOString(),
				duration_minutes: slot.duration,
				exact_location: { place_id: `seed-${slot.place.toLowerCase().replace(/\s/g, '-')}`, name: slot.place, address: slot.address, lat: slot.lat, lng: slot.lng },
				general_area: slot.area,
				general_area_lat: slot.lat + (Math.random() - 0.5) * 0.005,
				general_area_lng: slot.lng + (Math.random() - 0.5) * 0.005
			});
		}
	}

	console.log('\nDone!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
