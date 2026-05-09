/**
 * Editor-validator parity test (drift gate).
 *
 * Asks the editor itself which marks and nodes its current configuration
 * produces, and asserts each one is in the validator's allowlist. This is the
 * regression net for the failure mode that produced the Underline bug:
 * an upstream package change (`@tiptap/starter-kit`) silently enabled a
 * mark/node in the editor that the validator did not allow.
 *
 * The pipeline test (tiptap-pipeline.test.ts) covers known formats. This test
 * covers whatever the editor currently produces, regardless of whether the
 * test author thought to enumerate it.
 */
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { EDITOR_EXTENSIONS } from './PromptEditor.extensions.js';
import {
	ALLOWED_NODE_TYPES,
	ALLOWED_MARK_TYPES
} from '../server/validate-tiptap-content.js';

const schema = getSchema(EDITOR_EXTENSIONS);
const editorNodeNames = Object.keys(schema.nodes);
const editorMarkNames = Object.keys(schema.marks);

describe('Editor-validator parity', () => {
	it('every node the editor enables is in ALLOWED_NODE_TYPES', () => {
		const missing = editorNodeNames.filter((name) => !ALLOWED_NODE_TYPES.has(name));
		expect(
			missing,
			missing.length > 0
				? `Nodes [${missing.join(', ')}] are enabled in the editor but missing from ALLOWED_NODE_TYPES. ` +
					`Either add each name to validate-tiptap-content.ts ALLOWED_NODE_TYPES, or disable the extension ` +
					`in PromptEditor.extensions.ts (e.g. \`StarterKit.configure({ <name>: false })\`).`
				: ''
		).toEqual([]);
	});

	it('every mark the editor enables is in ALLOWED_MARK_TYPES', () => {
		const missing = editorMarkNames.filter((name) => !ALLOWED_MARK_TYPES.has(name));
		expect(
			missing,
			missing.length > 0
				? `Marks [${missing.join(', ')}] are enabled in the editor but missing from ALLOWED_MARK_TYPES. ` +
					`Either add each name to validate-tiptap-content.ts ALLOWED_MARK_TYPES, or disable the extension ` +
					`in PromptEditor.extensions.ts (e.g. \`StarterKit.configure({ <name>: false })\`).`
				: ''
		).toEqual([]);
	});

	it('exposes the expected baseline marks and nodes (sanity check)', () => {
		// Guards against the test silently passing because the schema came back empty.
		expect(editorNodeNames).toContain('doc');
		expect(editorNodeNames).toContain('paragraph');
		expect(editorNodeNames).toContain('heading');
		expect(editorMarkNames).toContain('bold');
		expect(editorMarkNames).toContain('link');

		// Underline is disabled in EDITOR_EXTENSIONS; explicit assertion that it stays disabled.
		expect(editorMarkNames).not.toContain('underline');
	});
});
