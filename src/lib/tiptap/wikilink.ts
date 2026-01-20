/**
 * Wikilink extension for Tiptap editor.
 * Renders [[target]] or [[target|display]] as clickable inline nodes.
 */
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { sanitizeSlug } from '$lib/utils/slug';

export interface WikilinkOptions {
	HTMLAttributes: Record<string, unknown>;
	onWikilinkClick?: (target: string) => void;
	onWikilinkDelete?: (target: string) => void;
	isLinkBroken?: (target: string) => boolean;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		wikilink: {
			/**
			 * Set a wikilink
			 */
			setWikilink: (attributes: { target: string; display?: string }) => ReturnType;
		};
	}
}

export const Wikilink = Node.create<WikilinkOptions>({
	name: 'wikilink',

	group: 'inline',

	inline: true,

	// Atom means it's treated as a single unit - can't put cursor inside
	atom: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			onWikilinkClick: undefined,
			onWikilinkDelete: undefined,
			isLinkBroken: undefined
		};
	},

	addAttributes() {
		return {
			target: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-target'),
				renderHTML: (attributes) => ({
					'data-target': attributes.target
				})
			},
			display: {
				default: null,
				parseHTML: (element) => element.textContent,
				renderHTML: () => ({})
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'button.wikilink[data-target]'
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const target = node.attrs.target;
		const display = node.attrs.display || target;
		const isBroken = this.options.isLinkBroken?.(target) ?? false;

		return [
			'button',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: `wikilink${isBroken ? ' broken' : ''}`,
				type: 'button',
				'data-target': target
			}),
			display
		];
	},

	addCommands() {
		return {
			setWikilink:
				(attributes) =>
				({ commands }) => {
					const target = sanitizeSlug(attributes.target);
					return commands.insertContent({
						type: this.name,
						attrs: {
							target,
							display: attributes.display || attributes.target
						}
					});
				}
		};
	},

	addInputRules() {
		// Match [[target]] or [[target|display]] when user types the closing ]]
		const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

		return [
			new InputRule({
				find: wikilinkRegex,
				handler: ({ range, match, chain }) => {
					const target = sanitizeSlug(match[1]);
					const display = (match[2] || match[1]).trim();

					chain()
						.deleteRange({ from: range.from, to: range.to })
						.insertContentAt(range.from, { type: 'wikilink', attrs: { target, display } })
						.run();
				}
			})
		];
	},

	addKeyboardShortcuts() {
		return {
			// Cmd/Ctrl+K: Universal link creation shortcut (accessibility)
			// Works like '[' - requires selected text
			'Mod-k': ({ editor }) => {
				const { state } = editor;
				const { selection } = state;

				if (selection.empty) return false;

				const selectedText = state.doc.textBetween(selection.from, selection.to);
				if (!selectedText.trim()) return false;

				const target = sanitizeSlug(selectedText);
				editor.chain()
					.deleteSelection()
					.insertContent({
						type: 'wikilink',
						attrs: { target, display: selectedText.trim() }
					})
					.run();

				this.options.onWikilinkClick?.(target);
				return true;
			},

			// Handle '[' key for wikilink creation (only for selected text)
			'[': ({ editor }) => {
				const { state } = editor;
				const { selection } = state;
				const { empty } = selection;

				// Only handle when text is selected - wrap in wikilink
				if (!empty) {
					const selectedText = state.doc.textBetween(selection.from, selection.to);
					if (selectedText.trim()) {
						const target = sanitizeSlug(selectedText);
						editor.chain()
							.deleteSelection()
							.insertContent({
								type: 'wikilink',
								attrs: { target, display: selectedText.trim() }
							})
							.run();
						// Trigger callback to open the linked note
						this.options.onWikilinkClick?.(target);
						return true;
					}
				}

				// Let default '[' insertion happen - user types [[target]] manually
				// and input rule will convert it when they type the closing ]]
				return false;
			},

			// Backspace on a link converts it to plain text (like Gmail/Docs)
			Backspace: ({ editor }) => {
				const { state } = editor;
				const { selection } = state;
				const { $from, empty } = selection;

				// Only handle when cursor is collapsed (not a selection)
				if (!empty) return false;

				// Check if there's a wikilink node immediately before the cursor
				const posBefore = $from.pos - 1;
				if (posBefore < 0) return false;

				const nodeBefore = state.doc.nodeAt(posBefore);
				if (!nodeBefore || nodeBefore.type.name !== 'wikilink') return false;

				// Get the target and display text from the link
				const target = nodeBefore.attrs.target;
				const displayText = nodeBefore.attrs.display || target;

				// Replace the wikilink with plain text
				const from = posBefore;
				const to = posBefore + nodeBefore.nodeSize;

				editor.chain()
					.deleteRange({ from, to })
					.insertContentAt(from, displayText)
					.run();

				// Notify that this link was deleted (to close the linked card)
				this.options.onWikilinkDelete?.(target);

				return true;
			}
		};
	}
});

export default Wikilink;
