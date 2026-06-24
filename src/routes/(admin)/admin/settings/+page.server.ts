import { getEmailNotificationsEnabled, getMembershipGating } from '$lib/server/app-settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [emailNotificationsEnabled, membershipGating] = await Promise.all([
		getEmailNotificationsEnabled(),
		getMembershipGating()
	]);
	return { emailNotificationsEnabled, membershipGating };
};
