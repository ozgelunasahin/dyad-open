import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data, error: err } = await locals.supabase
		.from('newsletter_posts')
		.select('*')
		.eq('id', params.id)
		.single();

	if (err || !data) error(404, 'Post not found');
	return { post: data };
};
