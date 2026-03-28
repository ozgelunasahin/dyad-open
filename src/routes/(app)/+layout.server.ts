import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/');
	}

	const [{ data: profile }, { count: invitationCount }, { count: feedbackCount }] = await Promise.all([
		locals.supabase
			.from('profiles')
			.select('username')
			.eq('id', locals.user.id)
			.single(),
		locals.supabase
			.from('prompt_invitations')
			.select('*', { count: 'exact', head: true })
			.eq('invitee_id', locals.user.id)
			.eq('state', 'pending'),
		locals.supabase
			.from('feedback_forms')
			.select('*', { count: 'exact', head: true })
			.eq('reviewer_id', locals.user.id)
			.eq('state', 'due')
	]);

	const isAdmin = locals.user?.app_metadata?.role === 'admin';

	return {
		user: locals.user,
		username: profile?.username ?? '',
		attentionCount: (invitationCount ?? 0) + (feedbackCount ?? 0),
		isAdmin
	};
};
