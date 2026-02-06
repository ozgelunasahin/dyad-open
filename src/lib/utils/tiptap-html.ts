/**
 * Server-side TipTap JSON → sanitized HTML renderer.
 *
 * Used for rendering note content in static section previews.
 * All output MUST be passed through DOMPurify before use in {@html} blocks.
 */
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Server-side wikilink extension (render-only, no interactive features).
 * Renders wikilinks as spans with data attributes for styling.
 * In static previews, these are non-interactive visual elements.
 */
const WikilinkStatic = Node.create({
	name: 'wikilink',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			target: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-target'),
				renderHTML: (attributes) => ({
					'data-target': attributes.target
				})
			},
			display: {
				default: null,
				parseHTML: (element) => element.textContent,
				renderHTML: () => ({})
			}
		};
	},

	parseHTML() {
		return [{ tag: 'span.wikilink[data-target]' }];
	},

	renderHTML({ node, HTMLAttributes }) {
		const target = node.attrs.target;
		const display = node.attrs.display || target;

		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				class: 'wikilink wikilink-static',
				'data-target': target
			}),
			display
		];
	}
});

/**
 * Extensions registered for server-side HTML generation.
 * Must match the extensions used in TiptapEditor.svelte.
 */
const extensions = [
	StarterKit.configure({
		heading: { levels: [1, 2, 3] },
		bulletList: {},
		orderedList: {},
		blockquote: {},
		codeBlock: {},
		code: {},
		bold: {},
		italic: {}
	}),
	WikilinkStatic,
	Image
];

/**
 * DOMPurify configuration.
 * Allow standard HTML elements plus data attributes for wikilinks.
 */
const PURIFY_CONFIG = {
	ALLOWED_TAGS: [
		'p',
		'br',
		'h1',
		'h2',
		'h3',
		'strong',
		'em',
		'code',
		'pre',
		'blockquote',
		'ul',
		'ol',
		'li',
		'span',
		'img'
	],
	ALLOWED_ATTR: ['class', 'data-target', 'src', 'alt', 'title'],
	ALLOW_DATA_ATTR: true
};

/**
 * Convert TipTap JSONContent to sanitized HTML string.
 *
 * @param content - TipTap document JSON
 * @returns Sanitized HTML string safe for {@html} blocks
 */
export function renderTiptapToHtml(content: JSONContent | null | undefined): string {
	if (!content || typeof content !== 'object') {
		return '';
	}

	// Ensure valid doc structure
	const safeContent =
		content.type === 'doc' ? content : { type: 'doc', content: [{ type: 'paragraph' }] };

	try {
		const html = generateHTML(safeContent, extensions);
		return DOMPurify.sanitize(html, PURIFY_CONFIG);
	} catch (err) {
		console.error('TipTap HTML rendering failed:', err);
		return '';
	}
}
