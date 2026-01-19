import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_TYPES = ['bug', 'feature', 'other'] as const;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CONTEXT_SIZE = 10000; // 10KB

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

// Recursively sanitize object to prevent prototype pollution at any depth
function deepSanitize(obj: unknown): unknown {
	if (obj === null || typeof obj !== 'object') return obj;
	if (Array.isArray(obj)) return obj.map(deepSanitize);
	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (DANGEROUS_KEYS.includes(key)) continue;
		sanitized[key] = deepSanitize(value);
	}
	return sanitized;
}

// Safe JSON parse with recursive prototype pollution protection
function safeJsonParse(input: unknown): Record<string, unknown> {
	if (typeof input !== 'string' || !input) return {};
	try {
		const parsed = JSON.parse(input);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return {};
		}
		const sanitized = deepSanitize(parsed) as Record<string, unknown>;
		// Enforce size limit
		if (JSON.stringify(sanitized).length > MAX_CONTEXT_SIZE) {
			return {};
		}
		return sanitized;
	} catch {
		return {};
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth check (matches codebase pattern)
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();

	// Validate type
	const type = formData.get('type')?.toString();
	if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
		return json({ error: 'Invalid feedback type' }, { status: 400 });
	}

	// Validate description
	const description = formData.get('description')?.toString()?.trim();
	if (!description || description.length < 10) {
		return json({ error: 'Description must be at least 10 characters' }, { status: 400 });
	}
	if (description.length > MAX_DESCRIPTION_LENGTH) {
		return json({ error: 'Description too long' }, { status: 400 });
	}

	// Parse context safely
	const context = safeJsonParse(formData.get('context'));
	const canvasId = formData.get('canvasId')?.toString() || null;

	const { error: dbError } = await locals.supabase.from('feedback').insert({
		user_id: locals.user.id,
		canvas_id: canvasId,
		type,
		description,
		context
	});

	if (dbError) {
		console.error('Failed to save feedback:', dbError);
		return json({ error: 'Failed to save feedback' }, { status: 500 });
	}

	return json({ success: true });
};
