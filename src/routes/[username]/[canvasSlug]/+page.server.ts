import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublishedCanvas, getCardPositions } from '$lib/server/db/operations';

export const load: PageServerLoad = async ({ params }) => {
	const result = await getPublishedCanvas(params.username, params.canvasSlug);

	if (!result) {
		error(404, 'Canvas not found');
	}

	// Load saved card positions
	const cardPositions = await getCardPositions(result.id);

	return {
		canvas: result,
		author: {
			username: result.user.username
		},
		cardPositions,
		readOnly: true
	};
};
