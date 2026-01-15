import { marked, type TokenizerExtension, type RendererExtension, type Tokens } from 'marked';
import DOMPurify from 'dompurify';

interface WikilinkToken extends Tokens.Generic {
	type: 'wikilink';
	raw: string;
	target: string;
	alias: string;
}

// Escape HTML entities to prevent XSS in attributes
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
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
		// Escape both target and alias to prevent XSS
		return `<button type="button" class="wikilink" data-target="${escapeHtml(t.target)}">${escapeHtml(t.alias)}</button>`;
	}
};

marked.use({ extensions: [wikilinkExtension] });

// Configure DOMPurify to allow our wikilink buttons
const ALLOWED_TAGS = [
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'p', 'br', 'hr',
	'ul', 'ol', 'li',
	'blockquote', 'pre', 'code',
	'strong', 'em', 'del', 's',
	'a', 'button',
	'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const ALLOWED_ATTR = ['class', 'data-target', 'type', 'href', 'title'];

export function parseMarkdown(content: string): string {
	const rawHtml = marked.parse(content, { async: false }) as string;
	return DOMPurify.sanitize(rawHtml, {
		ALLOWED_TAGS,
		ALLOWED_ATTR
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
