export interface ConstellationCard {
	id: string;
	title: string | null;
	snippet: string;
	cover_image_url: string | null;
	author_username: string;
	archived: boolean;
	href: string;
}
