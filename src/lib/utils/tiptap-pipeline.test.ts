/**
 * End-to-end pipeline fidelity test.
 *
 * Walks a single TipTap document containing every supported format through
 * validator → renderer → DOMPurify, asserting that the semantic markup for
 * each format survives end-to-end. This is the regression net for the
 * four-layer-sync problem; per-layer tests live in their own files.
 */
import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { renderTiptapToHtml } from './tiptap-html.js';
import { validateTiptapContent } from '../server/validate-tiptap-content.js';

const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content });
const text = (
	value: string,
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
): JSONContent => {
	const node: JSONContent = { type: 'text', text: value };
	if (marks) node.marks = marks;
	return node;
};

const comprehensiveDoc: JSONContent = doc(
	{ type: 'heading', attrs: { level: 1 }, content: [text('h1 title')] },
	{ type: 'heading', attrs: { level: 2 }, content: [text('h2 title')] },
	{ type: 'heading', attrs: { level: 3 }, content: [text('h3 title')] },
	paragraph(
		text('bold ', [{ type: 'bold' }]),
		text('italic ', [{ type: 'italic' }]),
		text('struck ', [{ type: 'strike' }]),
		text('inline-code', [{ type: 'code' }])
	),
	paragraph(text('line one'), { type: 'hardBreak' }, text('line two')),
	{
		type: 'bulletList',
		content: [
			{ type: 'listItem', content: [paragraph(text('alpha'))] },
			{ type: 'listItem', content: [paragraph(text('beta'))] }
		]
	},
	{
		type: 'orderedList',
		content: [{ type: 'listItem', content: [paragraph(text('first'))] }]
	},
	{ type: 'blockquote', content: [paragraph(text('quoted text'))] },
	{ type: 'codeBlock', content: [text('const x = 1')] },
	{ type: 'horizontalRule' },
	paragraph(
		text('a link', [{ type: 'link', attrs: { href: 'https://example.com' } }])
	),
	{ type: 'image', attrs: { src: 'https://example.com/img.png', alt: 'caption' } }
);

describe('TipTap pipeline fidelity (validator → renderer → DOMPurify)', () => {
	it('comprehensive doc: validator passes, renderer emits all expected tags', () => {
		expect(validateTiptapContent(comprehensiveDoc)).toBeNull();

		const html = renderTiptapToHtml(comprehensiveDoc);

		// Block-level tags
		expect(html).toContain('<h1>');
		expect(html).toContain('<h2>');
		expect(html).toContain('<h3>');
		expect(html).toContain('<p>');
		expect(html).toContain('<ul>');
		expect(html).toContain('<ol>');
		expect(html).toContain('<li>');
		expect(html).toContain('<blockquote>');
		expect(html).toContain('<pre>');
		expect(html).toContain('<hr>');

		// Inline tags + marks
		expect(html).toContain('<strong>');
		expect(html).toContain('<em>');
		expect(html).toContain('<s>');
		expect(html).toContain('<code>');
		expect(html).toContain('<br>');
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('src="https://example.com/img.png"');

		// Text content survives
		expect(html).toContain('h1 title');
		expect(html).toContain('quoted text');
		expect(html).toContain('const x = 1');
	});

	it('empty doc: validator passes, renderer returns empty string', () => {
		const empty = doc();
		expect(validateTiptapContent(empty)).toBeNull();
		expect(renderTiptapToHtml(empty)).toBe('');
	});
});

describe('TipTap pipeline negative cases (defense-in-depth)', () => {
	it('h4 heading: validator rejects with level in the message', () => {
		const bad = doc({ type: 'heading', attrs: { level: 4 }, content: [text('deep')] });
		const result = validateTiptapContent(bad);
		expect(result).toMatch(/Invalid heading level/);
		expect(result).toContain('4');
	});

	it('javascript: link href: validator rejects', () => {
		const bad = doc(
			paragraph(
				text('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])
			)
		);
		const result = validateTiptapContent(bad);
		expect(result).toMatch(/Unsafe link href protocol/);
	});

	it('data: link href: validator rejects', () => {
		const bad = doc(
			paragraph(
				text('click', [
					{ type: 'link', attrs: { href: 'data:text/html,<script>alert(1)</script>' } }
				])
			)
		);
		const result = validateTiptapContent(bad);
		expect(result).toMatch(/Unsafe link href protocol/);
	});

	it('wikilink node: validator rejects (renderer-only concern, not editable in API)', () => {
		const bad = doc({ type: 'wikilink', attrs: { target: 'x' } } as unknown as JSONContent);
		const result = validateTiptapContent(bad);
		expect(result).toMatch(/Invalid node type/);
	});

	it('underline mark: validator rejects (canonical set excludes underline)', () => {
		const bad = doc(
			paragraph(text('underlined', [{ type: 'underline' }]))
		);
		const result = validateTiptapContent(bad);
		expect(result).toMatch(/Invalid mark type/);
	});

	it('heading with extra attrs: validator rejects via heading-attrs allowlist', () => {
		const bad = doc({
			type: 'heading',
			attrs: { level: 2, style: 'color:red' },
			content: [text('hi')]
		});
		const result = validateTiptapContent(bad);
		expect(result).toMatch(/Invalid heading attribute/);
	});
});
