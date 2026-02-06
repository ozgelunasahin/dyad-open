import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadSiteSections, buildLandingCanvasData } from '$lib/server/load-site-sections';
import { renderTiptapToHtml } from '$lib/utils/tiptap-html';
import type { JSONContent } from '@tiptap/core';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const { data: site, error: siteError } = await locals.supabase
		.from('sites')
		.select('id, name, slug, is_published')
		.eq('slug', params.slug)
		.eq('user_id', locals.user.id)
		.single();

	if (siteError || !site) {
		error(404, 'Site not found');
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username')
		.eq('id', locals.user.id)
		.single();

	// Load sections for paginated view
	const { allSections } = await loadSiteSections(locals.supabase, site.id);

	// Also load merged canvas data for click-to-explore
	const { vault, savedPositions } = await buildLandingCanvasData(locals.supabase, site.id);

	// Build nav items from sections
	const navItems = allSections.map((section) => ({
		slug: section.type === 'canvas' ? section.sectionId : section.id,
		name: section.type === 'canvas' ? (section.navLabel || section.name) : section.name,
		type: section.type
	}));

	// Pre-render canvas note content as sanitized HTML
	const renderedSections = allSections.map((section) => {
		if (section.type !== 'canvas') return section;

		const renderedNotes: Record<string, { title: string; html: string }> = {};
		for (const [slug, note] of Object.entries(section.vault.notes)) {
			renderedNotes[slug] = {
				title: note.title,
				html: renderTiptapToHtml(note.content as JSONContent)
			};
		}

		return {
			...section,
			renderedNotes
		};
	});

	return {
		user: locals.user,
		username: profile?.username ?? '',
		site,
		sections: renderedSections,
		navItems,
		vault,
		savedPositions
	};
};
