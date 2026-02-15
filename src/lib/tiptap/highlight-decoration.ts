import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface HighlightRange {
	id: string;
	noteSlug: string;
	selectedText: string;
	startOffset: number;
	endOffset: number;
	active?: boolean;
}

const highlightPluginKey = new PluginKey('highlight-decorations');

/**
 * ProseMirror plugin that renders highlight decorations (visual only, doesn't modify document).
 * Highlights are provided externally and rendered as inline decorations.
 */
export function createHighlightPlugin(highlights: HighlightRange[]) {
	return new Plugin({
		key: highlightPluginKey,
		state: {
			init(_, state) {
				return buildDecorations(state.doc, highlights);
			},
			apply(tr, decorationSet) {
				if (tr.docChanged) {
					return buildDecorations(tr.doc, highlights);
				}
				return decorationSet.map(tr.mapping, tr.doc);
			}
		},
		props: {
			decorations(state) {
				return this.getState(state);
			}
		}
	});
}

function buildDecorations(doc: any, highlights: HighlightRange[]): DecorationSet {
	const decorations: Decoration[] = [];

	for (const highlight of highlights) {
		// Extract plain text from the document to find the highlighted text
		const textContent = getDocText(doc);
		const idx = textContent.indexOf(highlight.selectedText);

		if (idx === -1) continue; // Text changed, orphaned highlight

		// Map the plain-text offset back to a document position
		const positions = textOffsetToDocPos(doc, idx, idx + highlight.selectedText.length);
		if (!positions) continue;

		const className = highlight.active
			? 'highlight-decoration highlight-active'
			: 'highlight-decoration';

		decorations.push(
			Decoration.inline(positions.from, positions.to, {
				class: className,
				'data-highlight-id': highlight.id
			})
		);
	}

	return DecorationSet.create(doc, decorations);
}

function getDocText(doc: any): string {
	let text = '';
	doc.descendants((node: any) => {
		if (node.isText) {
			text += node.text;
		} else if (node.isBlock && text.length > 0) {
			text += '\n';
		}
	});
	return text;
}

function textOffsetToDocPos(
	doc: any,
	startOffset: number,
	endOffset: number
): { from: number; to: number } | null {
	let charIndex = 0;
	let from: number | null = null;
	let to: number | null = null;

	doc.descendants((node: any, pos: number) => {
		if (from !== null && to !== null) return false;

		if (node.isText) {
			const nodeStart = charIndex;
			const nodeEnd = charIndex + node.nodeSize;

			if (from === null && startOffset >= nodeStart && startOffset < nodeEnd) {
				from = pos + (startOffset - nodeStart);
			}
			if (to === null && endOffset > nodeStart && endOffset <= nodeEnd) {
				to = pos + (endOffset - nodeStart);
			}
			charIndex = nodeEnd;
		} else if (node.isBlock && charIndex > 0) {
			charIndex += 1; // newline
		}
	});

	if (from !== null && to !== null) {
		return { from, to };
	}
	return null;
}
