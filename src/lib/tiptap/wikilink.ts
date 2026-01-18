/**
 * Wikilink extension for Tiptap editor.
 * Renders [[target]] or [[target|display]] as clickable inline nodes.
 */
import { Node, mergeAttributes, InputRule } from '@tiptap/core';

export interface WikilinkOptions {
	HTMLAttributes: Record<string, unknown>;
	onWikilinkClick?: (target: string) => void;
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
					const target = attributes.target.toLowerCase().replace(/\s+/g, '-');
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
					const target = match[1].trim().toLowerCase().replace(/\s+/g, '-');
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
			// When user presses Backspace at the start after a wikilink, delete the wikilink
			Backspace: () =>
				this.editor.commands.command(({ tr, state }) => {
					let isWikilink = false;
					const { selection } = state;
					const { empty, anchor } = selection;

					if (!empty) {
						return false;
					}

					state.doc.nodesBetween(anchor - 1, anchor, (node) => {
						if (node.type.name === this.name) {
							isWikilink = true;
						}
					});

					return isWikilink;
				})
		};
	}
});

export default Wikilink;
