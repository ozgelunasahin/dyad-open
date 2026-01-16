<script lang="ts">
	import { tick } from 'svelte';
	import type { Card, Point } from '$lib/types';
	import { isHTMLElement } from '$lib/utils/type-guards';
	import { parseMarkdown } from '$lib/utils/markdown';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import TurndownService from 'turndown';
	import {
		handleBracketKey,
		shouldInsertWikiLink,
		insertWikiLinkBrackets,
		toggleBold,
		toggleItalic
	} from '$lib/utils/editor-shortcuts';

	interface LinkBounds {
		left: number;
		right: number;
		bottom: number;
	}

	interface Props {
		card: Card;
		isActive: boolean;
		onLinkClick: (noteId: string, fromCardId: string, linkBounds: LinkBounds) => void;
		onCardClick: (cardId: string) => void;
		readOnly?: boolean;
	}

	let { card, isActive, onLinkClick, onCardClick, readOnly = false }: Props = $props();

	// Edit state
	let isEditing = $derived(canvasStore.editingCardId === card.id);
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let debounceTimer: ReturnType<typeof setTimeout>;
	let wikilinkDebounceTimer: ReturnType<typeof setTimeout>;
	let originalMarkdown = $state('');

	// Rendered HTML for view mode
	let html = $derived(parseMarkdown(card.note.content));

	// Content element reference
	let contentEl: HTMLDivElement;

	// Setup turndown with wikilink handling
	const turndown = new TurndownService({
		headingStyle: 'atx',
		bulletListMarker: '-',
		emDelimiter: '*'
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
			if (display === target) {
				return `[[${target}]]`;
			}
			return `[[${target}|${display}]]`;
		}
	});

	// Enter edit mode
	async function enterEditMode() {
		// Don't allow editing in read-only mode
		if (readOnly) return;

		if (canvasStore.editingCardId && canvasStore.editingCardId !== card.id) {
			canvasStore.exitEditMode();
		}

		// Load original markdown for frontmatter preservation
		try {
			const res = await fetch(`/api/notes/${card.note.id}`);
			if (res.ok) {
				const data = await res.json();
				originalMarkdown = data.content;
			} else {
				originalMarkdown = `---\ntitle: "${card.note.title}"\n---\n\n${card.note.content}`;
			}
		} catch {
			originalMarkdown = `---\ntitle: "${card.note.title}"\n---\n\n${card.note.content}`;
		}

		canvasStore.enterEditMode(card.id);

		await tick();
		contentEl?.focus();
	}

	// Exit edit mode and save
	async function exitEditMode() {
		clearTimeout(debounceTimer);
		if (saveStatus !== 'saving') {
			await saveNow();
		}
		canvasStore.exitEditMode();
	}

	async function handleInteraction(target: HTMLElement) {
		if (!target.classList.contains('wikilink')) return;

		const noteId = target.dataset.target;
		if (!noteId) return;

		if (isEditing) {
			await exitEditMode();
		}

		const rect = target.getBoundingClientRect();
		const linkBounds: LinkBounds = {
			left: rect.left,
			right: rect.right,
			bottom: rect.bottom
		};

		// If link is broken (note doesn't exist), create it (unless read-only)
		if (canvasStore.isLinkBroken(noteId)) {
			if (!readOnly) {
				await createNewNote(noteId, linkBounds, target);
			}
			return;
		}

		onLinkClick(noteId, card.id, linkBounds);
		target.classList.add('has-connection');
	}

	async function createNewNote(noteId: string, linkBounds: LinkBounds, target: HTMLElement) {
		// Create title from noteId (convert hyphens to spaces, title case)
		const title = noteId
			.split('-')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		// Create initial content
		const content = `---\ntitle: "${title}"\n---\n\n# ${title}\n\n`;

		try {
			// Save the new note file
			const res = await fetch(`/api/notes/${noteId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (!res.ok) {
				console.error('Failed to create note:', noteId);
				return;
			}

			// Add note to vault (so it's no longer "broken")
			canvasStore.addNoteToVault(noteId, title);

			// Use normal link click flow for proper coordinate conversion and path computation
			onLinkClick(noteId, card.id, linkBounds);
			target.classList.add('has-connection');

			// Enter edit mode on the new card after a brief delay
			setTimeout(() => canvasStore.enterEditMode(noteId), 100);
		} catch (err) {
			console.error('Failed to create note:', err);
		}
	}

	function handleClick(event: MouseEvent) {
		if (!isHTMLElement(event.target)) return;

		// Handle wikilink clicks (only in view mode)
		// Use closest() to find wikilink even if click was on child element
		const wikilinkTarget = event.target.closest('.wikilink');
		if (wikilinkTarget && isHTMLElement(wikilinkTarget) && !isEditing) {
			event.preventDefault();
			event.stopPropagation();
			handleInteraction(wikilinkTarget);
			return;
		}

		// Clicking on card content focuses the card (unless already editing)
		if (!isEditing) {
			onCardClick(card.id);
		}
	}

	function handleViewKeyDown(event: KeyboardEvent) {
		// 'e' key to enter edit mode (prevent typing 'e' into content)
		if (event.key === 'e' && !readOnly) {
			event.preventDefault();
			event.stopPropagation();
			enterEditMode();
			return;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			if (!isHTMLElement(event.target)) return;
			if (event.target.classList.contains('wikilink')) {
				event.preventDefault();
				handleInteraction(event.target);
			}
		}
	}

	// Handle keyboard shortcuts in edit mode
	function handleEditKeyDown(event: KeyboardEvent) {
		// Ignore during IME composition
		if (event.isComposing) return;

		const isMod = event.metaKey || event.ctrlKey;

		// Cmd+B = Bold (using Selection API instead of deprecated execCommand)
		if (isMod && event.key === 'b') {
			event.preventDefault();
			toggleBold(contentEl);
			scheduleSave();
			return;
		}

		// Cmd+I = Italic (using Selection API instead of deprecated execCommand)
		if (isMod && event.key === 'i') {
			event.preventDefault();
			toggleItalic(contentEl);
			scheduleSave();
			return;
		}

		// Cmd+S = Force save
		if (isMod && event.key === 's') {
			event.preventDefault();
			saveNow();
			return;
		}

		// Escape = Exit edit mode
		if (event.key === 'Escape') {
			event.preventDefault();
			exitEditMode();
			return;
		}

		// Wiki link quick-insert: typing [[ inserts [[]] with cursor between
		if (shouldInsertWikiLink(event, contentEl)) {
			event.preventDefault();
			insertWikiLinkBrackets(contentEl);
			scheduleSave();
			return;
		}

		// Bracket wrapping: select text and press [ ( { to wrap
		if (handleBracketKey(event, contentEl)) {
			scheduleSave();
			return;
		}
	}

	// Handle input changes (contenteditable)
	function handleInput() {
		// Debounce wikilink conversion to avoid DOM traversal on every keystroke
		clearTimeout(wikilinkDebounceTimer);
		wikilinkDebounceTimer = setTimeout(convertWikilinks, 300);
		scheduleSave();
	}

	// Convert [[text]] patterns to wikilink elements
	function convertWikilinks() {
		if (!contentEl) return;

		const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
		const nodesToProcess: { node: Text; match: RegExpExecArray }[] = [];

		// Find all [[...]] patterns in text nodes
		const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
		let textNode: Text | null;
		while ((textNode = walker.nextNode() as Text | null)) {
			pattern.lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(textNode.textContent || '')) !== null) {
				nodesToProcess.push({ node: textNode, match });
				break; // Process one match per node at a time
			}
		}

		// Process matches (in reverse to not invalidate positions)
		for (const { node, match } of nodesToProcess.reverse()) {
			const target = match[1].trim();
			const display = (match[2] || match[1]).trim();
			const startIdx = match.index;
			const endIdx = startIdx + match[0].length;

			// Create wikilink button
			const link = document.createElement('button');
			link.className = 'wikilink';
			link.dataset.target = target.toLowerCase().replace(/\s+/g, '-');
			link.textContent = display;

			// Split text node and insert link
			const before = node.textContent?.slice(0, startIdx) || '';
			const after = node.textContent?.slice(endIdx) || '';

			const parent = node.parentNode;
			if (!parent) continue;

			const beforeNode = document.createTextNode(before);
			const afterNode = document.createTextNode(after);

			parent.insertBefore(beforeNode, node);
			parent.insertBefore(link, node);
			parent.insertBefore(afterNode, node);
			parent.removeChild(node);

			// Place cursor after the link
			const sel = window.getSelection();
			if (sel) {
				const range = document.createRange();
				range.setStartAfter(link);
				range.collapse(true);
				sel.removeAllRanges();
				sel.addRange(range);
			}
		}
	}

	// Debounced save
	function scheduleSave() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(saveNow, 1500);
	}

	// Convert HTML to markdown and save
	async function saveNow() {
		if (!contentEl) return;

		saveStatus = 'saving';

		try {
			// Convert contenteditable HTML back to markdown
			const htmlContent = contentEl.innerHTML;
			const markdown = turndown.turndown(htmlContent);

			// Extract frontmatter from original and prepend
			const frontmatterMatch = originalMarkdown.match(/^---\n[\s\S]*?\n---\n*/);
			const frontmatter = frontmatterMatch ? frontmatterMatch[0] : `---\ntitle: "${card.note.title}"\n---\n\n`;
			const fullContent = frontmatter + markdown;

			const res = await fetch(`/api/notes/${card.note.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: fullContent })
			});

			if (res.ok) {
				saveStatus = 'saved';
				setTimeout(() => {
					if (saveStatus === 'saved') saveStatus = 'idle';
				}, 2000);
			} else {
				saveStatus = 'error';
			}
		} catch {
			saveStatus = 'error';
		}
	}

	function processBrokenLinks(container: HTMLElement) {
		const wikilinks = container.querySelectorAll('.wikilink');
		wikilinks.forEach((link) => {
			const target = (link as HTMLElement).dataset.target;
			if (target && canvasStore.isLinkBroken(target)) {
				link.classList.add('broken');
			}
		});
	}

	$effect(() => {
		if (contentEl && html) {
			processBrokenLinks(contentEl);
		}
	});

	// Auto-expand card height as content grows
	$effect(() => {
		if (!contentEl) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newHeight = entry.contentRect.height + 16; // Add padding
				if (newHeight > card.dimensions.height) {
					canvasStore.updateCardHeight(card.id, newHeight);
				}
			}
		});

		observer.observe(contentEl);
		return () => observer.disconnect();
	});

	// Handle edit mode changes (entered via 'e' key or exited via click outside)
	let wasEditing = $state(false);
	$effect(() => {
		if (!wasEditing && isEditing) {
			// Just entered edit mode - load original markdown and focus
			loadOriginalMarkdown();
			tick().then(() => contentEl?.focus());
		} else if (wasEditing && !isEditing) {
			// Just exited edit mode - save any pending changes
			clearTimeout(debounceTimer);
			clearTimeout(wikilinkDebounceTimer);
			saveNow();
		}
		wasEditing = isEditing;
	});

	async function loadOriginalMarkdown() {
		try {
			const res = await fetch(`/api/notes/${card.note.id}`);
			if (res.ok) {
				const data = await res.json();
				originalMarkdown = data.content;
			} else {
				originalMarkdown = `---\ntitle: "${card.note.title}"\n---\n\n${card.note.content}`;
			}
		} catch {
			originalMarkdown = `---\ntitle: "${card.note.title}"\n---\n\n${card.note.content}`;
		}
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
			clearTimeout(wikilinkDebounceTimer);
		};
	});
