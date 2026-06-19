/**
 * Backfill / reconcile Resend segments from Supabase (email-only).
 *
 * Usage:
 *   npm run sync:resend                 # reconcile every known contact
 *   npm run sync:resend -- --dry-run    # compute segments, no Resend writes
 *
 * Reads every known email (contacts + invitations), asks the DB for each email's
 * authoritative segment via contact_segment(), and reconciles Resend so the
 * contact sits in exactly one of waitlist / invited / member. Sends NO email and
 * pushes no personal data beyond the email — same core as the live webhook
 * (src/lib/server/resend-segments-core.ts), imported, not copied.
 *
 * Run once after wiring the webhook to catch everyone already in the DB, then the
 * webhook keeps things live. Idempotent — safe to re-run; it reports any emails
 * that failed so a re-run targets the remainder.
 *
 * Env (from .env / .env.local via dotenv): PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_SEGMENT_WAITLIST,
 * RESEND_SEGMENT_INVITED, RESEND_SEGMENT_MEMBER.
 */

import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	syncContactSegment,
	type ResendConfig,
	type Segment
} from '../src/lib/server/resend-segments-core';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cfg: ResendConfig = {
	apiKey: process.env.RESEND_API_KEY ?? '',
	segmentIds: {
		waitlist: process.env.RESEND_SEGMENT_WAITLIST ?? '',
		invited: process.env.RESEND_SEGMENT_INVITED ?? '',
		member: process.env.RESEND_SEGMENT_MEMBER ?? ''
	}
};
const DRY_RUN = process.argv.includes('--dry-run');
const PAGE = 1000;

function requireConfig() {
	const missing = Object.entries({
		PUBLIC_SUPABASE_URL: SUPABASE_URL,
		SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
		RESEND_API_KEY: cfg.apiKey,
		RESEND_SEGMENT_WAITLIST: cfg.segmentIds.waitlist,
		RESEND_SEGMENT_INVITED: cfg.segmentIds.invited,
		RESEND_SEGMENT_MEMBER: cfg.segmentIds.member
	})
		.filter(([, v]) => !v)
		.map(([k]) => k);
	if (missing.length) {
		console.error(`Missing required env: ${missing.join(', ')}`);
		process.exit(1);
	}
}

/** Page through a table's emails so we don't silently truncate at PostgREST's 1000-row default. */
async function collectEmails(supabase: SupabaseClient, table: string, into: Set<string>) {
	for (let from = 0; ; from += PAGE) {
		const { data, error } = await supabase
			.from(table)
			.select('email')
			.range(from, from + PAGE - 1);
		if (error) throw new Error(`${table}: ${error.message}`);
		for (const r of data ?? []) if (r.email) into.add(String(r.email).trim().toLowerCase());
		if (!data || data.length < PAGE) break;
	}
}

async function main() {
	requireConfig();
	const supabase = createClient(SUPABASE_URL as string, SERVICE_KEY as string, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const emails = new Set<string>();
	await collectEmails(supabase, 'contacts', emails);
	await collectEmails(supabase, 'invitations', emails);

	console.log(`Reconciling ${emails.size} contacts${DRY_RUN ? ' (dry run — no Resend writes)' : ''}...`);
	const counts: Record<string, number> = { waitlist: 0, invited: 0, member: 0, unknown: 0 };
	const failed: string[] = [];

	for (const email of emails) {
		const { data: segment, error } = await supabase.rpc('contact_segment', { p_email: email });
		if (error) {
			console.warn(`  contact_segment(${email}) failed: ${error.message}`);
			failed.push(email);
			continue;
		}
		if (!segment) {
			counts.unknown++;
			continue;
		}
		counts[segment as string] = (counts[segment as string] ?? 0) + 1;
		if (DRY_RUN) {
			console.log(`  [dry-run] ${email} -> ${segment}`);
			continue;
		}
		const ok = await syncContactSegment(cfg, email, segment as Segment);
		if (!ok) failed.push(email);
	}

	console.log(
		`Done. waitlist=${counts.waitlist} invited=${counts.invited} member=${counts.member} unknown=${counts.unknown}`
	);
	if (failed.length) {
		console.error(`\n${failed.length} email(s) failed to reconcile (re-run to retry):`);
		for (const e of failed) console.error(`  ${e}`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
