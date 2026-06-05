import { describe, it, expect, beforeEach, vi } from 'vitest';

// The guest home-corner guard in this handler is the only server-side
// barrier against a corner-exclusive member publishing into the commons via
// a direct API call (plan R8) — the UI merely hides the option.

const listMyScopesMock = vi.fn();
vi.mock('$lib/services/scope.js', () => ({
	SupabaseScopeService: class {
		listMyScopes = listMyScopesMock;
	}
}));

const publishMock = vi.fn();
vi.mock('$lib/services/prompt-command.js', () => ({
	SupabasePromptCommandService: class {
		publish = publishMock;
	}
}));

vi.mock('$lib/services/identity.js', () => ({
	requireIdentity: () => ({ id: 'guest-1' })
}));

const { POST } = await import('./+server.js');

// Build a chainable thenable that resolves to `{ data, error }`.
function chain(data: unknown) {
	const result = { data, error: null };
	const builder: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'single']) builder[m] = () => builder;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	return builder;
}

const SLOT = {
	start_time: new Date(Date.now() + 48 * 3600_000).toISOString(),
	duration_minutes: 60,
	location: { place_id: 'p1', name: 'Venue', address: 'Somewhere 1', lat: 52.37, lng: 4.9 }
};

function makeEvent(body: Record<string, unknown>, homeScope: string | null) {
	const supabaseFromMock = vi.fn(() => chain({ cover_image_url: 'https://x/storage/img.jpg' }));
	return {
		params: { id: 'prompt-1' },
		request: new Request('http://localhost/api/prompts/prompt-1/publish', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { supabase: { from: supabaseFromMock }, homeScope, homeRegion: null, user: null }
	};
}

describe('POST /api/prompts/[id]/publish — guest home-corner guard', () => {
	beforeEach(() => {
		listMyScopesMock.mockReset();
		publishMock.mockReset();
		publishMock.mockResolvedValue(undefined);
		listMyScopesMock.mockResolvedValue([{ scope: 'conf-corner', name: 'Conference corner' }]);
	});

	it('rejects a guest publishing to the commons (audience_scope null)', async () => {
		const event = makeEvent({ slots: [SLOT], audience_scope: null }, 'conf-corner');
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(403);
		expect(publishMock).not.toHaveBeenCalled();
	});

	it('rejects a guest publishing to another corner they hold', async () => {
		listMyScopesMock.mockResolvedValue([
			{ scope: 'conf-corner', name: 'Conference corner' },
			{ scope: 'other-corner', name: 'Other corner' }
		]);
		const event = makeEvent({ slots: [SLOT], audience_scope: 'other-corner' }, 'conf-corner');
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(403);
		expect(publishMock).not.toHaveBeenCalled();
	});

	it('allows a guest publishing into their home corner', async () => {
		const event = makeEvent({ slots: [SLOT], audience_scope: 'conf-corner' }, 'conf-corner');
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		expect(publishMock).toHaveBeenCalledWith('prompt-1', 'guest-1', [SLOT], 'conf-corner', null);
	});

	it('leaves commons members unaffected (no home corner)', async () => {
		const event = makeEvent({ slots: [SLOT] }, null);
		const res = await POST(event as unknown as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		expect(publishMock).toHaveBeenCalledWith('prompt-1', 'guest-1', [SLOT], null, null);
	});
});
