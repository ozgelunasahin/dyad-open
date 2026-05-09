import { describe, it, expect } from 'vitest';
import { validateTiptapContent } from './validate-tiptap-content.js';

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });
const text = (value: string) => ({ type: 'text', text: value });

describe('validateTiptapContent — heading attrs', () => {
	it('accepts heading levels 1, 2, and 3', () => {
		for (const level of [1, 2, 3]) {
			const result = validateTiptapContent(
				doc({ type: 'heading', attrs: { level }, content: [text('hi')] })
			);
			expect(result).toBeNull();
		}
	});

	it('rejects heading level 4 with a message naming the level', () => {
		const result = validateTiptapContent(
			doc({ type: 'heading', attrs: { level: 4 }, content: [text('hi')] })
		);
		expect(result).toMatch(/Invalid heading level/);
		expect(result).toContain('4');
	});

	it('rejects heading levels 5 and 6', () => {
		for (const level of [5, 6]) {
			const result = validateTiptapContent(
				doc({ type: 'heading', attrs: { level }, content: [text('hi')] })
			);
			expect(result).toMatch(/Invalid heading level/);
		}
	});

	it('rejects heading with non-numeric level', () => {
		const result = validateTiptapContent(
			doc({ type: 'heading', attrs: { level: 'two' }, content: [text('hi')] })
		);
		expect(result).toMatch(/Invalid heading level/);
	});

	it('rejects heading missing level', () => {
		const result = validateTiptapContent(
			doc({ type: 'heading', attrs: {}, content: [text('hi')] })
		);
		expect(result).toMatch(/Invalid heading level/);
	});

	it('rejects heading with extra attributes (e.g. id, style, onclick)', () => {
		const cases = [
			{ level: 2, id: 'injected' },
			{ level: 2, style: 'color: red' },
			{ level: 2, onclick: 'alert(1)' }
		];
		for (const attrs of cases) {
			const result = validateTiptapContent(
				doc({ type: 'heading', attrs, content: [text('hi')] })
			);
			expect(result).toMatch(/Invalid heading attribute/);
		}
	});
});

describe('validateTiptapContent — existing invariants stay intact', () => {
	it('accepts a basic doc with paragraphs', () => {
		const result = validateTiptapContent(doc(paragraph(text('hello'))));
		expect(result).toBeNull();
	});

	it('rejects unknown node types', () => {
		const result = validateTiptapContent(doc({ type: 'wikilink', attrs: { target: 'x' } }));
		expect(result).toMatch(/Invalid node type/);
	});

	it('rejects unknown mark types', () => {
		const result = validateTiptapContent(
			doc(paragraph({ ...text('x'), marks: [{ type: 'underline' }] }))
		);
		expect(result).toMatch(/Invalid mark type/);
	});

	it('rejects javascript: link href', () => {
		const result = validateTiptapContent(
			doc(
				paragraph({
					...text('x'),
					marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
				})
			)
		);
		expect(result).toMatch(/Unsafe link href protocol/);
	});

	it('rejects data: link href', () => {
		const result = validateTiptapContent(
			doc(
				paragraph({
					...text('x'),
					marks: [{ type: 'link', attrs: { href: 'data:text/html,<script>' } }]
				})
			)
		);
		expect(result).toMatch(/Unsafe link href protocol/);
	});
});
