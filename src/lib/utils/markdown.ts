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
			return {
				type: 'wikilink',
				raw: match[0],
				target: match[1].trim().toLowerCase().replace(/\s+/g, '-'),
				alias: match[2]?.trim() || match[1].trim()
			};
		}
	},
	renderer(token) {
		const t = token as WikilinkToken;
		// Escape attributes to prevent XSS via crafted wikilinks
		return `<button type="button" class="wikilink" data-target="${escapeHtml(t.target)}">${escapeHtml(t.alias)}</button>`;
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
