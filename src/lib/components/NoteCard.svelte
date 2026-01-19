<script lang="ts">
	import type { Card } from '$lib/types';
	import type { JSONContent } from '@tiptap/core';
	import { isHTMLElement } from '$lib/utils/type-guards';
	import { sanitizeSlug } from '$lib/utils/slug';
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import TiptapEditor from './TiptapEditor.svelte';

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
	let savedStatusTimer: ReturnType<typeof setTimeout>;
	let currentContent = $state<JSONContent | null>(null);

	// Guards for async operations
	let isEnteringEditMode = false;
	let saveAbortController: AbortController | null = null;

	// TiptapEditor reference
	let editorComponent: TiptapEditor;

	// Content container ref for height observation
	let contentDiv: HTMLDivElement;

	// Enter edit mode
	async function enterEditMode() {
		if (readOnly) return;

		// Guard against double-click race condition
		if (isEnteringEditMode) return;
		isEnteringEditMode = true;

		try {
			if (canvasStore.editingCardId && canvasStore.editingCardId !== card.id) {
				canvasStore.exitEditMode();
			}

			currentContent = card.note.content;
			canvasStore.enterEditMode(card.id);
			// TiptapEditor auto-focuses when editable changes to true
		} finally {
			isEnteringEditMode = false;
		}
	}

	// Exit edit mode and save
	async function exitEditMode() {
		clearTimeout(debounceTimer);

		// Check if content is empty
		const isEmpty = currentContent && isContentEmpty(currentContent);

		if (isEmpty) {
			// Delete empty note from database
			try {
				await fetch(`/api/notes/${card.note.id}`, { method: 'DELETE' });
			} catch (err) {
				console.error('Failed to delete empty note:', err);
			}

			// Clean up vault and mark as broken link (keeps wikilink in parent as placeholder)
			canvasStore.deleteEmptyNote(card.note.id);

			canvasStore.exitEditMode();
			canvasStore.unopenCard(card.id);
		} else {
			// Normal save flow
			if (currentContent && saveStatus !== 'saving') {
				await saveNow();
			}
			canvasStore.exitEditMode();
		}
	}

	// Handle wikilink click
	function handleWikilinkClick(target: string) {
		const wikilinkEl = document.querySelector(
			`[data-note-id="${card.id}"] .wikilink[data-target="${target}"]`
		);

		let linkBounds: LinkBounds;
		if (wikilinkEl) {
			const rect = wikilinkEl.getBoundingClientRect();
			linkBounds = {
				left: rect.left,
				right: rect.right,
				bottom: rect.bottom
			};
		} else {
			linkBounds = {
				left: card.position.x + card.dimensions.width / 2,
				right: card.position.x + card.dimensions.width / 2,
				bottom: card.position.y + card.dimensions.height / 2
			};
		}

		if (isEditing) {
			exitEditMode();
		}

		if (canvasStore.isLinkBroken(target)) {
			if (!readOnly) {
				createNewNote(target, linkBounds);
			}
			return;
		}

		onLinkClick(target, card.id, linkBounds);
	}

	async function createNewNote(noteId: string, linkBounds: LinkBounds) {
		// Sanitize noteId in case it came from old/pasted content with special chars
		const safeNoteId = sanitizeSlug(noteId);
		if (!safeNoteId) {
			console.error('Cannot create note with empty slug from:', noteId);
			return;
		}

		const title = safeNoteId
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		// Create initial content as empty doc
		const content: JSONContent = {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		};

		try {
			const res = await fetch(`/api/notes/${safeNoteId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content })
			});

			if (!res.ok) {
				console.error('Failed to create note:', safeNoteId);
				return;
			}

			canvasStore.addNoteToVault(safeNoteId, title, content);
			onLinkClick(safeNoteId, card.id, linkBounds);
			setTimeout(() => canvasStore.enterEditMode(safeNoteId), 100);
		} catch (err) {
			console.error('Failed to create note:', err);
		}
	}

	// Handle click on card container
	function handleClick(event: MouseEvent) {
		if (!isHTMLElement(event.target)) return;

		const wikilinkEl = event.target.closest('.wikilink');
		if (wikilinkEl) {
			const target = (wikilinkEl as HTMLElement).dataset.target;
			if (target) {
				handleWikilinkClick(target);
			}
			return;
		}

		if (!isEditing) {
			onCardClick(card.id);
		}
	}

	// Handle keyboard in view mode
	function handleViewKeyDown(event: KeyboardEvent) {
		if (event.key === 'e' && !readOnly) {
			event.preventDefault();
			event.stopPropagation();
			enterEditMode();
			return;
		}
	}

	// Handle keyboard in edit mode
	function handleEditKeyDown(event: KeyboardEvent) {
		const isMod = event.metaKey || event.ctrlKey;

		if (isMod && event.key === 's') {
			event.preventDefault();
			saveNow();
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			exitEditMode();
			return;
		}
	}

	// Check if content is empty (no meaningful text)
	function isContentEmpty(json: JSONContent): boolean {
		if (!json.content || json.content.length === 0) return true;

		// Recursively check if there's any text content
		function hasText(node: JSONContent): boolean {
			if (node.type === 'text' && node.text && node.text.trim().length > 0) {
				return true;
			}
			if (node.content) {
				return node.content.some(hasText);
			}
			return false;
		}

		return !hasText(json);
	}

	// Handle content updates from TiptapEditor
	function handleEditorUpdate(json: JSONContent) {
		currentContent = json;
		// TODO: REVISIT THIS - We previously called canvasStore.updateNoteContent() here
		// for "instant view sync", but this caused an infinite reactive loop:
		// updateNoteContent() recreates the cards Map → cardList recomputes →
		// card prop changes → component re-renders → TiptapEditor fires onUpdate →
		// repeat. The exact mechanism isn't fully understood. For now, we only
		// update the store when saving. This may affect real-time sync if multiple
		// views of the same note exist.
		scheduleSave();
	}

	// Debounced save
	function scheduleSave() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(saveNow, 1500);
	}

	// Save content to server
	async function saveNow() {
		if (!currentContent) return;

		// Cancel any in-flight save request
		saveAbortController?.abort();
		saveAbortController = new AbortController();

		saveStatus = 'saving';

		try {
			const res = await fetch(`/api/notes/${card.note.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: card.note.title, content: currentContent }),
				signal: saveAbortController.signal
			});

			if (res.ok) {
				// Sync store after successful save (not on every keystroke)
				canvasStore.updateNoteContent(card.note.id, currentContent);
				saveStatus = 'saved';

				// Clear existing timer to prevent race condition
				clearTimeout(savedStatusTimer);
				savedStatusTimer = setTimeout(() => {
					if (saveStatus === 'saved') saveStatus = 'idle';
				}, 2000);
			} else {
				saveStatus = 'error';
			}
		} catch (err) {
			// Ignore abort errors (expected when cancelling in-flight saves)
			if (err instanceof Error && err.name === 'AbortError') return;
			saveStatus = 'error';
		}
	}

	// Check if link is broken (for TiptapEditor)
	function isLinkBroken(target: string): boolean {
		return canvasStore.isLinkBroken(target);
	}

	// Handle wikilink deletion - close the linked card
	function handleWikilinkDelete(target: string): void {
		canvasStore.unopenCard(target);
	}

	// Listen for request to exit edit mode (from Canvas when clicking outside)
	$effect(() => {
		const handleExitRequest = () => {
			if (isEditing) {
				exitEditMode();
			}
		};
		window.addEventListener('request-exit-edit-mode', handleExitRequest);
		return () => window.removeEventListener('request-exit-edit-mode', handleExitRequest);
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
			clearTimeout(savedStatusTimer);
			saveAbortController?.abort();
		};
	});

	// Observe content height changes and update store
	$effect(() => {
		if (!contentDiv) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newHeight = Math.ceil(entry.contentRect.height);
				if (newHeight > 0 && newHeight !== card.dimensions.height) {
					canvasStore.updateCardHeight(card.id, newHeight);

					// If editing, notify Canvas to update child card source links
					if (isEditing) {
						window.dispatchEvent(
							new CustomEvent('card-content-reflow', { detail: { cardId: card.id } })
						);
					}
				}
			}
		});

		observer.observe(contentDiv);
		return () => observer.disconnect();
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
		bind:this={contentDiv}
		xmlns="http://www.w3.org/1999/xhtml"
		class="text-block"
		class:dimmed={!isActive && !isEditing}
		class:focused={isActive && !isEditing}
		class:editing={isEditing}
		data-editing={isEditing ? 'true' : undefined}
		onclick={handleClick}
		ondblclick={enterEditMode}
		onkeydown={isEditing ? handleEditKeyDown : handleViewKeyDown}
	>
		<TiptapEditor
			bind:this={editorComponent}
			content={currentContent ?? card.note.content}
			onUpdate={handleEditorUpdate}
			onWikilinkClick={handleWikilinkClick}
			onWikilinkDelete={handleWikilinkDelete}
			{isLinkBroken}
			editable={isEditing}
		/>
	</div>
	{#if saveStatus === 'error'}
		<div
			xmlns="http://www.w3.org/1999/xhtml"
			class="save-indicator error"
		>
			Error saving
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
		user-select: none;
		cursor: default;
	}

	.text-block.editing {
		background: color-mix(in srgb, var(--text-link) 4%, transparent);
	}

	.save-indicator {
		position: absolute;
		top: -28px;
		right: 0;
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 3px;
		font-family: system-ui, sans-serif;
	}

	.save-indicator.error {
		background: #fee2e2;
		color: #dc2626;
	}

	.text-block::-webkit-scrollbar {
		width: 0;
		display: none;
	}
</style>
