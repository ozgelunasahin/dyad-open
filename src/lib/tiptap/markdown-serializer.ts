/**
 * Markdown serializer for Tiptap editor content.
 * Converts HTML output from Tiptap back to markdown for file storage.
 */
import TurndownService from 'turndown';

// Create turndown instance with appropriate settings
const turndown = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	emDelimiter: '*',
	codeBlockStyle: 'fenced'
});

// Custom rule for wikilinks - convert back to [[target|display]] syntax
turndown.addRule('wikilink', {
	filter: (node) => {
		return node.nodeName === 'BUTTON' && node.classList.contains('wikilink');
	},
	replacement: (content, node) => {
		const target = (node as HTMLElement).dataset.target || '';
		const display = content.trim();
		// If display matches target, use short form
		if (display.toLowerCase().replace(/\s+/g, '-') === target) {
			return `[[${display}]]`;
		}
		return `[[${target}|${display}]]`;
	}
});

/**
 * Convert Tiptap HTML output to markdown.
 */
export function htmlToMarkdown(html: string): string {
	return turndown.turndown(html);
}

/**
 * Build full markdown file content with frontmatter preserved.
 */
export function buildMarkdownFile(
	html: string,
	originalMarkdown: string,
	fallbackTitle: string
): string {
	const markdown = htmlToMarkdown(html);

	// Extract frontmatter from original and prepend
	const frontmatterMatch = originalMarkdown.match(/^---\n[\s\S]*?\n---\n*/);
	const frontmatter = frontmatterMatch
		? frontmatterMatch[0]
		: `---\ntitle: "${fallbackTitle}"\n---\n\n`;

	return frontmatter + markdown;
}
