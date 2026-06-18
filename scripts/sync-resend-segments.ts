/**
 * Backfill / reconcile Resend segments from Supabase.
 *
 * Usage: npx tsx scripts/sync-resend-segments.ts
 *
 * Reads every known email (contacts + invitations), asks the DB for each
 * email's authoritative segment via the contact_segment() RPC, and reconciles
 * Resend so the contact sits in exactly one of waitlist / invited / member.
 *
 * Sends NO email — only manages segment membership. Run once after wiring the
 * webhook to catch everyone already in the DB (e.g. waitlist signups who were
 * never pushed to Resend), then the webhook keeps things live.
 *
 * Reads from .env / .env.local:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   RESEND_API_KEY, RESEND_SEGMENT_WAITLIST, RESEND_SEGMENT_INVITED,
 *   RESEND_SEGMENT_MEMBER
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv(path: string): Record<string, string> {
	if (!existsSync(path)) return {};
	const env: Record<string, string> = {};
	for (const line of readFileSync(path, 'utf-8').split('\n')) {
		const match = line.match(/^([^#=]+)=(.*)$/);
		if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
	}
	return env;
}

const config = {
	...loadEnv(resolve(process.cwd(), '.env.local')),
	...loadEnv(resolve(process.cwd(), '.env'))
};

const SUPABASE_URL = config.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = config.RESEND_API_KEY;
const SEGMENT_IDS: Record<string, string | undefined> = {
	waitlist: config.RESEND_SEGMENT_WAITLIST,
	invited: config.RESEND_SEGMENT_INVITED,
	member: config.RESEND_SEGMENT_MEMBER
};

function requireConfig() {
	const missing = Object.entries({
		PUBLIC_SUPABASE_URL: SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
		RESEND_API_KEY,
		RESEND_SEGMENT_WAITLIST: SEGMENT_IDS.waitlist,
		RESEND_SEGMENT_INVITED: SEGMENT_IDS.invited,
		RESEND_SEGMENT_MEMBER: SEGMENT_IDS.member
	})
		.filter(([, v]) => !v)
		.map(([k]) => k);
	if (missing.length) {
		console.error(`Missing required env: ${missing.join(', ')}`);
		process.exit(1);
	}
}

const RESEND_API = 'https://api.resend.com';

/** Segment add (POST) / remove (DELETE) — no request body needed. */
async function segmentCall(path: string, method: 'POST' | 'DELETE'): Promise<Response> {
	return fetch(`${RESEND_API}${path}`, {
		method,
		headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }
	});
}

async function ensureContact(email: string) {
	const res = await fetch(`${RESEND_API}/contacts`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, unsubscribed: false })
	});
	if (!res.ok && res.status !== 409 && res.status !== 422) {
		console.warn(`  ensureContact ${email}: ${res.status}`);
	}
}

async function reconcile(email: string, segment: string) {
	await ensureContact(email);
	for (const [seg, id] of Object.entries(SEGMENT_IDS)) {
		if (!id) continue;
		const method = seg === segment ? 'POST' : 'DELETE';
		const res = await segmentCall(`/contacts/${encodeURIComponent(email)}/segments/${id}`, method);
		if (!res.ok && res.status !== 404 && res.status !== 409) {
			console.warn(`  ${method} ${seg} for ${email}: ${res.status}`);
		}
	}
}

async function main() {
	requireConfig();
	const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const [{ data: contacts }, { data: invitations }] = await Promise.all([
		supabase.from('contacts').select('email'),
		supabase.from('invitations').select('email')
	]);

	const emails = new Set<string>();
	for (const r of contacts ?? []) if (r.email) emails.add(String(r.email).trim().toLowerCase());
	for (const r of invitations ?? []) if (r.email) emails.add(String(r.email).trim().toLowerCase());

	console.log(`Reconciling ${emails.size} contacts...`);
	const counts: Record<string, number> = { waitlist: 0, invited: 0, member: 0, unknown: 0 };

	for (const email of emails) {
		const { data: segment, error } = await supabase.rpc('contact_segment', { p_email: email });
		if (error) {
			console.warn(`  contact_segment(${email}) failed: ${error.message}`);
			continue;
		}
		if (!segment) {
			counts.unknown++;
			continue;
		}
		await reconcile(email, segment as string);
		counts[segment as string] = (counts[segment as string] ?? 0) + 1;
	}

	console.log(
		`Done. waitlist=${counts.waitlist} invited=${counts.invited} member=${counts.member} unknown=${counts.unknown}`
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
