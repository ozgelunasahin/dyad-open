/**
 * Convert markdown to ProseMirror JSON format.
 * This is a simple parser that handles the subset of markdown used in the vault.
 */

interface JSONContent {
	type: string;
	attrs?: Record<string, unknown>;
	content?: JSONContent[];
	text?: string;
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Parse markdown text into ProseMirror JSON.
 */
export function markdownToJson(markdown: string): JSONContent {
	const lines = markdown.split('\n');
	const doc: JSONContent = { type: 'doc', content: [] };

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		// Skip empty lines
		if (line.trim() === '') {
			i++;
			continue;
		}

		// Headings
		const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const text = headingMatch[2];
			doc.content!.push({
				type: 'heading',
				attrs: { level },
				content: parseInline(text)
			});
			i++;
			continue;
		}

		// Blockquotes
		if (line.startsWith('>')) {
			const quoteLines: string[] = [];
			while (i < lines.length && lines[i].startsWith('>')) {
				quoteLines.push(lines[i].replace(/^>\s?/, ''));
				i++;
			}
			const quoteText = quoteLines.join('\n');
			doc.content!.push({
				type: 'blockquote',
				content: [
					{
						type: 'paragraph',
						content: parseInline(quoteText)
					}
				]
			});
			continue;
		}

		// Unordered lists
		if (line.match(/^[-*]\s/)) {
			const listItems: JSONContent[] = [];
			while (i < lines.length && lines[i].match(/^[-*]\s/)) {
				const itemText = lines[i].replace(/^[-*]\s/, '');
				listItems.push({
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							content: parseInline(itemText)
						}
					]
				});
				i++;
			}
			doc.content!.push({
				type: 'bulletList',
				content: listItems
			});
			continue;
		}

		// Ordered lists
		if (line.match(/^\d+\.\s/)) {
			const listItems: JSONContent[] = [];
			while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
				const itemText = lines[i].replace(/^\d+\.\s/, '');
				listItems.push({
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							content: parseInline(itemText)
						}
					]
				});
				i++;
			}
			doc.content!.push({
				type: 'orderedList',
				content: listItems
			});
			continue;
		}

		// Code blocks
		if (line.startsWith('```')) {
			const lang = line.slice(3).trim() || null;
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith('```')) {
				codeLines.push(lines[i]);
				i++;
			}
			i++; // Skip closing ```
			doc.content!.push({
				type: 'codeBlock',
				attrs: lang ? { language: lang } : {},
				content: [{ type: 'text', text: codeLines.join('\n') }]
			});
			continue;
		}

		// Regular paragraph - collect consecutive non-empty lines
		const paraLines: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!lines[i].match(/^#{1,3}\s/) &&
			!lines[i].startsWith('>') &&
			!lines[i].match(/^[-*]\s/) &&
			!lines[i].match(/^\d+\.\s/) &&
			!lines[i].startsWith('```')
		) {
			paraLines.push(lines[i]);
			i++;
		}
		if (paraLines.length > 0) {
			const paraText = paraLines.join(' ');
			doc.content!.push({
				type: 'paragraph',
				content: parseInline(paraText)
			});
		}
	}

	// Ensure at least one paragraph if empty
	if (doc.content!.length === 0) {
		doc.content!.push({ type: 'paragraph' });
	}

	return doc;
}

/**
 * Parse inline content (bold, italic, code, links, wikilinks).
 */
function parseInline(text: string): JSONContent[] {
	const result: JSONContent[] = [];
	let remaining = text;

	while (remaining.length > 0) {
		// Wikilinks: [[target|display]] or [[target]]
		const wikilinkMatch = remaining.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
		if (wikilinkMatch) {
			const target = wikilinkMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
			const display = (wikilinkMatch[2] || wikilinkMatch[1]).trim();
			result.push({
				type: 'wikilink',
				attrs: { target, display }
			});
			remaining = remaining.slice(wikilinkMatch[0].length);
			continue;
		}

		// Bold: **text** or __text__
		const boldMatch = remaining.match(/^\*\*(.+?)\*\*/) || remaining.match(/^__(.+?)__/);
		if (boldMatch) {
			result.push({
				type: 'text',
				text: boldMatch[1],
				marks: [{ type: 'bold' }]
			});
			remaining = remaining.slice(boldMatch[0].length);
			continue;
		}

		// Italic: *text* or _text_ (but not inside words)
		const italicMatch = remaining.match(/^\*([^*]+?)\*/) || remaining.match(/^_([^_]+?)_/);
		if (italicMatch) {
			result.push({
				type: 'text',
				text: italicMatch[1],
				marks: [{ type: 'italic' }]
			});
			remaining = remaining.slice(italicMatch[0].length);
			continue;
		}

		// Inline code: `code`
		const codeMatch = remaining.match(/^`([^`]+)`/);
		if (codeMatch) {
			result.push({
				type: 'text',
				text: codeMatch[1],
				marks: [{ type: 'code' }]
			});
			remaining = remaining.slice(codeMatch[0].length);
			continue;
		}

		// Links: [text](url)
		const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
		if (linkMatch) {
			result.push({
				type: 'text',
				text: linkMatch[1],
				marks: [{ type: 'link', attrs: { href: linkMatch[2] } }]
			});
			remaining = remaining.slice(linkMatch[0].length);
			continue;
		}

		// Plain text - find next special character
		const nextSpecial = remaining.search(/\[\[|\*\*|__|[*_`]|\[/);
		if (nextSpecial === -1) {
			// No more special characters, take the rest
			if (remaining.length > 0) {
				result.push({ type: 'text', text: remaining });
			}
			break;
		} else if (nextSpecial === 0) {
			// Special character at start but didn't match - take one character
			result.push({ type: 'text', text: remaining[0] });
			remaining = remaining.slice(1);
		} else {
			// Take text up to next special character
			result.push({ type: 'text', text: remaining.slice(0, nextSpecial) });
			remaining = remaining.slice(nextSpecial);
		}
	}

	// Merge adjacent text nodes with same marks
	return mergeTextNodes(result);
}

/**
 * Merge adjacent text nodes with same marks.
 */
function mergeTextNodes(nodes: JSONContent[]): JSONContent[] {
	if (nodes.length === 0) return nodes;

	const result: JSONContent[] = [];
	let current = nodes[0];

	for (let i = 1; i < nodes.length; i++) {
		const next = nodes[i];
		if (
			current.type === 'text' &&
			next.type === 'text' &&
			JSON.stringify(current.marks) === JSON.stringify(next.marks)
		) {
			current = { ...current, text: (current.text || '') + (next.text || '') };
		} else {
			result.push(current);
			current = next;
		}
	}
	result.push(current);

	return result;
}
