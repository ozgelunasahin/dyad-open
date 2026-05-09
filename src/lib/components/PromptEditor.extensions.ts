/**
 * Canonical TipTap extension list for the conversation editor.
 *
 * This is the single source of truth for which marks and nodes the editor
 * accepts. The Svelte component imports this list to construct the live editor;
 * the parity test (`PromptEditor.parity.test.ts`) imports the same list to
 * assert that every enabled mark/node is in the validator's allowlist. Without
 * this shared module, the test would re-declare the config and could drift
 * silently from the actual component.
 */
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

export const EDITOR_EXTENSIONS = [
	StarterKit.configure({
		// Disable StarterKit's bundled Link so we can register our own with custom attributes.
		link: false,
		// Underline is bundled by StarterKit v3 but not exposed in the toolbar; the
		// validator's ALLOWED_MARK_TYPES does not include it. Disable here to keep
		// the canonical formatting set aligned with what users can produce.
		underline: false,
		// Renderer + sanitizer support h1–h3 only; constrain the editor to match.
		heading: { levels: [1, 2, 3] }
	}),
	Link.configure({
		openOnClick: false,
		HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
	}),
	Image.configure({ inline: false })
];
