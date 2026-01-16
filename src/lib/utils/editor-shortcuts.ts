/**
 * Editor shortcuts for contenteditable editing in NoteCard.
 * Handles bracket wrapping, wiki link insertion, and bold/italic toggling.
 */

const BRACKET_PAIRS: Record<string, string> = {
	'[': ']',
	'(': ')',
	'{': '}'
};

/**
 * Handle bracket key press - wraps selected text with matching brackets.
 * If no text is selected, returns false to allow normal input.
 */
export function handleBracketKey(event: KeyboardEvent, contentEl: HTMLElement): boolean {
	// Ignore during IME composition
	if (event.isComposing) return false;

	const closingBracket = BRACKET_PAIRS[event.key];
	if (!closingBracket) return false;

	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;

	// Validate selection is within our content element
	const range = selection.getRangeAt(0);
	if (!contentEl.contains(range.commonAncestorContainer)) return false;

	const selectedText = range.toString();

	event.preventDefault();

	// Delete selected text
	range.deleteContents();

	// Insert wrapped text
	const textNode = document.createTextNode(`${event.key}${selectedText}${closingBracket}`);
	range.insertNode(textNode);

	// Position cursor after closing bracket
	range.setStartAfter(textNode);
	range.collapse(true);
	selection.removeAllRanges();
	selection.addRange(range);

	return true;
}

/**
 * Check if we should trigger wiki link auto-completion.
 * Returns true if the previous character is '[' and we're typing another '['.
 */
export function shouldInsertWikiLink(event: KeyboardEvent, contentEl: HTMLElement): boolean {
	// Ignore during IME composition
	if (event.isComposing) return false;
	if (event.key !== '[') return false;

	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return false;

	const range = selection.getRangeAt(0);

	// Validate selection is within our content element
	if (!contentEl.contains(range.startContainer)) return false;

	const textNode = range.startContainer;
	if (textNode.nodeType !== Node.TEXT_NODE) return false;

	const offset = range.startOffset;
	const text = textNode.textContent || '';

	// Check if previous character is '['
	return offset > 0 && text[offset - 1] === '[';
}

/**
 * Insert wiki link brackets after detecting '[[' pattern.
 * If text is selected, wraps it: [[selected]]
 * If no selection, inserts [[]] with cursor between.
 */
export function insertWikiLinkBrackets(contentEl: HTMLElement): void {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	const range = selection.getRangeAt(0);

	// Validate selection is within our content element
	if (!contentEl.contains(range.commonAncestorContainer)) return;

	if (selection.isCollapsed) {
		// Insert []] (second [ plus closing ]]) with cursor between the brackets
		// First [ was already typed, so we insert []] to make [[|]]
		const textNode = document.createTextNode('[]]');
		range.insertNode(textNode);
		range.setStart(textNode, 1); // Position cursor after '[', before ']]'
		range.collapse(true);
	} else {
		// Wrap selection: [[selected]] - insert [selected]] since first [ exists
		const selectedText = range.toString();
		range.deleteContents();
		const textNode = document.createTextNode(`[${selectedText}]]`);
		range.insertNode(textNode);
		range.setStart(textNode, 1 + selectedText.length); // After '[' + selectedText, before ']]'
		range.collapse(true);
	}

	selection.removeAllRanges();
	selection.addRange(range);
}

/**
 * Toggle bold formatting on selected text.
 * Uses <strong> element instead of deprecated execCommand.
 */
export function toggleBold(contentEl: HTMLElement): void {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

	const range = selection.getRangeAt(0);

	// Validate selection is within our content element
	if (!contentEl.contains(range.commonAncestorContainer)) return;

	// Check if already wrapped in <strong>
	const parentStrong = range.commonAncestorContainer.parentElement?.closest('strong');

	if (parentStrong) {
		// Remove bold - unwrap
		const textNode = document.createTextNode(parentStrong.textContent || '');
		parentStrong.replaceWith(textNode);
	} else {
		// Add bold - wrap in <strong>
		// surroundContents throws if selection spans partial elements
		try {
			const strong = document.createElement('strong');
			range.surroundContents(strong);
		} catch {
			// Fallback: extract, wrap, and reinsert
			const selectedText = range.toString();
			range.deleteContents();
			const strong = document.createElement('strong');
			strong.textContent = selectedText;
			range.insertNode(strong);
		}
	}
}

/**
 * Toggle italic formatting on selected text.
 * Uses <em> element instead of deprecated execCommand.
 */
export function toggleItalic(contentEl: HTMLElement): void {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

	const range = selection.getRangeAt(0);

	// Validate selection is within our content element
	if (!contentEl.contains(range.commonAncestorContainer)) return;

	// Check if already wrapped in <em>
	const parentEm = range.commonAncestorContainer.parentElement?.closest('em');

	if (parentEm) {
		// Remove italic - unwrap
		const textNode = document.createTextNode(parentEm.textContent || '');
		parentEm.replaceWith(textNode);
	} else {
		// Add italic - wrap in <em>
		// surroundContents throws if selection spans partial elements
		try {
			const em = document.createElement('em');
			range.surroundContents(em);
		} catch {
			// Fallback: extract, wrap, and reinsert
			const selectedText = range.toString();
			range.deleteContents();
			const em = document.createElement('em');
			em.textContent = selectedText;
			range.insertNode(em);
		}
	}
}
