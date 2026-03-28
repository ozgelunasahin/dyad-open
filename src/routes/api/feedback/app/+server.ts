import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import type { RequestHandler } from './$types';

interface AppFeedbackBody {
	type?: string;
	description?: string;
	context?: Record<string, unknown>;
}

/** POST /api/feedback/app — submit in-app feedback (bug report, feature request) */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	const [body, errorResponse] = await parseJsonBody<AppFeedbackBody>(request);
	if (errorResponse) return errorResponse;

	const { type, description, context } = body;

	if (!description || typeof description !== 'string' || description.length < 10) {
		return json({ error: 'Feedback must be at least 10 characters' }, { status: 400 });
	}

	// Sanitize context fields
	const sanitizedContext: Record<string, unknown> = {};
	if (context && typeof context === 'object') {
		if (typeof context.page_url === 'string') sanitizedContext.page_url = context.page_url.slice(0, 2048);
		if (typeof context.user_agent === 'string') sanitizedContext.user_agent = context.user_agent.slice(0, 512);
		if (Array.isArray(context.recent_errors)) sanitizedContext.recent_errors = context.recent_errors.slice(0, 10);
	}

	const { error: dbError } = await locals.supabase
		.from('feedback')
		.insert({
			user_id: user.id,
			type: ['bug', 'feature', 'other'].includes(type ?? '') ? type : 'other',
			description: description.slice(0, 5000),
			context: sanitizedContext
		});

	if (dbError) {
		console.error('[feedback/app] Insert failed:', dbError);
		return json({ error: 'Failed to submit feedback' }, { status: 500 });
	}

	return json({ ok: true });
};
