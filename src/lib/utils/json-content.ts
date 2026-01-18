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
 * Check if JSON content has code blocks.
 */
export function hasCodeBlocks(content: JSONContent): boolean {
	if (!content) return false;
	if (content.type === 'codeBlock') return true;
	if (content.content) {
		return content.content.some(hasCodeBlocks);
	}
	return false;
}

/**
 * Check if JSON content has headings.
 */
export function hasHeadings(content: JSONContent): boolean {
	if (!content) return false;
	if (content.type === 'heading') return true;
	if (content.content) {
		return content.content.some(hasHeadings);
	}
	return false;
}

/**
 * Check if JSON content has lists.
 */
export function hasLists(content: JSONContent): boolean {
	if (!content) return false;
	if (content.type === 'bulletList' || content.type === 'orderedList') return true;
	if (content.content) {
		return content.content.some(hasLists);
	}
	return false;
}

/**
 * Check if JSON content has blockquotes.
 */
export function hasBlockquotes(content: JSONContent): boolean {
	if (!content) return false;
	if (content.type === 'blockquote') return true;
	if (content.content) {
		return content.content.some(hasBlockquotes);
	}
	return false;
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
 * Calculate optimal card width based on JSON content characteristics.
 */
export function calculateOptimalWidthFromJson(
	content: JSONContent,
	minWidth: number,
	maxWidth: number
): number {
	// Handle string content (legacy) - return default width
	if (!content || typeof content !== 'object') {
		return 320;
	}

	const plainText = jsonToPlainText(content);
	const charCount = plainText.length;
	const lines = plainText.split('\n').filter((l) => l.trim());
	const lineCount = lines.length;
	const avgLineLength = lineCount > 0 ? charCount / lineCount : charCount;
	const hasLongLines = lines.some((line) => line.length > 80);

	let targetWidth: number;

	if (hasCodeBlocks(content)) {
		targetWidth = 420;
	} else if (hasHeadings(content) && charCount > 800) {
		targetWidth = 380;
	} else if (hasLists(content) && charCount > 400) {
		targetWidth = 340;
	} else if (hasBlockquotes(content)) {
		targetWidth = 320;
	} else if (avgLineLength < 40 && lineCount > 3) {
		targetWidth = 260;
	} else if (charCount < 150) {
		targetWidth = 220;
	} else if (charCount < 300) {
		targetWidth = 260;
	} else if (charCount < 500) {
		targetWidth = 300;
	} else if (charCount < 800) {
		targetWidth = 340;
	} else if (charCount < 1200) {
		targetWidth = 370;
	} else {
		targetWidth = 400;
	}

	if (hasLongLines) {
		targetWidth = Math.max(targetWidth, 380);
	}

	return Math.max(minWidth, Math.min(maxWidth, targetWidth));
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
