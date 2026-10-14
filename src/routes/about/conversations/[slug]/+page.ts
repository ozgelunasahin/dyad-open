import { error } from '@sveltejs/kit';
import { sampleBySlug } from '$lib/mock/sample-conversations';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
	const conversation = sampleBySlug(params.slug);
	if (!conversation) error(404, 'Conversation not found');
	return { conversation, city: url.searchParams.get('city') === 'amsterdam' ? 'amsterdam' : 'berlin' };
};
