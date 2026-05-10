/**
 * Server-side TipTap JSON → HTML renderer.
 *
 * Pure-JS recursive serializer. No DOM dependency: walks the JSON tree and
 * emits HTML strings directly. Safe by construction — every emitted tag is
 * hardcoded against a known allowlist, every text node is HTML-escaped,
 * every attribute value is HTML-escaped, and every URL is validated against
 * a safe-protocol regex before emission.
 *
 * This shape is required for Cloudflare Workers: `@tiptap/html`'s default
 * build needs `window`, the `/server` subpath needs happy-dom (which
 * doesn't bundle into the Workers runtime), and `isomorphic-dompurify` has
 * the same problem. A DOM-free serializer is the only path that works in
 * every V8 runtime.
 *
 * Output is intended for direct insertion via Svelte's `{@html}`. The
 * safe-by-construction guarantees replace runtime sanitization.
 */
import type { JSONContent } from '@tiptap/core';

const SAFE_URL_PROTOCOL = /^(https?:\/\/|mailto:|\/)/i;

/** Escape characters that have special meaning in HTML text content. */
function escapeText(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/** Escape characters dangerous inside an HTML attribute value (double-quoted). */
function escapeAttr(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

interface MarkSpec {
	type: string;
	attrs?: Record<string, unknown>;
}

/**
 * Wrap rendered inner HTML in the appropriate inline tag for a mark.
 * Unknown marks pass through (return inner unchanged) — the safe default
 * is to lose the formatting rather than emit unknown markup.
 */
function applyMark(mark: MarkSpec, inner: string): string {
	switch (mark.type) {
		case 'bold':
			return `<strong>${inner}</strong>`;
		case 'italic':
			return `<em>${inner}</em>`;
		case 'strike':
			return `<s>${inner}</s>`;
		case 'code':
			return `<code>${inner}</code>`;
		case 'link': {
			const href = mark.attrs?.href;
			if (typeof href !== 'string' || !SAFE_URL_PROTOCOL.test(href)) {
				return inner;
			}
			return `<a href="${escapeAttr(href)}" rel="noopener noreferrer">${inner}</a>`;
		}
		default:
			return inner;
	}
}

function renderTextNode(node: JSONContent): string {
	const raw = typeof node.text === 'string' ? node.text : '';
	let html = escapeText(raw);
	const marks = (node.marks ?? []) as MarkSpec[];
	for (const mark of marks) {
		html = applyMark(mark, html);
	}
	return html;
}

function renderChildren(node: JSONContent): string {
	const content = node.content;
	if (!Array.isArray(content)) return '';
	return content.map(renderNode).join('');
}

/**
 * Render a single TipTap node to HTML. The hardcoded switch defines the
 * complete allowlist of node types that produce visible markup; everything
 * else is rendered as bare children (or empty) so unknown types degrade
 * gracefully rather than emitting unsafe markup.
 */
function renderNode(node: JSONContent): string {
	if (!node || typeof node !== 'object') return '';
	if (node.type === 'text') return renderTextNode(node);

	const inner = renderChildren(node);

	switch (node.type) {
		case 'doc':
			return inner;
		case 'paragraph':
			return `<p>${inner}</p>`;
		case 'heading': {
			const level = node.attrs?.level;
			if (level === 1) return `<h1>${inner}</h1>`;
			if (level === 2) return `<h2>${inner}</h2>`;
			if (level === 3) return `<h3>${inner}</h3>`;
			return `<p>${inner}</p>`;
		}
		case 'blockquote':
			return `<blockquote>${inner}</blockquote>`;
		case 'bulletList':
			return `<ul>${inner}</ul>`;
		case 'orderedList':
			return `<ol>${inner}</ol>`;
		case 'listItem':
			return `<li>${inner}</li>`;
		case 'codeBlock':
			return `<pre><code>${inner}</code></pre>`;
		case 'hardBreak':
			return '<br>';
		case 'horizontalRule':
			return '<hr>';
		case 'image': {
			const src = node.attrs?.src;
			if (typeof src !== 'string' || !SAFE_URL_PROTOCOL.test(src)) return '';
			const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
			const title = typeof node.attrs?.title === 'string' ? node.attrs.title : '';
			const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
			return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${titleAttr}>`;
		}
		case 'wikilink': {
			const target = typeof node.attrs?.target === 'string' ? node.attrs.target : '';
			const display = typeof node.attrs?.display === 'string' ? node.attrs.display : target;
			if (!target) return '';
			return `<span class="wikilink wikilink-static" data-target="${escapeAttr(target)}">${escapeText(display)}</span>`;
		}
		default:
			return inner;
	}
}

/**
 * Convert TipTap JSONContent to safe HTML. Output is constructed from a
 * hardcoded tag allowlist with all text and attribute values escaped and
 * URLs validated, so it is safe for direct `{@html}` insertion without
 * runtime sanitization.
 */
export function renderTiptapToHtml(content: JSONContent | null | undefined): string {
	if (!content || typeof content !== 'object') return '';
	return renderNode(content);
}
