import type { JSONContent } from '@tiptap/core';

/**
 * Extract plain text from ProseMirror JSON content.
 * Used for dimension estimation and search.
 */
export function jsonToPlainText(content: JSONContent): string {
	if (!content) return '';

	let text = '';

	if (content.text) {
		text += content.text;
	}

	if (content.content) {
		for (const child of content.content) {
			const childText = jsonToPlainText(child);
			if (childText) {
				// Add newlines for block-level elements
				if (
					child.type === 'paragraph' ||
					child.type === 'heading' ||
					child.type === 'blockquote' ||
					child.type === 'codeBlock' ||
					child.type === 'listItem'
				) {
					text += childText + '\n';
				} else {
					text += childText;
				}
			}
		}
	}

	return text;
}

/**
 * Extract wikilinks from JSON content.
 */
export function extractWikilinksFromJson(content: JSONContent): string[] {
	const links: string[] = [];

	function walk(node: JSONContent) {
		if (node.type === 'wikilink' && node.attrs?.target) {
			links.push(node.attrs.target);
		}
		if (node.content) {
			for (const child of node.content) {
				walk(child);
			}
		}
	}

	walk(content);
	return [...new Set(links)];
}

/**
 * Estimate content height based on JSON content.
 */
export function estimateContentHeight(content: JSONContent, width: number): number {
	// Handle string content (legacy) - return default height
	if (!content || typeof content !== 'object') {
		return 200;
	}

	const plainText = jsonToPlainText(content);
	const charCount = plainText.length;
	const lineCount = plainText.split('\n').length;

	const fontSize = 14;
	const lineHeight = 1.7;
	const avgCharWidth = fontSize * 0.5;
	const charsPerLine = Math.floor(width / avgCharWidth);
	const estimatedLines = Math.ceil(charCount / charsPerLine) + lineCount;
	const lineHeightPx = fontSize * lineHeight;

	return Math.ceil(estimatedLines * lineHeightPx + 16);
}
