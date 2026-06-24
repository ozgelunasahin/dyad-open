import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Opacity lint — the structural defense for the membership / Stripe surface.
 *
 * dyad stores NO payment PII: the memberships table and the Stripe code path
 * persist only opaque references (payment_ref, stripe_*), period/expiry, and a
 * derived active flag. This test fails if a PII column or PII field-read creeps
 * into the scoped files — the "just store this one email" drift the privacy
 * review names. It is a deliberately blunt instrument; brittleness here is the
 * point (it should hurt to add PII).
 *
 * Scope: only this feature's production files. Comments are stripped first so
 * disclaimers like "no email/name/address" don't trip it; *.test.ts files are
 * excluded (fixtures may legitimately name PII).
 */

const ROOT = process.cwd();

// Tokens that must never appear as stored columns or read fields. Word-boundary
// matched. Deliberately NOT broad words like "address"/"tax"/"billing": those
// appear in legitimate Stripe *config* (billing_address_collection,
// automatic_tax, billingPortal) — Stripe is the controller for what it
// collects. The contract is that *dyad* never stores or reads PII back.
const FORBIDDEN = [
	'email',
	'phone',
	'first_name',
	'last_name',
	'full_name',
	'birthdate',
	'date_of_birth',
	'dob',
	'iban',
	'card_number',
	'cardholder',
	'postal_code',
	'customer_details',
	'billing_details',
	'payment_method_details'
];

function stripComments(src: string, isSql: boolean): string {
	let s = src.replace(/\/\*[\s\S]*?\*\//g, ' '); // /* block */ (both SQL and TS)
	s = isSql ? s.replace(/--.*$/gm, ' ') : s.replace(/\/\/.*$/gm, ' ');
	return s;
}

function detectPii(src: string, isSql: boolean): string[] {
	const code = stripComments(src, isSql).toLowerCase();
	const hits: string[] = [];
	for (const tok of FORBIDDEN) {
		if (new RegExp(`\\b${tok}\\b`).test(code)) hits.push(tok);
	}
	return hits;
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...walk(p));
		else out.push(p);
	}
	return out;
}

function scopedFiles(): string[] {
	const files: string[] = [];

	const migDir = join(ROOT, 'supabase/migrations');
	for (const f of readdirSync(migDir)) {
		if (f.endsWith('.sql') && /membership|stripe/i.test(f)) files.push(join(migDir, f));
	}

	for (const rel of [
		'src/lib/server/stripe.ts',
		'src/lib/server/stripe-customer.ts',
		'src/lib/server/membership-webhook.ts',
		'src/lib/services/membership.ts'
	]) {
		const p = join(ROOT, rel);
		if (existsSync(p)) files.push(p);
	}

	for (const rel of ['src/routes/api/membership', 'src/routes/api/stripe']) {
		files.push(...walk(join(ROOT, rel)).filter((f) => f.endsWith('.ts')));
	}

	return files.filter((f) => !f.endsWith('.test.ts'));
}

describe('payment opacity lint', () => {
	it('the detector flags a PII column / field read (guards the guard)', () => {
		expect(detectPii('email TEXT NOT NULL', true)).toContain('email');
		expect(detectPii('const x = session.customer_details.email;', false)).toContain(
			'customer_details'
		);
	});

	it('ignores PII tokens that appear only inside comments', () => {
		expect(detectPii('-- stores no email / name / address', true)).toEqual([]);
		expect(detectPii('// never read customer_details off the event', false)).toEqual([]);
	});

	it('scopes to membership/Stripe files and finds at least one', () => {
		expect(scopedFiles().length).toBeGreaterThan(0);
	});

	it('no membership/Stripe production file stores or reads payment PII', () => {
		const offenders: Record<string, string[]> = {};
		for (const f of scopedFiles()) {
			const hits = detectPii(readFileSync(f, 'utf8'), f.endsWith('.sql'));
			if (hits.length) offenders[f.replace(`${ROOT}/`, '')] = hits;
		}
		expect(offenders, `PII tokens found: ${JSON.stringify(offenders, null, 2)}`).toEqual({});
	});
});
