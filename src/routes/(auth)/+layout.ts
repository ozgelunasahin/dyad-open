import type { LayoutLoad } from './$types';

const imageMap: Record<string, string> = {
	'/login': '/images/log-in.jpeg',
	'/join': '/images/log-in.jpeg',
	'/waitlist': '/images/sign-in.jpeg'
};

export const load: LayoutLoad = ({ url }) => {
	return {
		authImage: imageMap[url.pathname] ?? '/images/log-in.jpeg'
	};
};
