import { marked, type TokenizerExtension, type RendererExtension, type Tokens } from 'marked';

interface WikilinkToken extends Tokens.Generic {
	type: 'wikilink';
	raw: string;
	target: string;
	alias: string;
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
		return `<button type="button" class="wikilink" data-target="${t.target}">${t.alias}</button>`;
	}
};

marked.use({ extensions: [wikilinkExtension] });

export function parseMarkdown(content: string): string {
	return marked.parse(content, { async: false }) as string;
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
