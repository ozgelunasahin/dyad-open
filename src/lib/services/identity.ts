import { redirect } from '@sveltejs/kit';

export interface Upactor {
	id: string;
	email: string | undefined;
}

export function requireIdentity(locals: App.Locals): Upactor {
	const user = locals.user;
	if (!user) {
		redirect(302, '/login');
	}
	return { id: user.id, email: user.email };
}
