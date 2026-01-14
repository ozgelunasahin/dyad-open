import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = 'content/notes';
const OUTPUT_FILE = 'static/vault/index.json';
const ENTRY_POINT = 'slow-reading';

interface Note {
	id: string;
	title: string;
	content: string;
	wikilinks: string[];
}

interface Vault {
	notes: Record<string, Note>;
	entryPoint: string;
}

function extractWikilinks(content: string): string[] {
	const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
	const links: string[] = [];
	let match;
	while ((match = regex.exec(content)) !== null) {
		// Normalize: trim, lowercase, replace spaces with hyphens
		links.push(match[1].trim().toLowerCase().replace(/\s+/g, '-'));
	}
	return [...new Set(links)];
}

function extractTitle(frontmatter: Record<string, unknown>, content: string, filename: string): string {
	// Priority: frontmatter.title > first H1 > filename
	if (frontmatter.title && typeof frontmatter.title === 'string') {
		return frontmatter.title;
	}

	const h1Match = content.match(/^#\s+(.+)$/m);
	if (h1Match) {
		return h1Match[1].trim();
	}

	// Convert filename to title case
	return filename
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildVault(): void {
	// Check if content directory exists
	if (!fs.existsSync(CONTENT_DIR)) {
		console.error(`Error: Content directory not found: ${CONTENT_DIR}`);
		process.exit(1);
	}

	const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));

	if (files.length === 0) {
		console.warn(`Warning: No markdown files found in ${CONTENT_DIR}`);
	}

	const notes: Record<string, Note> = {};
	const allIds = new Set<string>();

	for (const file of files) {
		const id = file.replace('.md', '');

		// Check for duplicate IDs
		if (allIds.has(id)) {
			console.error(`Error: Duplicate note ID: ${id}`);
			process.exit(1);
		}
		allIds.add(id);

		const filepath = path.join(CONTENT_DIR, file);
		const raw = fs.readFileSync(filepath, 'utf-8');

		let frontmatter: Record<string, unknown> = {};
		let content: string;

		try {
			const parsed = matter(raw);
			frontmatter = parsed.data as Record<string, unknown>;
			content = parsed.content;
		} catch (err) {
			console.error(`Error: Invalid YAML frontmatter in ${file}`);
			process.exit(1);
		}

		notes[id] = {
			id,
			title: extractTitle(frontmatter, content, id),
			content: content.trim(),
			wikilinks: extractWikilinks(content)
		};
	}

	// Validate links - warn on broken links
	let brokenLinkCount = 0;
	for (const note of Object.values(notes)) {
		for (const link of note.wikilinks) {
			if (!allIds.has(link)) {
				console.warn(`Warning: Broken link in ${note.id}: [[${link}]]`);
				brokenLinkCount++;
			}
		}
	}

	const vault: Vault = { entryPoint: ENTRY_POINT, notes };

	// Ensure output directory exists
	fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vault, null, 2) + '\n');

	console.log(`Built vault with ${Object.keys(notes).length} notes`);
	if (brokenLinkCount > 0) {
		console.log(`${brokenLinkCount} broken link(s) detected`);
	}
}

buildVault();
