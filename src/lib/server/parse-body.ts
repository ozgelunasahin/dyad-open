import { json } from '@sveltejs/kit';

/**
 * Parse JSON body from a request, returning a 400 response on failure.
 * An empty body is treated as `{}` — required-field validation belongs to callers.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
	request: Request
): Promise<[T, null] | [null, Response]> {
	const raw = await request.text();
	if (raw.length === 0) return [{} as T, null];
	try {
		return [JSON.parse(raw) as T, null];
	} catch {
		return [null, json({ error: 'Invalid JSON body' }, { status: 400 })];
	}
}
