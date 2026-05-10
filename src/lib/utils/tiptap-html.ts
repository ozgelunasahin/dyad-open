/**
 * Server-side TipTap JSON → HTML renderer.
 *
 * Pure-JS recursive serializer with no DOM dependency: walks the JSON tree
 * and emits HTML strings directly. Safe by construction — every emitted
 * tag comes from a hardcoded allowlist, every text node and attribute
 * value is HTML-escaped, and every URL is validated against the shared
 * `SAFE_URL_PROTOCOL` allowlist before emission. Output is intended for
 * direct insertion via Svelte's `{@html}`; the safe-by-construction
 * guarantees replace runtime sanitization.
 */
import type { JSONContent } from '@tiptap/core';
import { SAFE_URL_PROTOCOL } from './safe-url.js';

/** Canonical mark shape exposed by `JSONContent.marks`. */
type Mark = NonNullable<JSONContent['marks']>[number];

/** Escape characters that have special meaning in HTML text content. */
function escapeText(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Escape characters that would break out of a double-quoted HTML attribute
 * value. All attribute emission in this file uses double quotes; escaping
 * `"` is what enforces that boundary. Single quotes are not handled here
 * because no attribute is single-quoted — keep that invariant when adding
 * new tags.
 */
function escapeAttr(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/** Read a string-typed attr from a node's `attrs` bag, or fall back. */
function attrString(attrs: Record<string, unknown> | undefined, key: string): string | undefined {
	const value = attrs?.[key];
	return typeof value === 'string' ? value : undefined;
}

/**
 * Wrap rendered inner HTML in the appropriate inline tag for a mark.
 * Unknown marks pass through (return inner unchanged) — the safe default
 * is to lose the formatting rather than emit unknown markup.
 */
function applyMark(mark: Mark, inner: string): string {
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
			const href = attrString(mark.attrs, 'href');
			if (!href || !SAFE_URL_PROTOCOL.test(href)) return inner;
			const target = attrString(mark.attrs, 'target');
			const targetAttr = target ? ` target="${escapeAttr(target)}"` : '';
			return `<a href="${escapeAttr(href)}"${targetAttr} rel="noopener noreferrer">${inner}</a>`;
		}
		default:
			return inner;
	}
}

function renderTextNode(node: JSONContent): string {
	const raw = typeof node.text === 'string' ? node.text : '';
	let html = escapeText(raw);
	const marks = node.marks ?? [];
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
 * else degrades to bare children (or empty) so unknown types lose markup
 * rather than emitting unsafe tags.
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
			const src = attrString(node.attrs, 'src');
			if (!src || !SAFE_URL_PROTOCOL.test(src)) return '';
			const alt = attrString(node.attrs, 'alt') ?? '';
			const title = attrString(node.attrs, 'title');
			const width = node.attrs?.width;
			const height = node.attrs?.height;
			const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
			const widthAttr =
				typeof width === 'number' || (typeof width === 'string' && width)
					? ` width="${escapeAttr(String(width))}"`
					: '';
			const heightAttr =
				typeof height === 'number' || (typeof height === 'string' && height)
					? ` height="${escapeAttr(String(height))}"`
					: '';
			return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${titleAttr}${widthAttr}${heightAttr}>`;
		}
		case 'wikilink': {
			const target = attrString(node.attrs, 'target');
			if (!target) return '';
			const display = attrString(node.attrs, 'display') || target;
			return `<span class="wikilink wikilink-static" data-target="${escapeAttr(target)}">${escapeText(display)}</span>`;
		}
		default:
			return inner;
	}
}

/**
 * Convert TipTap JSONContent to safe HTML for direct `{@html}` insertion.
 */
export function renderTiptapToHtml(content: JSONContent | null | undefined): string {
	if (!content || typeof content !== 'object') return '';
	return renderNode(content);
}
