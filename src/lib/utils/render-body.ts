import type { JSONContent } from '@tiptap/core';
import { renderTiptapToHtml } from './tiptap-html.js';
import { jsonToPlainText } from './json-content.js';
import { escapeHtml } from './escape-html.js';

/**
 * Render a TipTap body to HTML for the conversation detail view.
 *
 * The detail page is a "read the full thing" surface — it must never show a
 * truncated snippet. If the TipTap renderer fails or returns visually empty
 * HTML, fall back to a plain-text projection that preserves all content. Only
 * returns '' when the body itself contains no text at all.
 */
export function renderBodyHtmlOrFallback(
	body: JSONContent | null,
	promptId?: string
): string {
	if (!body) return '';

	try {
		const html = renderTiptapToHtml(body);
		if (hasVisibleText(html)) return html;
	} catch (err) {
		const context = promptId ? ` for prompt ${promptId}` : '';
		console.error(`renderTiptapToHtml failed${context}:`, err);
	}

	const text = jsonToPlainText(body).trim();
	if (!text) return '';

	return text
		.split(/\n+/)
		.filter(Boolean)
		.map((line) => `<p>${escapeHtml(line)}</p>`)
		.join('');
}

/**
 * True iff `html` contains any visible text once tags and whitespace are stripped.
 * Catches all "structurally non-empty but visually blank" cases — single empty
 * paragraph, multiple empty paragraphs, empty heading, whitespace-only paragraph.
 */
function hasVisibleText(html: string): boolean {
	if (!html) return false;
	return html.replace(/<[^>]+>/g, '').trim().length > 0;
}
