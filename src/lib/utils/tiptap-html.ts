/**
 * Server-side TipTap JSON → sanitized HTML renderer.
 *
 * Used for rendering note content in static section previews.
 * All output MUST be passed through DOMPurify before use in {@html} blocks.
 */
// The `/server` subpath uses a happy-dom polyfill so generateHTML works in
// every runtime (Node SSR, V8 isolates / Cloudflare Workers). The default
// `'@tiptap/html'` export's `browser` build throws when `window` is
// undefined, which is the case on Cloudflare Workers — so always pin the
// server subpath here.
import { generateHTML } from '@tiptap/html/server';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
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
		// Disable StarterKit's bundled Link so we can register our own with custom HTMLAttributes.
		// Including both StarterKit's Link and a separate Link triggers a tiptap duplicate-extension
		// warning that has caused empty render output in some environments.
		link: false,
		// Underline is bundled by StarterKit v3 but not exposed in the editor toolbar.
		// Disable to keep the canonical formatting set aligned with what users can produce.
		underline: false,
		heading: { levels: [1, 2, 3] },
		bulletList: {},
		orderedList: {},
		blockquote: {},
		codeBlock: {},
		code: {},
		bold: {},
		italic: {}
	}),
	Link.configure({
		openOnClick: false,
		HTMLAttributes: {
			class: 'external-link',
			rel: 'noopener noreferrer'
		}
	}),
	WikilinkStatic,
	Image
];

/**
 * DOMPurify configuration.
 * Allow standard HTML elements plus data attributes for wikilinks.
 */
export const PURIFY_CONFIG = {
	ALLOWED_TAGS: [
		'p',
		'br',
		'h1',
		'h2',
		'h3',
		'strong',
		'em',
		's',
		'hr',
		'code',
		'pre',
		'blockquote',
		'ul',
		'ol',
		'li',
		'span',
		'img',
		'a'
	],
	ALLOWED_ATTR: ['class', 'data-target', 'src', 'alt', 'title', 'href', 'target', 'rel']
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

	// Let exceptions propagate so callers can attach context (e.g. prompt id) before logging.
	const html = generateHTML(safeContent, extensions);
	return DOMPurify.sanitize(html, PURIFY_CONFIG);
}
