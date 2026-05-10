import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { renderTiptapToHtml } from './tiptap-html.js';

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

describe('renderTiptapToHtml — node and mark rendering', () => {
	it('renders paragraphs', () => {
		expect(renderTiptapToHtml(doc(paragraph(text('hello world')))))
			.toBe('<p>hello world</p>');
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

	it('downgrades h4-h6 to a paragraph (renderer only emits h1-h3)', () => {
		const html = renderTiptapToHtml(
			doc({ type: 'heading', attrs: { level: 4 }, content: [text('deep')] })
		);
		expect(html).toContain('<p>deep</p>');
		expect(html).not.toContain('<h4>');
	});

	it('renders bold marks with <strong>', () => {
		expect(renderTiptapToHtml(doc(paragraph(text('bold one', [{ type: 'bold' }])))))
			.toBe('<p><strong>bold one</strong></p>');
	});

	it('renders italic marks with <em>', () => {
		expect(renderTiptapToHtml(doc(paragraph(text('italic one', [{ type: 'italic' }])))))
			.toBe('<p><em>italic one</em></p>');
	});

	it('renders strike marks with <s>', () => {
		expect(renderTiptapToHtml(doc(paragraph(text('struck out', [{ type: 'strike' }])))))
			.toBe('<p><s>struck out</s></p>');
	});

	it('renders inline code marks with <code>', () => {
		expect(renderTiptapToHtml(doc(paragraph(text('inline snippet', [{ type: 'code' }])))))
			.toBe('<p><code>inline snippet</code></p>');
	});

	it('renders nested marks (bold + italic on the same text)', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('emphatic', [{ type: 'italic' }, { type: 'bold' }])))
		);
		expect(html).toContain('<strong>');
		expect(html).toContain('<em>');
		expect(html).toContain('emphatic');
	});

	it('renders bullet lists with <ul> and <li>', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'bulletList',
				content: [
					{ type: 'listItem', content: [paragraph(text('alpha'))] },
					{ type: 'listItem', content: [paragraph(text('beta'))] }
				]
			})
		);
		expect(html).toBe('<ul><li><p>alpha</p></li><li><p>beta</p></li></ul>');
	});

	it('renders ordered lists with <ol>', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'orderedList',
				content: [{ type: 'listItem', content: [paragraph(text('first'))] }]
			})
		);
		expect(html).toBe('<ol><li><p>first</p></li></ol>');
	});

	it('renders blockquotes with <blockquote>', () => {
		expect(
			renderTiptapToHtml(
				doc({ type: 'blockquote', content: [paragraph(text('quoted text'))] })
			)
		).toBe('<blockquote><p>quoted text</p></blockquote>');
	});

	it('renders code blocks as <pre><code>', () => {
		expect(renderTiptapToHtml(doc({ type: 'codeBlock', content: [text('const x = 1')] })))
			.toBe('<pre><code>const x = 1</code></pre>');
	});

	it('renders hard breaks as <br>', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('line one'), { type: 'hardBreak' }, text('line two')))
		);
		expect(html).toBe('<p>line one<br>line two</p>');
	});

	it('renders horizontal rules as <hr>', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('above')), { type: 'horizontalRule' }, paragraph(text('below')))
		);
		expect(html).toBe('<p>above</p><hr><p>below</p>');
	});

	it('renders link marks with safe href and rel="noopener noreferrer"', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('a link', [{ type: 'link', attrs: { href: 'https://example.com' } }])))
		);
		expect(html).toContain('<a href="https://example.com" rel="noopener noreferrer">a link</a>');
	});

	it('renders images with safe src, alt, and optional title', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'image',
				attrs: { src: 'https://example.com/img.png', alt: 'caption', title: 'hover text' }
			})
		);
		expect(html).toBe('<img src="https://example.com/img.png" alt="caption" title="hover text">');
	});

	it('renders wikilink as a span with data-target', () => {
		const html = renderTiptapToHtml({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'wikilink', attrs: { target: 'some-page', display: 'see this' } }
					]
				}
			]
		});
		expect(html).toContain('<span class="wikilink wikilink-static" data-target="some-page">see this</span>');
	});

	it('returns empty string for null/undefined', () => {
		expect(renderTiptapToHtml(null)).toBe('');
		expect(renderTiptapToHtml(undefined)).toBe('');
	});

	it('renders a long body without truncation', () => {
		const longText = 'word '.repeat(500).trim();
		const html = renderTiptapToHtml(doc(paragraph(text(longText))));
		expect(html).toContain(longText);
	});
});

describe('renderTiptapToHtml — safety', () => {
	it('escapes HTML special characters in text content', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('<script>alert("xss")</script>')))
		);
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('escapes & in text content', () => {
		const html = renderTiptapToHtml(doc(paragraph(text('a & b'))));
		expect(html).toContain('a &amp; b');
	});

	it('escapes attribute values', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'image',
				attrs: { src: 'https://example.com/img.png', alt: '"quoted" alt' }
			})
		);
		expect(html).toContain('alt="&quot;quoted&quot; alt"');
	});

	it('strips link marks with javascript: href (renders inner text only)', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])))
		);
		expect(html).toBe('<p>click</p>');
		expect(html).not.toContain('javascript:');
		expect(html).not.toContain('<a');
	});

	it('strips link marks with data: href', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('click', [{ type: 'link', attrs: { href: 'data:text/html,<script>' } }])))
		);
		expect(html).toBe('<p>click</p>');
		expect(html).not.toContain('data:');
	});

	it('drops images with unsafe src protocol', () => {
		const html = renderTiptapToHtml(
			doc({ type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'x' } })
		);
		expect(html).toBe('');
	});

	it('drops unknown node types (renders inner content only)', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'unknownNode',
				content: [paragraph(text('inner text'))]
			} as unknown as JSONContent)
		);
		expect(html).toBe('<p>inner text</p>');
	});

	it('passes unknown marks through (renders inner text without the mark)', () => {
		const html = renderTiptapToHtml(
			doc(paragraph(text('text', [{ type: 'underline' }])))
		);
		expect(html).toBe('<p>text</p>');
	});

	it('escapes attribute-breaking characters so injected handlers do not become real attributes', () => {
		const html = renderTiptapToHtml(
			doc({
				type: 'image',
				attrs: { src: 'https://example.com/x.png', alt: '" onerror="alert(1)' }
			})
		);
		// The `"` in the alt value would close the attribute and let `onerror=`
		// land as a real attribute. After escaping it becomes `&quot;`, so the
		// `onerror=` substring sits harmlessly inside the alt value.
		expect(html).toContain('alt="&quot; onerror=&quot;alert(1)"');
		// The closing `>` of the <img> appears only at the actual tag end.
		expect(html.match(/>/g)).toHaveLength(1);
	});
});
