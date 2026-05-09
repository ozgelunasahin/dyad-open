/**
 * Validate TipTap JSONContent structure to prevent XSS via malicious node injection.
 * Extracted from the legacy notes API for reuse across the prompt domain.
 */

const MAX_CONTENT_SIZE = 1024 * 100; // 100KB limit

export const ALLOWED_NODE_TYPES = new Set([
	'doc',
	'paragraph',
	'heading',
	'text',
	'bulletList',
	'orderedList',
	'listItem',
	'blockquote',
	'codeBlock',
	'code',
	'hardBreak',
	'horizontalRule',
	'image'
]);

export const ALLOWED_MARK_TYPES = new Set(['bold', 'italic', 'code', 'link', 'strike']);

const SAFE_URL_PROTOCOL = /^(https?:\/\/|mailto:|\/)/i;

/**
 * Validate JSONContent structure recursively.
 * Returns null if valid, or an error message string if invalid.
 */
function validateNode(node: unknown, depth = 0): string | null {
	if (depth > 50) {
		return 'Content nesting too deep (max 50 levels)';
	}

	if (typeof node !== 'object' || node === null) {
		return 'Content must be an object';
	}

	const n = node as Record<string, unknown>;

	if (depth === 0 && n.type !== 'doc') {
		return 'Content must have type "doc" at root';
	}

	if (typeof n.type !== 'string') {
		return 'Node missing required "type" field';
	}
	if (!ALLOWED_NODE_TYPES.has(n.type)) {
		return `Invalid node type: "${n.type}"`;
	}

	if (n.marks !== undefined) {
		if (!Array.isArray(n.marks)) {
			return 'Node marks must be an array';
		}
		for (const mark of n.marks) {
			if (typeof mark !== 'object' || mark === null || typeof mark.type !== 'string') {
				return 'Invalid mark structure';
			}
			if (!ALLOWED_MARK_TYPES.has(mark.type)) {
				return `Invalid mark type: "${mark.type}"`;
			}
			if (mark.type === 'link' && mark.attrs) {
				const allowedLinkAttrs = ['href', 'target', 'rel', 'class'];
				for (const key of Object.keys(mark.attrs as object)) {
					if (!allowedLinkAttrs.includes(key)) {
						return `Invalid link mark attribute: "${key}"`;
					}
				}
				const href = (mark.attrs as Record<string, unknown>).href;
				if (typeof href === 'string' && !SAFE_URL_PROTOCOL.test(href)) {
					return `Unsafe link href protocol`;
				}
			}
		}
	}

	if (n.attrs !== undefined) {
		if (typeof n.attrs !== 'object' || n.attrs === null) {
			return 'Node attrs must be an object';
		}

		const attrs = n.attrs as Record<string, unknown>;

		if (n.type === 'image') {
			const allowedImageAttrs = ['src', 'alt', 'title', 'width', 'height'];
			for (const key of Object.keys(attrs)) {
				if (!allowedImageAttrs.includes(key)) {
					return `Invalid image attribute: "${key}"`;
				}
			}
			const src = attrs.src;
			if (typeof src === 'string' && !SAFE_URL_PROTOCOL.test(src)) {
				return `Unsafe image src protocol`;
			}
		} else if (n.type === 'heading') {
			for (const key of Object.keys(attrs)) {
				if (key !== 'level') {
					return `Invalid heading attribute: "${key}"`;
				}
			}
			const level = attrs.level;
			if (typeof level !== 'number' || ![1, 2, 3].includes(level)) {
				return `Invalid heading level: ${JSON.stringify(level)}`;
			}
		} else {
			const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'href', 'src'];
			for (const key of Object.keys(attrs)) {
				if (dangerousAttrs.includes(key.toLowerCase())) {
					return `Forbidden attribute: "${key}"`;
				}
			}
		}
	}

	if (n.content !== undefined) {
		if (!Array.isArray(n.content)) {
			return 'Node content must be an array';
		}
		for (const child of n.content) {
			const childError = validateNode(child, depth + 1);
			if (childError) return childError;
		}
	}

	return null;
}

/**
 * Validate TipTap JSON content for safe storage.
 * Returns null if valid, or an error message if invalid.
 */
export function validateTiptapContent(content: unknown): string | null {
	const serialized = JSON.stringify(content);
	if (serialized.length > MAX_CONTENT_SIZE) {
		return `Content too large (${serialized.length} bytes, max ${MAX_CONTENT_SIZE})`;
	}

	return validateNode(content);
}