</script>

<foreignObject
	data-note-id={card.id}
	x={card.position.x}
	y={card.position.y}
	width={card.dimensions.width}
	height={card.dimensions.height}
	class="text-block-container"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		xmlns="http://www.w3.org/1999/xhtml"
		class="text-block"
		class:dimmed={!isActive && !isEditing}
		class:focused={isActive && !isEditing}
		class:editing={isEditing}
		contenteditable={isEditing}
		onclick={handleClick}
		onkeydown={isEditing ? handleEditKeyDown : handleViewKeyDown}
		oninput={handleInput}
		bind:this={contentEl}
	>
		{@html html}
	</div>
	{#if isEditing && saveStatus !== 'idle'}
		<div xmlns="http://www.w3.org/1999/xhtml" class="save-indicator" class:saving={saveStatus === 'saving'} class:error={saveStatus === 'error'}>
			{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
		</div>
	{/if}
</foreignObject>

<style>
	.text-block-container {
		overflow: visible;
	}

	.text-block {
		min-height: 100%;
		font-family: 'Georgia', 'Times New Roman', 'Noto Serif', serif;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		transition: opacity 0.3s ease, color 0.3s ease;
		padding: 8px 0;
		cursor: text;
		outline: none;
	}

	.text-block.dimmed {
		opacity: var(--dimmed-opacity);
	}

	/* Card focus: no visual indicator in reading mode (design constraint) */

	.text-block.editing {
		outline: 2px solid var(--text-link);
		outline-offset: 6px;
	}

	.save-indicator {
		position: absolute;
		top: 12px;
		right: 12px;
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 3px;
		background: var(--bg-control);
		color: var(--text-muted);
		font-family: system-ui, sans-serif;
	}

	.save-indicator.saving {
		opacity: 0.7;
	}

	.save-indicator.error {
		background: #fee2e2;
		color: #dc2626;
	}

	.text-block :global(h1) {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px 0;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.text-block :global(h2) {
		font-size: 15px;
		font-weight: 600;
		margin: 20px 0 10px 0;
		color: var(--text-primary);
	}

	.text-block :global(h3) {
		font-size: 14px;
		font-weight: 600;
		margin: 16px 0 8px 0;
		color: var(--text-secondary);
	}

	.text-block :global(p) {
		margin: 0 0 14px 0;
		text-align: justify;
		hyphens: auto;
	}

	.text-block :global(ul),
	.text-block :global(ol) {
		margin: 0 0 14px 0;
		padding-left: 18px;
	}

	.text-block :global(li) {
		margin-bottom: 6px;
	}

	.text-block :global(code) {
		background: var(--bg-code);
		padding: 2px 5px;
		border-radius: 3px;
		font-size: 12px;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
		color: var(--text-muted);
	}

	.text-block :global(pre) {
		background: var(--bg-code-block);
		padding: 12px;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0 0 14px 0;
		border-left: 2px solid var(--border-code);
	}

	.text-block :global(pre code) {
		background: none;
		padding: 0;
	}

	.text-block :global(strong) {
		font-weight: 600;
		color: var(--text-primary);
	}

	.text-block :global(em) {
		font-style: italic;
	}

	.text-block :global(.wikilink) {
		background: none;
		border: none;
		outline: none;
		color: var(--text-link);
		text-decoration: none;
		border-bottom: 1px solid var(--border-link);
		cursor: pointer;
		padding: 0;
		font: inherit;
		transition: all 0.15s ease;
	}

	.text-block :global(.wikilink:focus-visible) {
		outline: none;
	}

	.text-block :global(.wikilink:hover) {
		color: var(--text-link-hover);
		border-bottom-color: var(--border-link-hover);
	}

	.text-block :global(.wikilink.broken) {
		color: var(--text-muted);
		border-bottom-color: var(--border-code);
		cursor: not-allowed;
		opacity: 0.5;
	}

	.text-block :global(.wikilink.broken:hover) {
		color: var(--text-muted);
		border-bottom-color: var(--border-code);
	}

	.text-block :global(.wikilink.has-connection) {
		border-bottom-color: transparent;
	}

	.text-block :global(.wikilink.link-focused) {
		background: color-mix(in srgb, var(--text-link) 12%, transparent);
		border-radius: 2px;
	}

	.text-block::-webkit-scrollbar {
		width: 0;
		display: none;
	}
</style>
