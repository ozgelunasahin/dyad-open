/**
 * Sanitize a string into a valid slug.
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters (keeps only a-z, 0-9, -)
 * - Collapses multiple hyphens
 * - Trims leading/trailing hyphens
 */
export function sanitizeSlug(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')           // spaces to hyphens
		.replace(/[^a-z0-9-]/g, '')     // remove invalid chars
		.replace(/-+/g, '-')            // collapse multiple hyphens
		.replace(/^-|-$/g, '');         // trim leading/trailing hyphens
}
