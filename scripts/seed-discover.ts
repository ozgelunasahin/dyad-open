/**
 * Seed Supabase with the 8 landing-page conversations so they appear on the Discover page.
 *
 * Usage:
 *   npx tsx scripts/seed-discover.ts
 *   npx tsx scripts/seed-discover.ts --owner digit      # specify owner username (default: digit)
 *   npx tsx scripts/seed-discover.ts --dry-run
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing .env variables: PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const args = process.argv.slice(2);
const ownerArg = args.includes('--owner') ? args[args.indexOf('--owner') + 1] : 'digit';
const dryRun = args.includes('--dry-run');

const STORAGE_BASE = 'https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/landing%20page%20images';
const IMG = (n: number) => `${STORAGE_BASE}/${n}.png`;

function slugify(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toTiptapJson(plainText: string) {
	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [{ type: 'text', text: plainText }]
			}
		]
	};
}

// Neighborhood → representative Berlin postcode
const NEIGHBORHOOD_POSTCODES: Record<string, string> = {
	'Prenzlauer Berg': '10437 Prenzlauer Berg',
	'Kreuzberg':       '10961 Kreuzberg',
	'Neukölln':        '12043 Neukölln',
	'Mitte':           '10115 Mitte',
	'Friedrichshain':  '10243 Friedrichshain',
	'Schöneberg':      '10785 Tiergarten',   // closest match in BERLIN_POSTCODES list
	'Charlottenburg':  '10623 Charlottenburg'
};

const CONVERSATIONS = [
	{
		title:       'What does it mean to truly listen?',
		image:       IMG(1),
		neighborhood: 'Prenzlauer Berg',
		body:        'Listening is not merely the absence of speaking. It is an act of attention that requires us to suspend our own internal monologue — the constant hum of interpretation, judgment, and anticipation — long enough to receive what another person is actually offering.',
		date1:       '2026-03-22T19:00:00+01:00',
		date2:       '2026-03-24T18:00:00+01:00'
	},
	{
		title:       "On arriving in a city you didn't choose",
		image:       IMG(2),
		neighborhood: 'Kreuzberg',
		body:        'There is a particular feeling that arrives when you have left somewhere but not yet arrived somewhere else. Not the physical transit — airports and trains are just corridors — but the interior version of it. You carry a history of gestures and references that belong to another place.',
		date1:       '2026-03-23T20:00:00+01:00',
		date2:       null
	},
	{
		title:       'The art of disagreeing well',
		image:       IMG(3),
		neighborhood: 'Neukölln',
		body:        'Somewhere between argument and agreement lies a space most conversations never reach: the place where two people genuinely hold different views and are both changed by the encounter. Disagreement, done well, is an act of respect.',
		date1:       '2026-03-25T19:00:00+01:00',
		date2:       '2026-03-26T17:30:00+01:00'
	},
	{
		title:       'On solitude and the city',
		image:       IMG(4),
		neighborhood: 'Mitte',
		body:        "A city is the only place where you can be completely alone in a crowd. Urban solitude is not the same as rural isolation — it is something chosen, curated, and paradoxically social. You carry yourself through other people's lives without ever touching them.",
		date1:       '2026-03-27T18:30:00+01:00',
		date2:       null
	},
	{
		title:       'What we owe each other as strangers',
		image:       IMG(5),
		neighborhood: 'Friedrichshain',
		body:        'The stranger is a peculiar figure — neither friend nor enemy, neither known nor entirely unknown. What is the minimum we owe someone we will never see again? And what might we gain if we treated that encounter as if it mattered?',
		date1:       '2026-03-28T19:30:00+01:00',
		date2:       '2026-03-29T18:00:00+01:00'
	},
	{
		title:       'On the pleasure of changing your mind',
		image:       IMG(6),
		neighborhood: 'Schöneberg',
		body:        'We treat consistency as a virtue and revision as weakness. But the mind that never changes is not a strong mind — it is a closed one. What would it mean to treat changing your position not as defeat, but as evidence that the conversation worked?',
		date1:       '2026-04-01T20:00:00+01:00',
		date2:       null
	},
	{
		title:       'Language and what slips through it',
		image:       IMG(7),
		neighborhood: 'Mitte',
		body:        'Every language carves the world differently. Some have words for experiences that others cannot name — and with that name comes the ability to notice, to feel, to share. What gets lost in translation is not just vocabulary; it is whole ways of being.',
		date1:       '2026-04-03T19:00:00+01:00',
		date2:       '2026-04-04T17:30:00+01:00'
	},
	{
		title:       'On being a beginner again',
		image:       IMG(8),
		neighborhood: 'Charlottenburg',
		body:        "There is a particular humility required to be a beginner. Most of us spend our adult lives avoiding it — performing competence, staying in lanes we already know. But the beginner's mind is where curiosity lives, unencumbered by the weight of expertise.",
		date1:       '2026-04-05T19:00:00+01:00',
		date2:       null
	}
];

async function main() {
	// 1. Look up owner profile
	const { data: ownerProfile, error: profileErr } = await supabase
		.from('profiles')
		.select('id, username, berlin_based')
		.eq('username', ownerArg)
		.single();

	if (profileErr || !ownerProfile) {
		console.error(`User @${ownerArg} not found in profiles. Make sure they have signed up.`);
		process.exit(1);
	}

	console.log(`Owner: @${ownerProfile.username} (${ownerProfile.id})`);

	// 2. Mark owner as berlin_based if not already
	if (!ownerProfile.berlin_based && !dryRun) {
		await supabase
			.from('profiles')
			.update({ berlin_based: true })
			.eq('id', ownerProfile.id);
		console.log('Set berlin_based=true on owner profile');
	}

	// 3. Check for existing canvases to avoid duplicates
	const { data: existingCanvases } = await supabase
		.from('canvases')
		.select('name')
		.eq('user_id', ownerProfile.id)
		.eq('is_conversation', true);

	const existingTitles = new Set(existingCanvases?.map((c) => c.name) ?? []);

	let created = 0;
	let skipped = 0;

	for (const conv of CONVERSATIONS) {
		if (existingTitles.has(conv.title)) {
			console.log(`  SKIP  "${conv.title}" (already exists)`);
			skipped++;
			continue;
		}

		const canvasId = slugify(conv.title) + '-' + Math.random().toString(36).slice(2, 7);
		const slug = slugify(conv.title);
		const postcode = NEIGHBORHOOD_POSTCODES[conv.neighborhood] ?? null;

		const timeSlots = {
			dates: [
				conv.date1.split('T')[0],
				...(conv.date2 ? [conv.date2.split('T')[0]] : [])
			],
			startTime: '19:00',
			duration: 60
		};

		console.log(`  ${dryRun ? 'WOULD CREATE' : 'CREATE'}  "${conv.title}" → ${conv.neighborhood}`);

		if (dryRun) { created++; continue; }

		// Insert canvas
		const { error: canvasErr } = await supabase
			.from('canvases')
			.insert({
				id:                   canvasId,
				user_id:              ownerProfile.id,
				name:                 conv.title,
				slug:                 slug,
				is_published:         true,
				is_conversation:      true,
				active_this_week:     true,
				cover_image_url:      conv.image ?? null,
				preferred_location:   postcode ? JSON.stringify([postcode]) : null,
				preferred_time_slots: JSON.stringify(timeSlots),
				updated_at:           new Date().toISOString(),
				created_at:           new Date().toISOString()
			});

		if (canvasErr) {
			console.error(`  ERROR creating canvas: ${canvasErr.message}`);
			continue;
		}

		// Insert entry note
		const { error: noteErr } = await supabase
			.from('notes')
			.insert({
				canvas_id:  canvasId,
				user_id:    ownerProfile.id,
				slug:       'main',
				title:      conv.title,
				content:    toTiptapJson(conv.body),
				wikilinks:  [],
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			});

		if (noteErr) {
			console.error(`  ERROR creating note: ${noteErr.message}`);
		}

		created++;
	}

	console.log(`\nDone. ${created} created, ${skipped} skipped.`);
	if (dryRun) console.log('(dry run — nothing was written)');
}

main();
