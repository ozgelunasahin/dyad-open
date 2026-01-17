import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublishedCanvas, getPublishedCanvasesByUsername } from '$lib/server/db/operations';

export const load: PageServerLoad = async ({ params }) => {
	const canvas = await getPublishedCanvas(params.username, params.page);

	if (!canvas) {
		error(404, 'Page not found');
	}

	// Get all published canvases for navigation
	const allCanvases = await getPublishedCanvasesByUsername(params.username);

	return {
		canvas: {
			id: canvas.id,
			name: canvas.name,
			slug: canvas.slug,
			entryPointNoteId: canvas.entryPointNoteId
		},
		author: {
			username: canvas.user.username
		},
		// Provide list of other canvases for navigation
		siteCanvases: allCanvases.map((c) => ({
			name: c.name,
			slug: c.slug
		})),
		// The iframe will point to the standalone canvas view
		canvasUrl: `/${params.username}/${params.page}`
	};
};
