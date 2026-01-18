<script lang="ts">
	import { tick } from 'svelte';
	import type { Card } from '$lib/types';
	import type { JSONContent } from '@tiptap/core';
	import { isHTMLElement } from '$lib/utils/type-guards';
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
	let currentContent = $state<JSONContent | null>(null);

	// TiptapEditor reference
	let editorComponent: TiptapEditor;

	// Enter edit mode
	async function enterEditMode() {
		if (readOnly) return;

		if (canvasStore.editingCardId && canvasStore.editingCardId !== card.id) {
			canvasStore.exitEditMode();
		}

		currentContent = card.note.content;
		canvasStore.enterEditMode(card.id);

		await tick();
		editorComponent?.focus();
	}

	// Exit edit mode and save
	async function exitEditMode() {
		clearTimeout(debounceTimer);
		if (currentContent && saveStatus !== 'saving') {
			await saveNow();
		}
		canvasStore.exitEditMode();
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
		const title = noteId
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

		// Create initial content as ProseMirror JSON
		const content: JSONContent = {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 1 },
					content: [{ type: 'text', text: title }]
				},
				{
					type: 'paragraph'
				}
			]
		};

		try {
			const res = await fetch(`/api/notes/${noteId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content })
			});

			if (!res.ok) {
				console.error('Failed to create note:', noteId);
				return;
			}

			canvasStore.addNoteToVault(noteId, title, content);
			onLinkClick(noteId, card.id, linkBounds);
			setTimeout(() => canvasStore.enterEditMode(noteId), 100);
		} catch (err) {
			console.error('Failed to create note:', err);
		}
	}

	// Handle click on card container
	function handleClick(event: MouseEvent) {
		if (!isHTMLElement(event.target)) return;

		const wikilinkTarget = event.target.closest('.wikilink');
		if (wikilinkTarget) {
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

		saveStatus = 'saving';

		try {
			const res = await fetch(`/api/notes/${card.note.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: card.note.title, content: currentContent })
			});

			if (res.ok) {
				// Sync store after successful save (not on every keystroke)
				canvasStore.updateNoteContent(card.note.id, currentContent);
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

	// Check if link is broken (for TiptapEditor)
	function isLinkBroken(target: string): boolean {
		return canvasStore.isLinkBroken(target);
	}

	// Cleanup on unmount
	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
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
		data-editing={isEditing ? 'true' : undefined}
		onclick={handleClick}
		onkeydown={isEditing ? handleEditKeyDown : handleViewKeyDown}
	>
		<TiptapEditor
			bind:this={editorComponent}
			content={isEditing ? (currentContent ?? card.note.content) : card.note.content}
			onUpdate={handleEditorUpdate}
			onWikilinkClick={handleWikilinkClick}
			{isLinkBroken}
			editable={isEditing}
		/>
	</div>
	{#if isEditing && saveStatus !== 'idle'}
		<div
			xmlns="http://www.w3.org/1999/xhtml"
			class="save-indicator"
			class:saving={saveStatus === 'saving'}
			class:error={saveStatus === 'error'}
		>
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

	.text-block.editing {
		background: color-mix(in srgb, var(--text-link) 4%, transparent);
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

	.text-block::-webkit-scrollbar {
		width: 0;
		display: none;
	}
</style>
