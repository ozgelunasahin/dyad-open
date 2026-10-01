import type { LayoutLoad } from './$types';
import { storageUrl } from '$lib/utils/storage-url';

const imageMap: Record<string, { src: string; credit?: string }> = {
	'/login': {
		src: storageUrl('uploads', 'mycelium for waitlist.webp'),
		credit: 'Grafted (2022), painting by artist Klari Reis'
	},
	'/join': { src: '/images/log-in.jpeg' },
	'/signup': {
		src: storageUrl('uploads', 'mycelium for waitlist.webp'),
		credit: 'Grafted (2022), painting by artist Klari Reis'
	}
};

export const load: LayoutLoad = ({ url }) => {
	const image = imageMap[url.pathname] ?? { src: '/images/log-in.jpeg' };
	return {
		authImage: image.src,
		authImageCredit: image.credit ?? null
	};
};
