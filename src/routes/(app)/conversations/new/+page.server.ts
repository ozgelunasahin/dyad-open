import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Entry-point for "+ new conversation". Used to create a blank draft row on
 * load, which left stale Untitled drafts behind any time a user opened the
 * editor and navigated away without typing. Now a plain redirect into the
 * editor's virtual `new` path — the row only gets created the first time
 * the user actually saves something.
 */
export const load: PageServerLoad = async () => {
	redirect(303, '/conversations/new/edit');
};
