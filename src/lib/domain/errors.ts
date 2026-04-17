/**
 * DomainError — raised by services when the message is safe to surface to the
 * caller. Routed by handleServiceError to the HTTP response with its status.
 *
 * Use for user-facing validation and intent failures:
 *   throw new DomainError('Cannot invite yourself')
 *   throw new DomainError('You already responded to this conversation', 409)
 *
 * Do NOT wrap Supabase or Postgres errors in DomainError — those must flow
 * through the generic 500 path so internals never leak to the client.
 */
export class DomainError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = 'DomainError';
		this.status = status;
	}
}
