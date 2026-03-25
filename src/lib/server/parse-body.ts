import { json } from '@sveltejs/kit';

/**
 * Parse JSON body from a request, returning a 400 response on failure.
 * Returns [body, null] on success or [null, Response] on failure.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
	request: Request
): Promise<[T, null] | [null, Response]> {
	try {
		const body = await request.json();
		return [body as T, null];
	} catch {
		return [null, json({ error: 'Invalid JSON body' }, { status: 400 })];
	}
}
