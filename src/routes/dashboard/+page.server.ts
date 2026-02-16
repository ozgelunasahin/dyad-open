import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { nanoid } from 'nanoid';
import { STARTER_NOTES, STARTER_ENTRY_POINT } from '$lib/starter-notes';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const userId = locals.user.id;

	// Load user's canvases, profile, published canvases, sites, highlights, and conversations in parallel
	const [canvasesResult, profileResult, publishedCanvasesResult, sitesResult, highlightsResult, conversationsResult, archivedResult] = await Promise.all([
		locals.supabase
			.from('canvases')
			.select('id, name, slug, is_published, entry_point_note_id, created_at, updated_at, cover_image_url')
			.eq('user_id', userId)
			.eq('is_conversation', false)
			.neq('is_archived', true)
			.order('updated_at', { ascending: false }),
		locals.supabase
			.from('profiles')
			.select('onboarded, username, can_publish_sites')
			.eq('id', userId)
			.single(),
		locals.supabase
			.from('canvases')
			.select('id, name, slug, user_id, updated_at')
			.eq('is_published', true)
			.neq('user_id', userId)
			.order('updated_at', { ascending: false })
			.limit(20),
		locals.supabase
			.from('sites')
			.select(`id, name, slug, is_published, created_at, updated_at, site_canvases (count)`)
			.eq('user_id', userId)
			.order('updated_at', { ascending: false }),
		locals.supabase
			.from('landing_highlights')
			.select('*')
			.order('position', { ascending: true }),
		locals.supabase
			.from('canvases')
			.select('id, name, slug, is_published, active_this_week, preferred_location, preferred_time_slots, created_at, updated_at')
			.eq('user_id', userId)
			.eq('is_conversation', true)
			.neq('is_archived', true)
			.order('updated_at', { ascending: false }),
		locals.supabase
			.from('canvases')
			.select('id, name, slug, is_published, is_conversation, active_this_week, created_at, updated_at')
			.eq('user_id', userId)
			.eq('is_archived', true)
			.order('updated_at', { ascending: false })
	]);

	// Fetch usernames for published canvases (separate query since no direct FK)
	let publishedCanvases: Array<{
		id: string;
		name: string;
		slug: string;
		user_id: string;
		username: string;
		updated_at: string;
	}> = [];

	if (publishedCanvasesResult.data && publishedCanvasesResult.data.length > 0) {
		const userIds = [...new Set(publishedCanvasesResult.data.map((c) => c.user_id))];
		const { data: profiles } = await locals.supabase
			.from('profiles')
			.select('id, username')
			.in('id', userIds);

		const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) ?? []);
		publishedCanvases = publishedCanvasesResult.data.map((canvas) => ({
			...canvas,
			username: usernameMap.get(canvas.user_id) ?? 'unknown'
		}));
	}

	if (canvasesResult.error) {
		console.error('Failed to load canvases:', canvasesResult.error);
	}

	const canvases = canvasesResult.data ?? [];
	const isOnboarded = profileResult.data?.onboarded ?? false;
	const username = profileResult.data?.username ?? '';
	const canPublishSites = profileResult.data?.can_publish_sites ?? false;

	// Transform sites to include canvas count
	const sites = (sitesResult.data ?? []).map((site) => ({
		id: site.id,
		name: site.name,
		slug: site.slug,
		is_published: site.is_published,
		created_at: site.created_at,
		updated_at: site.updated_at,
		canvas_count: Array.isArray(site.site_canvases)
			? site.site_canvases.length
			: (site.site_canvases as { count: number })?.count ?? 0
	}));

	const highlights = highlightsResult.data ?? [];
	const conversations = conversationsResult.data ?? [];
	const archived = archivedResult.data ?? [];

	// Load waitlist contacts and existing members for admin users
	let waitlist: Array<{ id: string; email: string; name: string | null; freewrite: string | null; created_at: string; invited: boolean }> = [];
	let members: Array<{ id: string; username: string; berlin_based: boolean; created_at: string }> = [];

	if (canPublishSites) {
		const [contactsResult, membersResult, invitationsResult, registeredResult] = await Promise.all([
			locals.supabase
				.from('contacts')
				.select('id, email, name, freewrite, created_at')
				.order('created_at', { ascending: false }),
			locals.supabase
				.from('profiles')
				.select('id, username, berlin_based, created_at')
				.neq('id', userId)
				.order('created_at', { ascending: false }),
			locals.supabase
				.from('invitations')
				.select('email, used_at'),
			locals.supabase.rpc('get_registered_emails')
		]);

		if (contactsResult.error) {
			console.error('Failed to load contacts:', contactsResult.error);
		}
		if (membersResult.error) {
			console.error('Failed to load members:', membersResult.error);
		}
		if (invitationsResult.error) {
			console.error('Failed to load invitations:', invitationsResult.error);
		}
		if (registeredResult.error) {
			console.error('Failed to load registered emails:', registeredResult.error);
		}
		console.log('[DASH] invitations:', invitationsResult.data?.length, 'registered:', registeredResult.data?.length, 'contacts:', contactsResult.data?.length);

		const invitedEmails = new Set(
			(invitationsResult.data ?? []).map((i) => i.email)
		);
		const registeredEmails = new Set(
			(registeredResult.data ?? []).map((r: { email: string }) => r.email)
		);

		waitlist = (contactsResult.data ?? [])
			.filter((c) => !registeredEmails.has(c.email))
			.map((c) => ({
				...c,
				invited: invitedEmails.has(c.email)
			}));

		members = membersResult.data ?? [];
	}

	// Seed starter canvas for users who haven't been onboarded and don't have it yet
	const hasGettingStarted = canvases.some((c) => c.slug === 'getting-started');
	if (!isOnboarded && !hasGettingStarted) {
		const canvasId = nanoid();

		// Create starter canvas FIRST (notes have FK to canvas)
		const { error: canvasError } = await locals.supabase.from('canvases').insert({
			id: canvasId,
			user_id: userId,
			name: 'Getting Started',
			slug: 'getting-started',
			entry_point_note_id: STARTER_ENTRY_POINT
		});

		if (canvasError) {
			console.error('Failed to create starter canvas:', canvasError);
		}

		// Insert starter notes (canvas-scoped, after canvas exists)
		const notesToInsert = STARTER_NOTES.map((note) => ({
			canvas_id: canvasId,
			user_id: userId,
			slug: note.slug,
			title: note.title,
			content: note.content,
			wikilinks: note.wikilinks
		}));

		const { error: notesError } = await locals.supabase.from('notes').insert(notesToInsert);

		if (notesError) {
			console.error('Failed to seed starter notes:', notesError);
		}

		// Mark user as onboarded
		await locals.supabase
			.from('profiles')
			.update({ onboarded: true })
			.eq('id', userId);

		// Return the new canvas in the list (re-fetch to get accurate data)
		const { data: newCanvases } = await locals.supabase
			.from('canvases')
			.select('id, name, slug, is_published, entry_point_note_id, created_at, updated_at')
			.eq('user_id', userId)
			.order('updated_at', { ascending: false });

		return {
			user: locals.user,
			username,
			canvases: newCanvases ?? [],
			publishedCanvases,
			canPublishSites,
			sites,
			highlights,
			conversations,
			archived,
			waitlist,
			members
		};
	}

	return {
		user: locals.user,
		username,
		canvases: canvases ?? [],
		publishedCanvases,
		canPublishSites,
		sites,
		highlights,
		conversations,
		archived,
		waitlist,
		members
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const name = data.get('name');

		if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
			return fail(400, { error: 'Canvas name must be between 1 and 100 characters' });
		}

		// Generate slug from name
		const slug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.substring(0, 50);

		if (!slug) {
			return fail(400, { error: 'Invalid canvas name' });
		}

		const id = nanoid();

		const { error } = await locals.supabase.from('canvases').insert({
			id,
			user_id: locals.user.id,
			name,
			slug
		});

		if (error) {
			if (error.code === '23505') {
				// Unique constraint violation
				return fail(400, { error: 'A canvas with this name already exists' });
			}
			console.error('Create canvas error:', error);
			return fail(500, { error: 'Failed to create canvas' });
		}

		redirect(302, `/canvas/${id}`);
	},

	createWriting: async ({ locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const id = nanoid();
		const slug = `canvas-${id.slice(0, 8)}`;

		const { error: canvasError } = await locals.supabase.from('canvases').insert({
			id,
			user_id: locals.user.id,
			name: 'Untitled',
			slug
		});

		if (canvasError) {
			console.error('Create writing canvas error:', canvasError);
			return fail(500, { error: 'Failed to create canvas' });
		}

		// Insert a starter note with empty title
		const starterSlug = 'start';
		await locals.supabase.from('notes').insert({
			canvas_id: id,
			user_id: locals.user.id,
			slug: starterSlug,
			title: '',
			content: { type: 'doc', content: [{ type: 'paragraph' }] },
			wikilinks: []
		});

		await locals.supabase
			.from('canvases')
			.update({ entry_point_note_id: starterSlug })
			.eq('id', id);

		redirect(302, `/canvas/${id}?edit=start`);
	},

	createConversation: async ({ locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		// Enforce max 3 active conversations per week
		const { data: activeConvos } = await locals.supabase
			.from('canvases')
			.select('id')
			.eq('user_id', locals.user.id)
			.eq('is_conversation', true)
			.eq('active_this_week', true)
			.neq('is_archived', true);

		if ((activeConvos ?? []).length >= 3) {
			return fail(400, { error: 'Maximum 3 active conversations per week' });
		}

		const id = nanoid();
		const slug = `conversation-${id.slice(0, 8)}`;

		// Create conversation canvas (published by default with a starter note)
		const { error: canvasError } = await locals.supabase.from('canvases').insert({
			id,
			user_id: locals.user.id,
			name: 'Untitled',
			slug,
			is_conversation: true,
			is_published: true
		});

		if (canvasError) {
			console.error('Create conversation error:', canvasError);
			return fail(500, { error: 'Failed to create conversation' });
		}

		// Insert a starter note with empty title (user fills it in)
		const starterSlug = 'start';
		await locals.supabase.from('notes').insert({
			canvas_id: id,
			user_id: locals.user.id,
			slug: starterSlug,
			title: '',
			content: { type: 'doc', content: [{ type: 'paragraph' }] },
			wikilinks: []
		});

		// Set the entry point
		await locals.supabase
			.from('canvases')
			.update({ entry_point_note_id: starterSlug })
			.eq('id', id);

		redirect(302, `/canvas/${id}?edit=start`);
	},

	publishAsConversation: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const canvasId = data.get('canvasId');

		if (typeof canvasId !== 'string') {
			return fail(400, { error: 'Invalid canvas ID' });
		}

		const { error: updateError } = await locals.supabase
			.from('canvases')
			.update({
				is_conversation: true,
				is_published: true,
				updated_at: new Date().toISOString()
			})
			.eq('id', canvasId)
			.eq('user_id', locals.user.id);

		if (updateError) {
			return fail(500, { error: 'Failed to publish as conversation' });
		}

		return { success: true };
	},

	toggleActiveThisWeek: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const canvasId = data.get('canvasId');
		const action = data.get('action'); // 'activate' or 'deactivate'

		if (typeof canvasId !== 'string') {
			return fail(400, { error: 'Invalid canvas ID' });
		}

		// Verify conversation exists and belongs to user
		const { data: canvas } = await locals.supabase
			.from('canvases')
			.select('active_this_week')
			.eq('id', canvasId)
			.eq('is_conversation', true)
			.single();

		if (!canvas) {
			return fail(404, { error: 'Conversation not found' });
		}

		if (action === 'activate') {
			// Parse per-slot availability from slotsJson
			const slotsJson = data.get('slotsJson') as string;
			let slots: Array<{ date: string; startTime: string; duration: number; postcode: string; exactLocation: string }> = [];
			try {
				slots = JSON.parse(slotsJson ?? '[]');
			} catch { /* ignore */ }

			if (slots.length === 0 || !slots.every(s => s.startTime && s.postcode)) {
				return fail(400, { error: 'Each slot needs a time and postcode' });
			}

			// Derive unique postcodes for discover-level privacy
			const postcodes = [...new Set(slots.map(s => s.postcode))];

			const { error: updateError } = await locals.supabase
				.from('canvases')
				.update({
					active_this_week: true,
					preferred_time_slots: JSON.stringify({ slots }),
					preferred_location: JSON.stringify(postcodes),
					updated_at: new Date().toISOString()
				})
				.eq('id', canvasId);

			if (updateError) {
				return fail(500, { error: 'Failed to activate conversation' });
			}
		} else {
			// Deactivate — keep stored availability for next time
			const { error: updateError } = await locals.supabase
				.from('canvases')
				.update({
					active_this_week: false,
					updated_at: new Date().toISOString()
				})
				.eq('id', canvasId);

			if (updateError) {
				return fail(500, { error: 'Failed to deactivate conversation' });
			}
		}

		return { success: true };
	},

	toggleArchive: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const canvasId = data.get('canvasId');
		const archive = data.get('archive') === 'true';

		if (typeof canvasId !== 'string') {
			return fail(400, { error: 'Invalid canvas ID' });
		}

		const { error: updateError } = await locals.supabase
			.from('canvases')
			.update({
				is_archived: archive,
				active_this_week: archive ? false : undefined, // deactivate when archiving
				updated_at: new Date().toISOString()
			})
			.eq('id', canvasId);

		if (updateError) {
			return fail(500, { error: 'Failed to update archive status' });
		}

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}

		const data = await request.formData();
		const canvasId = data.get('canvasId');

		if (typeof canvasId !== 'string') {
			return fail(400, { error: 'Invalid canvas ID' });
		}

		// RLS will handle ownership check, but we can verify it exists first
		const { data: canvas } = await locals.supabase
			.from('canvases')
			.select('id')
			.eq('id', canvasId)
			.single();

		if (!canvas) {
			return fail(403, { error: 'Canvas not found or access denied' });
		}

		const { error } = await locals.supabase.from('canvases').delete().eq('id', canvasId);

		if (error) {
			console.error('Delete canvas error:', error);
			return fail(500, { error: 'Failed to delete canvas' });
		}

		return { success: true };
	}
};
