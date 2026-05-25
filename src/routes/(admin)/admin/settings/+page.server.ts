import { getEmailNotificationsEnabled } from '$lib/server/app-settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const emailNotificationsEnabled = await getEmailNotificationsEnabled();
	return { emailNotificationsEnabled };
};
