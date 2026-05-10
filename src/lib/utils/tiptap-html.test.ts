import { describe, it, expect, vi, afterEach } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';
import type { JSONContent } from '@tiptap/core';
import { renderTiptapToHtml, PURIFY_CONFIG } from './tiptap-html.js';

function doc(...content: JSONContent[]): JSONContent {
	return { type: 'doc', content };
}

function paragraph(...children: JSONContent[]): JSONContent {
	return { type: 'paragraph', content: children };
}

function text(value: string, marks?: Array<{ type: string; attrs?: Record<string, unknown> }>): JSONContent {
	const node: JSONContent = { type: 'text', text: value };
	if (marks) node.marks = marks;
	return node;
}

describe('renderTiptapToHtml extension matrix', () => {
	it('renders paragraphs', () => {
		const html = renderTiptapToHtml(doc(paragraph(text('hello world'))));
		expect(html).toContain('hello world');
		expect(html).toContain('<p>');
	});

	it('renders all heading levels with their tags', () => {
		const html = renderTiptapToHtml(
			doc(
				{ type: 'heading', attrs: { level: 1 }, content: [text('h1 text')] },
				{ type: 'heading', attrs: { level: 2 }, content: [text('h2 text')] },
				{ type: 'heading', attrs: { level: 3 }, content: [text('h3 text')] }
			)
		);
		expect(html).toContain('<h1>h1 text</h1>');
		expect(html).toContain('<h2>h2 text</h2>');
		expect(html).toContain('<h3>h3 text</h3>');
	});

	it('renders bold marks with the <strong> tag', () => {
		const html = renderTiptapToHtml(doc(paragraph(text('bold one', [{ type: 'bold' }]))));
		expect(html).toContain('<strong>bold one</strong>');
	});

	it('renders italic marks with the <em> tag', () => {
		const html = renderTiptapToHtml(doc(paragraph(text('italic one', [{ type: 'italic' }]))));
		expect(html).toContain('<em>italic one</em>');
	});

	it('renders bullet lists', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'bulletList',
				content: [
					{ type: 'listItem', content: [paragraph(text('alpha'))] },
					{ type: 'listItem', content: [paragraph(text('beta'))] }
				]
			})
		);
		expect(html).toContain('alpha');
		expect(html).toContain('beta');
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>');
	});

	it('renders ordered lists', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'orderedList',
				content: [{ type: 'listItem', content: [paragraph(text('first'))] }]
			})
		);
		expect(html).toContain('first');
		expect(html).toContain('<ol>');
	});

	it('renders blockquotes', () => {
		const html = renderTiptapToHtml(
			doc({ type: 'blockquote', content: [paragraph(text('quoted text'))] })
		);
		expect(html).toContain('quoted text');
		expect(html).toContain('<blockquote>');
	});

	it('renders link marks with href', () => {
		const html = renderTiptapToHtml(
			doc(
				paragraph(
					text('a link', [
						{ type: 'link', attrs: { href: 'https://example.com' } }
					])
				)
			)
		);
		expect(html).toContain('a link');
		expect(html).toContain('href="https://example.com"');
	});

	it('renders hard breaks', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('line one'), { type: 'hardBreak' }, text('line two')))
		);
		expect(html).toContain('line one');
		expect(html).toContain('line two');
		expect(html).toContain('<br>');
	});

	it('renders code blocks', () => {
		const html = renderTiptapToHtml(
			doc({ type: 'codeBlock', content: [text('const x = 1')] })
		);
		expect(html).toContain('const x = 1');
		expect(html).toContain('<pre>');
	});

	it('renders inline code marks', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('inline snippet', [{ type: 'code' }])))
		);
		expect(html).toContain('inline snippet');
		expect(html).toContain('<code>');
	});

	it('renders strike marks with <s> tag', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('struck out', [{ type: 'strike' }])))
		);
		expect(html).toContain('struck out');
		expect(html).toContain('<s>');
	});

	it('renders horizontal rules and preserves surrounding text', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('above')), { type: 'horizontalRule' }, paragraph(text('below')))
		);
		expect(html).toContain('above');
		expect(html).toContain('below');
		expect(html).toContain('<hr>');
	});

	it('renders a horizontal rule on its own', () => {
		const html = renderTiptapToHtml(doc({ type: 'horizontalRule' }));
		expect(html).toContain('<hr>');
	});

	it('strips event-handler attributes from <s> via DOMPurify', () => {
		// Forged HTML cannot reach `generateHTML` directly, but a TipTap mark with
		// crafted attrs could in principle propagate something dangerous. DOMPurify
		// is the backstop. Assert that handler-style attributes never survive sanitization.
		const dirty = '<s onclick="alert(1)">struck</s>';
		const cleaned = DOMPurify.sanitize(dirty, PURIFY_CONFIG);
		expect(cleaned).toContain('struck');
		expect(cleaned).not.toContain('onclick');
	});

	it('strips event-handler attributes from <hr> via DOMPurify', () => {
		const dirty = '<hr onload="alert(1)">';
		const cleaned = DOMPurify.sanitize(dirty, PURIFY_CONFIG);
		expect(cleaned).not.toContain('onload');
	});

	it('renders images with safe attrs', () => {
		const html = renderTiptapToHtml(
			doc({ type: 'image', attrs: { src: 'https://example.com/img.png', alt: 'caption' } })
		);
		expect(html).toContain('src="https://example.com/img.png"');
		expect(html).toContain('alt="caption"');
	});

	it('strips javascript: hrefs from link marks via DOMPurify', () => {
		const html = renderTiptapToHtml(
			doc(
				paragraph(
					text('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])
				)
			)
		);
		expect(html).not.toContain('javascript:');
	});

	it('renders a long body without truncation', () => {
		const longText = 'word '.repeat(500).trim();
		const html = renderTiptapToHtml(doc(paragraph(text(longText))));
		expect(html).toContain(longText);
		expect(html).not.toMatch(/…\s*$/);
	});

	it('returns empty string for null', () => {
		expect(renderTiptapToHtml(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(renderTiptapToHtml(undefined)).toBe('');
	});

	it('does not log a duplicate-extension warning', () => {
		// If StarterKit's bundled Link were re-enabled alongside our custom Link,
		// tiptap warns "Duplicate extension names found: ['link']" at every render.
		// In some environments that condition correlates with empty generateHTML output.
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			renderTiptapToHtml(doc(paragraph(text('any text'))));
			const messages = warnSpy.mock.calls.map((c) => String(c[0] ?? ''));
			expect(messages.some((m) => /duplicate/i.test(m))).toBe(false);
		} finally {
			warnSpy.mockRestore();
		}
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});
