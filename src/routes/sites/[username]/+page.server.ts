import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublishedCanvasesByUsername, getUserByUsername } from '$lib/server/db/operations';

export const load: PageServerLoad = async ({ params }) => {
	const user = await getUserByUsername(params.username);

	if (!user) {
		error(404, 'User not found');
	}

	const canvases = await getPublishedCanvasesByUsername(params.username);

	return {
		user: {
			username: user.username
		},
		canvases: canvases.map((c) => ({
			id: c.id,
			name: c.name,
			slug: c.slug,
			entryPointNoteId: c.entryPointNoteId,
			updatedAt: c.updatedAt
		}))
	};
};
