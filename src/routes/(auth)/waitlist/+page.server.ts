import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Signup is open, so the old request-to-join page is gone. Shared /waitlist
// links (including ?ref=<username> referral links) land on /signup instead.
export const load: PageServerLoad = ({ url }) => {
	redirect(308, `/signup${url.search}`);
};
