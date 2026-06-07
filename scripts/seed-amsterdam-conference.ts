/**
 * Amsterdam seed, PublicSpaces Conference, June 4–6 2026.
 * Expanded set of conversations, one per major session.
 * Covers all three conference themes: #digitalautonomy #thenextsocials #publicai
 *
 * Run with: npx tsx scripts/seed-amsterdam-conference.ts
 * Requires PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { nanoid } from 'nanoid';

config({ path: '.env.local' });
config({ path: '.env' });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/uploads`;

// ── Seed users ───────────────────────────────────────────────────────────────

const SEED_USERS = [
	{ email: 'nina@dyad.berlin',    password: 'dyad2026!', username: 'nina' },
	{ email: 'tobias@dyad.berlin',  password: 'dyad2026!', username: 'tobias' },
	{ email: 'yasmin@dyad.berlin',  password: 'dyad2026!', username: 'yasmin' },
	{ email: 'daan@dyad.berlin',    password: 'dyad2026!', username: 'daan' },
	{ email: 'fatima@dyad.berlin',  password: 'dyad2026!', username: 'fatima' },
	{ email: 'pieter@dyad.berlin',  password: 'dyad2026!', username: 'pieter' },
];

async function getOrCreateUser(email: string, password: string, username: string): Promise<string> {
	const { data: existing } = await supabase.auth.admin.listUsers();
	const found = existing?.users?.find(u => u.email === email);
	if (found) {
		await supabase.from('profiles').upsert({ id: found.id, username }, { onConflict: 'id' });
		console.log(`  User ${email} already exists`);
		return found.id;
	}
	const { data, error } = await supabase.auth.admin.createUser({
		email, password, email_confirm: true, user_metadata: { username }
	});
	if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
	await supabase.from('profiles').upsert({ id: data.user.id, username }, { onConflict: 'id' });
	console.log(`  Created ${email}`);
	return data.user.id;
}

// ── Amsterdam locations ──────────────────────────────────────────────────────

const AMS = {
	centrum:     { lat: 52.3702, lng: 4.8952, area: 'Centrum' },
	jordaan:     { lat: 52.3754, lng: 4.8821, area: 'Jordaan' },
	dePijp:      { lat: 52.3535, lng: 4.8983, area: 'De Pijp' },
	oost:        { lat: 52.3622, lng: 4.9281, area: 'Oost' },
	westerpark:  { lat: 52.3866, lng: 4.8760, area: 'Westerpark' },
	plantage:    { lat: 52.3663, lng: 4.9128, area: 'Plantage' },
	oudWest:     { lat: 52.3638, lng: 4.8698, area: 'Oud-West' },
	noord:       { lat: 52.4008, lng: 4.9189, area: 'Noord' },
	bos:         { lat: 52.3804, lng: 4.8580, area: 'Bos en Lommer' },
	vondelpark:  { lat: 52.3580, lng: 4.8673, area: 'Vondelpark' },
};

// ── Conference conversations ─────────────────────────────────────────────────
// Each prompt is rooted in a specific session from the June 4–6 program.
// Written as personal, open-ended questions for face-to-face conversation.

const PROMPTS: Array<{
	authorUsername: string;
	title: string;
	body: object;
	slots: Array<{ lat: number; lng: number; area: string; daysFromNow: number; hour: number }>;
}> = [

	// ── Robin Berjon keynote: We Build On Hope ────────────────────────────────
	// Already covered by existing "Is hope a strategy?" prompt, skip

	// ── Designing the Stack (IJzaal) ─────────────────────────────────────────
	{
		authorUsername: 'nina',
		title: 'What would a public square look like if it were designed today?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'The physical public square was not designed for conversation, it emerged from commerce, protest, and accident. Its social texture came from repeated use, from the norms people gradually imposed on it.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'If you were designing a digital public space from scratch, not optimising an existing one, what principles would you refuse to compromise on? And what would you knowingly sacrifice?' }] }
			]
		},
		slots: [
			{ ...AMS.jordaan, daysFromNow: 1, hour: 12 },
			{ ...AMS.centrum, daysFromNow: 1, hour: 18 },
		]
	},

	// ── Democratic Technologies for Social Economy (Expo) ────────────────────
	{
		authorUsername: 'tobias',
		title: 'Have you ever belonged to something that was truly collectively governed?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Co-ops, commons, community centres, Wikipedia, there are models of collective ownership that actually work. But most of us have never experienced one from the inside. We know institutions that are managed for us, or platforms that extract from us.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Have you ever been part of something where you genuinely had a stake in how it was run, not just a vote, but real skin in the game? What did that change about how you participated?' }] }
			]
		},
		slots: [
			{ ...AMS.westerpark, daysFromNow: 1, hour: 13 },
			{ ...AMS.oost, daysFromNow: 2, hour: 19 },
		]
	},

	// ── Libraries Pioneering the Digital Public Space (Studio) ───────────────
	{
		authorUsername: 'yasmin',
		title: 'What does the library get right that the internet gets wrong?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'The public library is one of the few institutions built entirely around access, no commercial transaction, no algorithm deciding what you see, no profile being built from your reading. You arrive, you browse, you leave. The institution does not follow you.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What would it actually take to build digital infrastructure that has that quality? Not just in aspiration, but in the texture of the experience, in how it treats you?' }] }
			]
		},
		slots: [
			{ ...AMS.plantage, daysFromNow: 1, hour: 14 },
			{ ...AMS.oudWest, daysFromNow: 2, hour: 18 },
		]
	},

	// ── An AI of Our Own (keynote, Tatenda Tavingeyi) ────────────────────────
	{
		authorUsername: 'fatima',
		title: 'Whose problems is the AI you use actually optimised to solve?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Most AI systems were trained on data that reflects a particular kind of person, in a particular kind of place, writing in a particular set of languages about a particular set of concerns. The gaps are not random, they are structural.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'When have you felt that a tool was not built for you, that you had to translate yourself into its assumptions to get anything out of it? And what would it feel like if it were the other way around?' }] }
			]
		},
		slots: [
			{ ...AMS.oost, daysFromNow: 1, hour: 17 },
			{ ...AMS.dePijp, daysFromNow: 2, hour: 13 },
		]
	},

	// ── Strength Through Diversity / Euro Social Stack (Studio) ─────────────
	{
		authorUsername: 'pieter',
		title: 'Is a European internet possible, or just a European filter on an American one?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'There is a version of European digital policy that is essentially American infrastructure, but GDPR-compliant and in twelve languages. And there is a more ambitious version: different ownership models, different incentive structures, different assumptions about what the internet is for.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Do you think the first version is the realistic ceiling, or is the second version actually achievable, and if so, what would it require that does not yet exist?' }] }
			]
		},
		slots: [
			{ ...AMS.centrum, daysFromNow: 1, hour: 20 },
			{ ...AMS.jordaan, daysFromNow: 2, hour: 17 },
		]
	},

	// ── Higher Education and the Big Tech Noose (Workspace) ─────────────────
	{
		authorUsername: 'daan',
		title: 'What would you lose if your university stopped using Google?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Universities are some of the last institutions with both the intellectual resources and the public mandate to build alternatives to commercial tech infrastructure. They are also, for the most part, entirely dependent on it.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What would actually be at stake, for you, for the institution, for the people it serves, in a serious effort to reduce that dependency? What would you have to give up, and what might you unexpectedly gain?' }] }
			]
		},
		slots: [
			{ ...AMS.vondelpark, daysFromNow: 1, hour: 15 },
			{ ...AMS.bos, daysFromNow: 2, hour: 20 },
		]
	},

	// ── Growth and Sustainability of the Open Social Web (IJzaal) ────────────
	{
		authorUsername: 'nina',
		title: 'Why do the better alternatives keep losing?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'The open social web has existed in various forms for twenty years. RSS, ActivityPub, email, protocols that are open, decentralised, not owned by any single company. For most people, they have consistently lost to the closed alternatives.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Is this a distribution problem, a design problem, a funding problem, or something deeper, a problem with what people actually want from being online? What would it take to change the answer?' }] }
			]
		},
		slots: [
			{ ...AMS.noord, daysFromNow: 1, hour: 19 },
			{ ...AMS.westerpark, daysFromNow: 2, hour: 12 },
		]
	},

	// ── Holdfast keynote (Erin Kissane) ──────────────────────────────────────
	{
		authorUsername: 'tobias',
		title: 'What does it take to keep going when the conditions are hostile?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Building alternatives to dominant systems is slow, thankless, and usually underfunded. The people who do it are often working against structural incentives that favour the incumbent, in attention, in capital, in the path of least resistance.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What sustains that kind of work over years, not just weeks? Not in theory, personally. What have you seen or experienced that actually holds?' }] }
			]
		},
		slots: [
			{ ...AMS.dePijp, daysFromNow: 1, hour: 16 },
			{ ...AMS.plantage, daysFromNow: 2, hour: 19 },
		]
	},

	// ── Everything in Moderation (Expo workshop) ─────────────────────────────
	{
		authorUsername: 'yasmin',
		title: 'Who should decide what counts as acceptable speech, and by what right?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Moderation is always a political act. Every decision about what stays and what goes encodes a set of values, about harm, context, power, whose complaints matter. The question is not whether to moderate but who should do it, under what accountability, and with what legitimacy.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Have you ever been on the wrong end of a moderation decision, or watched someone else be? What did it reveal about whose interests the system was actually protecting?' }] }
			]
		},
		slots: [
			{ ...AMS.centrum, daysFromNow: 1, hour: 16 },
			{ ...AMS.oost, daysFromNow: 2, hour: 14 },
		]
	},

	// ── 25 Years of Wikipedia (Studio) ───────────────────────────────────────
	{
		authorUsername: 'daan',
		title: 'What has Wikipedia taught us about what people will do for free?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Wikipedia is one of the most improbable things on the internet: a collaboratively written encyclopaedia that is mostly accurate, available in hundreds of languages, and built by people who were paid nothing and are identifiable to no one.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'What does that existence prove, about motivation, about collective action, about what we will do for something we believe in without financial incentive? And what does it not prove, where does the model break?' }] }
			]
		},
		slots: [
			{ ...AMS.oudWest, daysFromNow: 1, hour: 17 },
			{ ...AMS.bos, daysFromNow: 2, hour: 16 },
		]
	},

	// ── Values vs. Profits / Digital Ethics (IJzaal) ─────────────────────────
	{
		authorUsername: 'fatima',
		title: 'Where is the line you personally won\'t cross online, and why is it there?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Most people have a rough sense of what they won\'t do: share certain things, use certain services, participate in certain platforms. These lines are rarely consistent or fully articulated. They are formed by instinct, experience, and whatever principles feel worth holding onto.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Where is yours? What would push you across it, or what has already pushed you back from somewhere you used to be?' }] }
			]
		},
		slots: [
			{ ...AMS.jordaan, daysFromNow: 2, hour: 12 },
			{ ...AMS.vondelpark, daysFromNow: 2, hour: 18 },
		]
	},

	// ── Defending Digital Rights (IJzaal) ────────────────────────────────────
	{
		authorUsername: 'pieter',
		title: 'What digital right do you actually exercise, and which do you just have on paper?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'GDPR gives Europeans the right to access their data, to be forgotten, to object to automated decisions. In practice, exercising these rights requires knowing they exist, having time to navigate opaque processes, and being willing to absorb the friction of fighting back.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Have you ever actually exercised a digital right? What happened? And what would need to change for rights to be something people use rather than something that exists in policy documents?' }] }
			]
		},
		slots: [
			{ ...AMS.centrum, daysFromNow: 2, hour: 11 },
			{ ...AMS.westerpark, daysFromNow: 2, hour: 20 },
		]
	},

	// ── Sonified Bodies, Algorithmic Friction (Studio) ───────────────────────
	{
		authorUsername: 'nina',
		title: 'Can art make you feel something about algorithms that arguments cannot?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'There is a quality of understanding that comes from embodied experience, movement, sound, sensation, that does not arrive through reading white papers or attending panels. You do not just know a thing, you feel the shape of it.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Has a piece of art, a performance, a film, a composition, anything, ever changed how you understood something about technology? What did it do that the arguments around it didn\'t?' }] }
			]
		},
		slots: [
			{ ...AMS.plantage, daysFromNow: 2, hour: 17 },
			{ ...AMS.noord, daysFromNow: 2, hour: 21 },
		]
	},

	// ── Traceability in Creative Industries (Expo) ───────────────────────────
	{
		authorUsername: 'yasmin',
		title: 'If an AI was trained on your work, what would feel like fair compensation?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'The question of AI training data has mostly been framed as a legal one, what is copyright, what counts as infringement, who can sue. But underneath it is an older question about what we owe each other when we build on each other\'s work.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'If you had made something, writing, images, music, code, and it had been used to train a model that was now generating similar work commercially, what would feel like a fair response? Attribution? Payment? Opt-out? Nothing? And who gets to decide?' }] }
			]
		},
		slots: [
			{ ...AMS.dePijp, daysFromNow: 2, hour: 15 },
			{ ...AMS.centrum, daysFromNow: 2, hour: 20 },
		]
	},

	// ── BlackSky / Community Governance (keynote, Rudy Fraser) ───────────────
	{
		authorUsername: 'tobias',
		title: 'What happens to a community when it migrates from one platform to another?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'When Black Twitter moved, first scattered by the changes to the platform, then more deliberately to Bluesky and other spaces, something migrated with it: jokes, language, rhythms of conversation, ways of naming things. But something also stayed behind, or got lost in transit.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Have you ever experienced a migration, of a community you were part of, from one space to another? What travelled and what didn\'t? What did it reveal about where the community actually lived?' }] }
			]
		},
		slots: [
			{ ...AMS.oost, daysFromNow: 2, hour: 21 },
			{ ...AMS.noord, daysFromNow: 2, hour: 20 },
		]
	},

	// ── Journalism & Democracy / Open Social Web (Grote Zaal) ────────────────
	{
		authorUsername: 'daan',
		title: 'Do you trust journalism more or less than you did five years ago?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'The crisis in journalism is often framed as a business model problem: advertising revenue collapsed, subscriptions don\'t scale, local newsrooms closed. But there is also a trust problem, something about the relationship between journalism and its audience that has shifted and has not returned.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Has your relationship to journalism changed? Not just which outlets you read, but what you use it for, what you believe it can do, what you feel when you read it? What changed, and what changed it?' }] }
			]
		},
		slots: [
			{ ...AMS.jordaan, daysFromNow: 2, hour: 14 },
			{ ...AMS.oudWest, daysFromNow: 2, hour: 19 },
		]
	},

	// ── Cultural Production and AI (Grote Zaal) ───────────────────────────────
	{
		authorUsername: 'fatima',
		title: 'What do you want AI to stay out of, and is that a reasonable ask?',
		body: {
			type: 'doc', content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'There are domains where AI capability and AI deployment feel very different. The fact that a system can compose music, write literature, make legal arguments, or render grief does not settle whether it should, or under what conditions, for whom.' }] },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Is there something you genuinely want AI to leave alone, not because it cannot do it, but because of what it would mean for it to do so? Or do you think that reaction is just unfamiliarity that will pass?' }] }
			]
		},
		slots: [
			{ ...AMS.vondelpark, daysFromNow: 2, hour: 16 },
			{ ...AMS.bos, daysFromNow: 2, hour: 18 },
		]
	},

];

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSlotTime(daysFromNow: number, hour: number): string {
	const d = new Date('2026-06-05T00:00:00Z');
	d.setDate(d.getDate() + daysFromNow);
	d.setUTCHours(hour - 2, 0, 0, 0); // UTC+2 Amsterdam
	return d.toISOString();
}

async function uploadCover(promptId: string): Promise<string | null> {
	try {
		const seed = 'ams2-' + promptId.slice(0, 8);
		const res = await fetch(`https://picsum.photos/seed/${seed}/800/400`);
		const buffer = Buffer.from(await res.arrayBuffer());
		const path = `seed/${seed}.jpg`;
		await supabase.storage.from('uploads').upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
		return `${STORAGE_BASE}/${path}`;
	} catch {
		return null;
	}
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
		console.log(`  Skipping "${title.slice(0, 55)}" (exists)`);
		return;
	}

	const promptId = nanoid();
	const coverUrl = await uploadCover(promptId);

	const { error } = await supabase.from('prompts').insert({
		id: promptId,
		author_id: authorId,
		title,
		body,
		state: 'published',
		region: 'amsterdam',
		published_at: new Date().toISOString(),
		cover_image_url: coverUrl,
	});

	if (error) {
		console.error(`  Failed "${title.slice(0, 55)}": ${error.message}`);
		return;
	}

	for (const slot of slots) {
		const { error: slotErr } = await supabase.from('time_slots').insert({
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
		if (slotErr) console.error(`  Slot error for "${title.slice(0, 40)}": ${slotErr.message}`);
	}

	console.log(`  ✓ "${title.slice(0, 60)}"${coverUrl ? ' + cover' : ''}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log('Creating seed users...');
	const userIds = new Map<string, string>();
	for (const u of SEED_USERS) {
		const id = await getOrCreateUser(u.email, u.password, u.username);
		userIds.set(u.username, id);
	}

	console.log(`\nSeeding ${PROMPTS.length} conversations...`);
	for (const p of PROMPTS) {
		const authorId = userIds.get(p.authorUsername);
		if (!authorId) { console.error(`  Missing author ${p.authorUsername}`); continue; }
		await createPrompt(authorId, p.title, p.body, p.slots);
	}

	console.log(`\nDone. ${PROMPTS.length} conversations seeded for Amsterdam.`);
}

main().catch(console.error);
