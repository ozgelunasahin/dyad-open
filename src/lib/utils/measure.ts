import { parseMarkdown } from './markdown';

export interface ContentDimensions {
	width: number;
	height: number;
}

export interface MeasurementStyles {
	fontSize: number;
	lineHeight: number;
	fontFamily: string;
}

const DEFAULT_STYLES: MeasurementStyles = {
	fontSize: 14,
	lineHeight: 1.7,
	fontFamily: "'Georgia', 'Times New Roman', 'Noto Serif', serif"
};

/**
 * Measure the rendered height of markdown content at a given width.
 * Creates a hidden DOM element, renders the content, measures it, then removes it.
 */
export function measureMarkdownContent(
	content: string,
	targetWidth: number,
	styles: MeasurementStyles = DEFAULT_STYLES
): ContentDimensions {
	if (typeof document === 'undefined') {
		// SSR fallback - estimate based on content length
		return estimateDimensions(content, targetWidth, styles);
	}

	const measurer = document.createElement('div');

	// Apply the same styles as NoteCard
	Object.assign(measurer.style, {
		position: 'absolute',
		visibility: 'hidden',
		width: `${targetWidth}px`,
		fontSize: `${styles.fontSize}px`,
		lineHeight: `${styles.lineHeight}`,
		fontFamily: styles.fontFamily,
		padding: '8px 0',
		// Match NoteCard text styles
		textAlign: 'justify',
		hyphens: 'auto'
	});

	// Parse and render markdown
	measurer.innerHTML = parseMarkdown(content);

	// Add heading styles
	const styleEl = document.createElement('style');
	styleEl.textContent = `
		h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px 0; }
		h2 { font-size: 15px; font-weight: 600; margin: 20px 0 10px 0; }
		h3 { font-size: 14px; font-weight: 600; margin: 16px 0 8px 0; }
		p { margin: 0 0 14px 0; }
		ul, ol { margin: 0 0 14px 0; padding-left: 18px; }
		li { margin-bottom: 6px; }
		pre { padding: 12px; margin: 0 0 14px 0; }
		code { font-size: 12px; padding: 2px 5px; }
	`;
	measurer.appendChild(styleEl);

	document.body.appendChild(measurer);

	const rect = measurer.getBoundingClientRect();
	const dimensions: ContentDimensions = {
		width: targetWidth,
		height: Math.ceil(rect.height)
	};

	document.body.removeChild(measurer);

	return dimensions;
}

/**
 * Estimate dimensions without DOM access (for SSR).
 * Uses heuristics based on content length and structure.
 */
function estimateDimensions(
	content: string,
	targetWidth: number,
	styles: MeasurementStyles
): ContentDimensions {
	const charCount = content.length;
	const lineCount = content.split('\n').length;

	// Approximate characters per line based on width
	const avgCharWidth = styles.fontSize * 0.5;
	const charsPerLine = Math.floor(targetWidth / avgCharWidth);

	// Estimate wrapped lines
	const estimatedLines = Math.ceil(charCount / charsPerLine) + lineCount;

	// Calculate height
	const lineHeightPx = styles.fontSize * styles.lineHeight;
	const estimatedHeight = estimatedLines * lineHeightPx + 16; // +16 for padding

	return {
		width: targetWidth,
		height: Math.ceil(estimatedHeight)
	};
}

/**
 * Calculate optimal card width based on content characteristics.
 * Creates more organic, varied widths based on content structure.
 */
export function calculateOptimalWidth(
	content: string,
	availableWidth: number,
	minWidth: number,
	maxWidth: number
): number {
	const charCount = content.length;
	const lines = content.split('\n');
	const lineCount = lines.length;
	const hasHeadings = /^#{1,3}\s/m.test(content);
	const hasLists = /^[-*]\s/m.test(content);
	const hasCodeBlocks = content.includes('```');
	const hasBlockquotes = /^>/m.test(content);
	const avgLineLength = charCount / lineCount;
	const hasLongLines = lines.some((line) => line.length > 80);

	// More granular width selection based on content structure
	let targetWidth: number;

	if (hasCodeBlocks) {
		// Wide for code blocks
		targetWidth = 420;
	} else if (hasHeadings && charCount > 800) {
		// Wider for structured content with headings
		targetWidth = 380;
	} else if (hasLists && charCount > 400) {
		// Medium-wide for lists
		targetWidth = 340;
	} else if (hasBlockquotes) {
		// Medium for blockquotes
		targetWidth = 320;
	} else if (avgLineLength < 40 && lineCount > 3) {
		// Narrow for short-line content (poetry, quotes)
		targetWidth = 260;
	} else if (charCount < 150) {
		// Very narrow for brief notes
		targetWidth = 220;
	} else if (charCount < 300) {
		// Narrow for short content
		targetWidth = 260;
	} else if (charCount < 500) {
		// Medium-narrow
		targetWidth = 300;
	} else if (charCount < 800) {
		// Medium
		targetWidth = 340;
	} else if (charCount < 1200) {
		// Medium-wide
		targetWidth = 370;
	} else {
		// Wide for long content
		targetWidth = 400;
	}

	// Long lines need more width
	if (hasLongLines) {
		targetWidth = Math.max(targetWidth, 380);
	}

	return Math.max(minWidth, Math.min(maxWidth, targetWidth, availableWidth));
}
