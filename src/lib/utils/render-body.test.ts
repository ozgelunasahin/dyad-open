import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import { renderBodyHtmlOrFallback } from './render-body.js';
import { renderTiptapToHtml } from './tiptap-html.js';

const realRenderTiptapToHtml = (await vi.importActual<typeof import('./tiptap-html.js')>(
	'./tiptap-html.js'
)).renderTiptapToHtml;

vi.mock('./tiptap-html.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./tiptap-html.js')>();
	return {
		...actual,
		renderTiptapToHtml: vi.fn(actual.renderTiptapToHtml)
	};
});

const mockedRenderTiptapToHtml = vi.mocked(renderTiptapToHtml);

function doc(...content: JSONContent[]): JSONContent {
	return { type: 'doc', content };
}

function paragraph(...children: JSONContent[]): JSONContent {
	return { type: 'paragraph', content: children };
}

function text(value: string): JSONContent {
	return { type: 'text', text: value };
}

function heading(level: 1 | 2 | 3, value: string): JSONContent {
	return { type: 'heading', attrs: { level }, content: [text(value)] };
}

describe('renderBodyHtmlOrFallback', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mockedRenderTiptapToHtml.mockImplementation(realRenderTiptapToHtml as never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns rendered HTML for a normal long body', () => {
		const longText = 'a'.repeat(500);
		const html = renderBodyHtmlOrFallback(doc(paragraph(text(longText))));
		expect(html).toContain(longText);
	});

	it('returns rendered HTML containing all paragraphs', () => {
		const html = renderBodyHtmlOrFallback(
			doc(paragraph(text('first paragraph')), paragraph(text('second paragraph')))
		);
		expect(html).toContain('first paragraph');
		expect(html).toContain('second paragraph');
	});

	it('renders headings without dropping content', () => {
		const html = renderBodyHtmlOrFallback(doc(heading(1, 'a heading'), paragraph(text('body text'))));
		expect(html).toContain('a heading');
		expect(html).toContain('body text');
	});

	it('returns empty string for null body', () => {
		expect(renderBodyHtmlOrFallback(null)).toBe('');
	});

	it('returns empty string for an empty doc with one empty paragraph', () => {
		expect(renderBodyHtmlOrFallback(doc({ type: 'paragraph' }))).toBe('');
	});

	it('returns empty string for a doc with multiple empty paragraphs', () => {
		expect(renderBodyHtmlOrFallback(doc({ type: 'paragraph' }, { type: 'paragraph' }))).toBe('');
	});

	it('returns empty string when the body has only an empty heading', () => {
		expect(
			renderBodyHtmlOrFallback(doc({ type: 'heading', attrs: { level: 1 } }))
		).toBe('');
	});

	it('never returns content with the snippet ellipsis when given a long body', () => {
		const longText = 'word '.repeat(100).trim();
		const html = renderBodyHtmlOrFallback(doc(paragraph(text(longText))));
		expect(html).not.toMatch(/…\s*$/);
		expect(html).toContain('word word word');
	});

	it('falls back to plain text and escapes HTML when the renderer throws', () => {
		mockedRenderTiptapToHtml.mockImplementation(() => {
			throw new Error('boom');
		});

		const html = renderBodyHtmlOrFallback(
			doc(paragraph(text('safe <script>alert(1)</script>'))),
			'test-id'
		);

		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('safe');
	});

	it('logs the prompt id when the renderer throws', () => {
		mockedRenderTiptapToHtml.mockImplementation(() => {
			throw new Error('boom');
		});
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		renderBodyHtmlOrFallback(doc(paragraph(text('text'))), 'p-123');

		expect(errSpy).toHaveBeenCalled();
		const message = errSpy.mock.calls[0]?.[0];
		expect(String(message)).toContain('p-123');
	});

	it('does not include "for prompt" in log when no prompt id is given', () => {
		mockedRenderTiptapToHtml.mockImplementation(() => {
			throw new Error('boom');
		});
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		renderBodyHtmlOrFallback(doc(paragraph(text('text'))));

		expect(errSpy).toHaveBeenCalled();
		const message = String(errSpy.mock.calls[0]?.[0]);
		expect(message).not.toContain('for prompt');
	});

	it('falls back to plain text covering full content when renderer returns empty', () => {
		mockedRenderTiptapToHtml.mockImplementation(() => '');

		const html = renderBodyHtmlOrFallback(doc(paragraph(text('all the text here'))));

		expect(html).toContain('all the text here');
	});

	it('treats a renderer result of <p></p> as empty and uses the fallback', () => {
		mockedRenderTiptapToHtml.mockImplementation(() => '<p></p>');

		const html = renderBodyHtmlOrFallback(doc(paragraph(text('real content here'))));

		expect(html).toContain('real content here');
	});

	it('treats whitespace-only paragraphs as visually empty and uses the fallback', () => {
		mockedRenderTiptapToHtml.mockImplementation(() => '<p>   </p>');

		const html = renderBodyHtmlOrFallback(doc(paragraph(text('real content here'))));

		expect(html).toContain('real content here');
	});
});
