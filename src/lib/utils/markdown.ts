import { marked, type TokenizerExtension, type RendererExtension, type Tokens } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

interface WikilinkToken extends Tokens.Generic {
	type: 'wikilink';
	raw: string;
	target: string;
	alias: string;
}

// HTML-escape a string to prevent XSS in attribute values
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

const wikilinkExtension: TokenizerExtension & RendererExtension = {
	name: 'wikilink',
	level: 'inline',
	start(src: string) {
		return src.match(/\[\[/)?.index;
	},
	tokenizer(src: string): WikilinkToken | undefined {
		const match = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(src);
		if (match) {
			const rawTarget = match[1].trim();
			// Page links start with / (e.g., [[/username/canvas-slug]])
			// Keep the path as-is for page links, normalize for note links
			const isPageLink = rawTarget.startsWith('/');
			const target = isPageLink
				? rawTarget
				: rawTarget.toLowerCase().replace(/\s+/g, '-');

			return {
				type: 'wikilink',
				raw: match[0],
				target,
				alias: match[2]?.trim() || match[1].trim()
			};
		}
	},
	renderer(token) {
		const t = token as WikilinkToken;
		// Page links (starting with /) get a different class for styling/handling
		const isPageLink = t.target.startsWith('/');
		const className = isPageLink ? 'wikilink pagelink' : 'wikilink';
		// Escape attributes to prevent XSS via crafted wikilinks
		return `<button type="button" class="${className}" data-target="${escapeHtml(t.target)}">${escapeHtml(t.alias)}</button>`;
	}
};

marked.use({ extensions: [wikilinkExtension] });

export function parseMarkdown(content: string): string {
	const html = marked.parse(content, { async: false }) as string;
	// Sanitize HTML to prevent XSS attacks
	return DOMPurify.sanitize(html, {
		ADD_TAGS: ['button'],
		ADD_ATTR: ['data-target']
	});
}

export function extractWikilinks(content: string): string[] {
	const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
	const links: string[] = [];
	let match;
	while ((match = regex.exec(content)) !== null) {
		links.push(match[1].trim().toLowerCase().replace(/\s+/g, '-'));
	}
	return [...new Set(links)];
}
