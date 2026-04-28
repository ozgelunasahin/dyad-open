import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainError } from '$lib/domain/errors.js';
import { handleServiceError } from './handle-service-error.js';

describe('handleServiceError', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('surfaces a DomainError message with default 400 status and no reference', async () => {
		const res = handleServiceError(new DomainError('Cannot invite yourself'), '[t]');
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Cannot invite yourself' });
		expect(console.error).not.toHaveBeenCalled();
	});

	it('respects a DomainError custom status', async () => {
		const res = handleServiceError(new DomainError('Forbidden', 403), '[t]');
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: 'Forbidden' });
	});

	it('genericizes a regular Error, includes a reference in both response and log', async () => {
		const supabaseError = new Error('duplicate key value violates unique constraint "uq_x"');
		const res = handleServiceError(supabaseError, '[invitations]');
		expect(res.status).toBe(500);
		const payload = await res.json();
		expect(payload.error).toBe('Something went wrong');
		expect(payload.reference).toMatch(/^[a-z0-9]{8}$/);

		expect(console.error).toHaveBeenCalledTimes(1);
		const logArgs = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(logArgs[0]).toBe(`[invitations] (ref ${payload.reference}) unexpected error:`);
		expect(logArgs[1]).toBe(supabaseError);
	});

	it('genericizes non-Error thrown values and logs with a reference', async () => {
		const res = handleServiceError('bare string', '[t]');
		expect(res.status).toBe(500);
		const payload = await res.json();
		expect(payload.error).toBe('Something went wrong');
		expect(payload.reference).toMatch(/^[a-z0-9]{8}$/);
		expect(console.error).toHaveBeenCalledWith(
			`[t] (ref ${payload.reference}) unexpected error:`,
			'bare string'
		);
	});
});
