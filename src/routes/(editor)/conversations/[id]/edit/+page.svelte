<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { JSONContent } from '@tiptap/core';
	import type { TimeSlotInput } from '$lib/domain/types';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PublishSheet from '$lib/components/PublishSheet.svelte';
	import { copy } from '$lib/copy';
	import { capture } from '$lib/analytics';

	let { data }: { data: PageData } = $props();

	// ── Editable state ─────────────────────────────────────────────────────────
	// svelte-ignore state_referenced_locally — intentional initial-value capture for editor fields
	let title = $state(data.prompt.title ?? '');
	// svelte-ignore state_referenced_locally
	let body = $state<JSONContent>(data.prompt.body ?? { type: 'doc', content: [{ type: 'paragraph' }] });
	// svelte-ignore state_referenced_locally
	let coverImageUrl = $state(data.prompt.cover_image_url || '');
	let coverPreview = $state<string | null>(null);

	// ── Auto-save ──────────────────────────────────────────────────────────────
	let saveGeneration = 0;
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	/** True once the draft has any real content (title, body text, or cover).
	 *  Starts true for drafts that already have content from the server;
	 *  stays false for freshly-created blank drafts until the user types. */
	function bodyHasText(json: JSONContent | null | undefined): boolean {
		if (!json) return false;
		if (json.type === 'text' && typeof json.text === 'string' && json.text.trim()) return true;
		if (!json.content) return false;
		return json.content.some(bodyHasText);
	}
	// svelte-ignore state_referenced_locally — initial-value capture from server data
	let hasContent = $state(
		!!data.prompt.title?.trim() || !!data.prompt.cover_image_url || bodyHasText(data.prompt.body)
	);

	async function saveNow() {
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		const gen = ++saveGeneration;
		saveStatus = 'saving';
		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title || null,
					body,
					coverImageUrl: coverImageUrl || null
				})
			});
			if (gen !== saveGeneration) return;
			saveStatus = res.ok ? 'saved' : 'error';
		} catch {
			if (gen !== saveGeneration) return;
			saveStatus = 'error';
		}
	}

	function scheduleSave() {
		// Skip autosave while the draft is still completely blank — no title,
		// no body text, no cover. Once the user puts anything in, latch
		// hasContent to true so future edits (including clearing back to
		// blank) still save normally.
		if (!hasContent) {
			hasContent = !!title.trim() || !!coverImageUrl || bodyHasText(body);
			if (!hasContent) return;
		}
		if (saveTimer) clearTimeout(saveTimer);
		saveStatus = 'idle';
		saveTimer = setTimeout(saveNow, 1500);
	}

	// ── Navigation guard ───────────────────────────────────────────────────────
	beforeNavigate((navigation) => {
		// Draft was created by /conversations/new but never touched — delete
		// the empty row so untouched "+" clicks don't pile up as blanks.
		// Only fire for drafts (published prompts can validly have no body
		// in unusual states and we shouldn't drop those).
		if (!hasContent && data.prompt.state === 'draft') {
			// Cancel any pending autosave AND invalidate any in-flight one
			// (bump saveGeneration so a returning PATCH no-ops on the state
			// check). Without this, a debounced save could land after the
			// DELETE and resurrect the prompt server-side.
			if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
			saveGeneration++;
			// Prefer sendBeacon so the DELETE survives tab-close / mobile
			// Safari navigation; fall back to fetch when unavailable.
			const url = `/api/prompts/${data.prompt.id}`;
			if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
				// sendBeacon only supports POST; use a dedicated override header
				// that the DELETE handler already accepts via method. For now,
				// send via fetch with keepalive, which gives the same tab-close
				// durability without needing a new endpoint shape.
				fetch(url, { method: 'DELETE', keepalive: true }).catch(() => {});
			} else {
				fetch(url, { method: 'DELETE' }).catch(() => {});
			}
			return;
		}
		if (!saveTimer) return;
		if (navigation.willUnload) { navigation.cancel(); return; }
		navigation.cancel();
		saveNow().then(() => {
			if (navigation.to?.url) goto(navigation.to.url.pathname);
		});
	});

	onMount(() => {
		const handler = (e: BeforeUnloadEvent) => { if (saveTimer) { e.preventDefault(); e.returnValue = ''; } };
		window.addEventListener('beforeunload', handler);
		return () => {
			window.removeEventListener('beforeunload', handler);
			if (saveTimer) clearTimeout(saveTimer);
			if (coverPreview) URL.revokeObjectURL(coverPreview);
		};
	});

	// ── Editor update handler ──────────────────────────────────────────────────
	function handleEditorUpdate(json: JSONContent) {
		body = json;
		scheduleSave();
	}

	function handleTitleInput() {
		scheduleSave();
	}

	// ── Cover image ────────────────────────────────────────────────────────────
	let uploading = $state(false);
	let dragOver = $state(false);
	let dragEnterCount = 0;
	let coverError = $state(false);

	async function uploadFile(file: File) {
		if (coverPreview) URL.revokeObjectURL(coverPreview);
		coverPreview = URL.createObjectURL(file);
		coverError = false;
		publishError = '';

		uploading = true;
		const formData = new FormData();
		formData.append('file', file);
		try {
			const res = await fetch('/api/upload', { method: 'POST', body: formData });
			if (res.ok) {
				const { url } = await res.json();
				coverImageUrl = url;
				scheduleSave();
			} else {
				const err = await res.json().catch(() => ({}));
				const ref = (err as { reference?: string }).reference;
				publishError =
					`Upload failed: ${(err as { error?: string }).error ?? 'unknown error'}` +
					(ref ? ` (ref: ${ref})` : '');
				// Clear both the in-flight preview AND any stale upload URL so the
				// placeholder returns to its "add a cover" state. Prevents the
				// "image appears present but publish complains" trap.
				URL.revokeObjectURL(coverPreview);
				coverPreview = null;
				coverImageUrl = '';
				coverError = true;
			}
		} catch {
			publishError = 'Upload failed: network error. Please try again.';
			if (coverPreview) URL.revokeObjectURL(coverPreview);
			coverPreview = null;
			coverImageUrl = '';
			coverError = true;
		} finally {
			uploading = false;
		}
	}

	function handleCoverUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) uploadFile(file);
	}

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		dragEnterCount++;
		dragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragEnterCount--;
		if (dragEnterCount <= 0) {
			dragEnterCount = 0;
			dragOver = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		dragEnterCount = 0;
		const file = e.dataTransfer?.files[0];
		if (file && file.type.startsWith('image/')) uploadFile(file);
	}

	// ── Publish flow ──────────────────────────────────────────────────────────
	let showPublishSheet = $state(false);
	let publishing = $state(false);
	let publishError = $state('');

	async function handleSaveDraft() {
		await saveNow();
		goto('/profile');
	}

	let discardDialog = $state<ConfirmDialog | undefined>();

	async function handleDiscard() {
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		const res = await fetch(`/api/prompts/${data.prompt.id}`, { method: 'DELETE' });
		if (res.ok) goto('/profile?view=conversations');
		else publishError = 'Failed to discard draft.';
	}

	function handleOpenPublish() {
		publishError = '';
		if (uploading) { publishError = 'Please wait for the cover image to finish uploading.'; return; }
		if (!title.trim()) { publishError = 'Title is required to publish.'; return; }
		// uploadFile() clears coverPreview + coverImageUrl on failure, so the
		// only way to reach this branch is a legitimately-missing cover.
		if (!coverImageUrl) {
			publishError = 'Cover image is required to publish.';
			coverError = true;
			return;
		}
		showPublishSheet = true;
	}

	async function handlePublish(slots: TimeSlotInput[]) {
		publishError = '';

		if (slots.length === 0) {
			publishError = 'At least one slot with a location is required.';
			return;
		}

		publishing = true;
		await saveNow();

		try {
			const res = await fetch(`/api/prompts/${data.prompt.id}/publish`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slots })
			});
			if (res.ok) {
				capture('conversation_published', { prompt_id: data.prompt.id, slot_count: slots.length });
				goto(`/conversations/${data.prompt.id}`);
			} else {
				const err = await res.json().catch(() => ({}));
				publishError = (err as any).error ?? 'Failed to publish';
			}
		} catch {
			publishError = 'Network error. Please try again.';
		} finally {
			publishing = false;
		}
	}

	// ── Unpublish / Archive ────────────────────────────────────────────────────
	async function handleUnpublish() {
		const res = await fetch(`/api/prompts/${data.prompt.id}/unpublish`, { method: 'POST' });
		if (res.ok) goto('/profile?view=conversations');
		else { const e = await res.json().catch(() => ({})); publishError = (e as any).error ?? copy.conversation.failedToArchive; }
	}

	// ── Delete (published) ─────────────────────────────────────────────────────
	let deletePublishedDialog = $state<ConfirmDialog | undefined>();

	async function handleDeletePublished() {
		const res = await fetch(`/api/prompts/${data.prompt.id}`, { method: 'DELETE' });
		if (res.ok) goto('/profile?view=conversations');
		else { const e = await res.json().catch(() => ({})); publishError = (e as any).error ?? copy.conversation.failedToDelete; }
	}

	let isDraft = $derived(data.prompt.state === 'draft');
	let isPublished = $derived(data.prompt.state === 'published');
	let isArchived = $derived(data.prompt.state === 'archived');
</script>

<svelte:head>
	<title>{title || 'Edit'} - dyad.berlin</title>
</svelte:head>

<!-- Profile-style nav on editor page -->
<div class="floating-nav-wrapper">
	<FloatingNav variant="profile" />
</div>

<div class="content">
	<!-- Action bar: always shown above cover image -->
	<div class="pub-action-bar">
		<span class="pub-save-status">
			<button type="button" class="back-arrow" aria-label="Go back" onclick={() => history.back()}>
				<svg width="18" height="18" viewBox="0 0 20 20" fill="none">
					<path d="M12 4l-6 6 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
			{#if saveStatus === 'saving'}
				<span class="save-dot saving"></span> {copy.editor.saving}
			{:else if saveStatus === 'error'}
				<span class="save-dot error"></span> {copy.editor.saveError}
			{:else if hasContent}
				<span class="save-dot saved"></span> {copy.editor.saved}
			{/if}
		</span>
		<div class="pub-actions">
			{#if isDraft}
				<button class="unpublish-btn" onclick={() => discardDialog?.open()}>{copy.editor.discard}</button>
				<button class="btn-primary btn-primary--sm" onclick={handleOpenPublish}>{copy.editor.publishAction}</button>
			{:else if isArchived}
				<button class="delete-btn" onclick={() => deletePublishedDialog?.open()}>{copy.editor.deleteAction}</button>
				<button class="btn-primary btn-primary--sm" onclick={handleOpenPublish}>{copy.editor.republishAction}</button>
			{:else}
				<!-- Published: content edits auto-save. No publish-style action — the
					conversation is already live. Archive takes it off the feed; Delete
					removes it permanently. -->
				<button class="unpublish-btn" onclick={handleUnpublish}>{copy.editor.archiveAction}</button>
				<button class="delete-btn" onclick={() => deletePublishedDialog?.open()}>{copy.editor.deleteAction}</button>
			{/if}
		</div>
	</div>

	<!-- Cover image upload zone -->
	{#if coverPreview || coverImageUrl}
		<div class="cover-preview-wrap">
			<img src={coverPreview || coverImageUrl} alt="Cover" class="cover-preview" />
			<label class="cover-change">
				{uploading ? 'Uploading...' : 'Change cover'}
				<input type="file" accept="image/jpeg,image/png,image/webp" onchange={handleCoverUpload} class="sr-only" />
			</label>
		</div>
	{:else}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<label
			class="cover-placeholder"
			class:drag-over={dragOver}
			class:cover-error={coverError}
			ondragenter={handleDragEnter}
			ondragleave={handleDragLeave}
			ondragover={(e) => e.preventDefault()}
			ondrop={handleDrop}
		>
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="cover-icon">
				<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				<circle cx="9" cy="9" r="1.5" fill="currentColor"/>
			</svg>
			<span class="cover-text">Add a cover photo</span>
			<span class="cover-hint">{uploading ? 'Uploading...' : 'Required. Click or drag an image.'}</span>
			<input type="file" accept="image/jpeg,image/png,image/webp" onchange={handleCoverUpload} class="sr-only" />
		</label>
	{/if}

	<!-- Title -->
	<input
		class="title-input"
		type="text"
		bind:value={title}
		oninput={handleTitleInput}
		placeholder="Title"
		maxlength={200}
	/>

	<!-- Username badge -->
	<span class="username-badge">@{data.username}</span>

	<!-- TipTap Editor (no toolbar) -->
	{#await import('$lib/components/PromptEditor.svelte')}
		<div class="editor-loading">{copy.editor.loadingEditor}</div>
	{:then { default: PromptEditor }}
		<PromptEditor content={body} onUpdate={handleEditorUpdate} showToolbar={false} placeholder="you can start writing here" />
	{:catch}
		<p class="error-text">{copy.editor.failedToLoad}</p>
	{/await}

	{#if publishError}
		<p class="publish-error">{publishError}</p>
	{/if}

	<!-- Published: slot list info only -->
	{#if isPublished && data.slots.length > 0}
		<section class="published-info">
			{#each data.slots as slot}
				<div class="existing-slot">
					<span>{new Date(slot.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
					<span>{new Date(slot.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
					<span>{slot.duration_minutes} min</span>
					<span class="slot-area">{slot.general_area}</span>
				</div>
			{/each}
		</section>
	{/if}
</div>

<ConfirmDialog
	bind:this={discardDialog}
	title={copy.editor.discardTitle}
	message={copy.editor.discardConfirm}
	confirmLabel={copy.editor.discard}
	onConfirm={handleDiscard}
/>

<ConfirmDialog
	bind:this={deletePublishedDialog}
	title={copy.editor.deleteTitle}
	message={copy.editor.deleteConfirm}
	confirmLabel={copy.editor.deleteAction}
	onConfirm={handleDeletePublished}
/>

<!-- Publish bottom sheet -->
{#if showPublishSheet}
	<PublishSheet
		onClose={() => showPublishSheet = false}
		onPublish={handlePublish}
		{publishing}
		error={publishError}
	/>
{/if}

<style>
	.floating-nav-wrapper { display: block; }
	.content { width: 100%; max-width: var(--content-standard); padding-top: var(--space-4); padding-bottom: var(--nav-clearance); }

	/* Cover image placeholder */
	.cover-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-10) var(--space-8);
		margin-bottom: var(--space-6);
		border: 1.5px dashed rgba(0, 0, 0, 0.12);
		border-radius: var(--radius-card);
		background: rgba(0, 0, 0, 0.025);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.cover-placeholder:hover { border-color: var(--text-muted); background: rgba(0, 0, 0, 0.04); }
	.cover-placeholder.drag-over { border-color: var(--text-primary); background: rgba(0, 0, 0, 0.05); border-style: solid; }
	.cover-placeholder.cover-error { border-color: var(--color-danger); }

	.cover-icon { color: var(--text-muted); }
	.cover-text { font-size: var(--text-lg); color: var(--text-muted); font-weight: 500; }
	.cover-hint { font-size: var(--text-sm); color: var(--text-muted); }

	/* Cover preview */
	.cover-preview-wrap { position: relative; margin-bottom: var(--space-6); }
	.cover-preview { width: 100%; max-height: 280px; object-fit: cover; border-radius: var(--radius-card); display: block; }
	.cover-change {
		position: absolute;
		bottom: var(--space-3);
		right: var(--space-3);
		font-size: var(--text-xs);
		color: #fff;
		background: rgba(0, 0, 0, 0.6);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-input);
		cursor: pointer;
	}

	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

	/* Title — large serif matching design ref */
	.title-input {
		font-size: var(--text-3xl);
		font-weight: 300;
		color: var(--text-primary);
		border: none;
		background: transparent;
		width: 100%;
		padding: 0;
		margin-bottom: var(--space-3);
		outline: none;
		line-height: var(--leading-tight);
	}

	@media (min-width: 480px) {
		.title-input { font-size: 2.2rem; }
	}

	.title-input::placeholder { color: var(--text-muted); opacity: var(--opacity-disabled); }

	/* Username badge */
	.username-badge {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.04);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-pill);
		margin-bottom: var(--space-5);
	}

	.editor-loading {
		padding: var(--space-10);
		text-align: center;
		color: var(--text-muted);
	}

	.error-text { color: var(--color-danger); font-size: var(--text-sm); }
	.publish-error { font-size: var(--text-sm); color: var(--color-danger); margin: var(--space-3) 0; }

	/* Published state */
	.published-info { margin-top: var(--space-10); padding-top: var(--space-8); border-top: 1px solid var(--border-link); }
	.section-title { font-size: var(--text-lg); font-weight: normal; margin: 0 0 var(--space-1); color: var(--text-primary); }
	.section-desc { font-size: var(--text-sm); color: var(--text-muted); margin: 0 0 var(--space-5); }

	.slot-list { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
	.existing-slot {
		display: flex;
		gap: var(--space-3);
		font-size: var(--text-sm);
		color: var(--text-primary);
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border-link);
	}
	.slot-area { color: var(--text-muted); text-transform: uppercase; font-size: var(--text-xs); letter-spacing: 0.04em; }

	.published-actions { display: flex; gap: var(--space-4); align-items: center; margin-top: var(--space-4); }

	.delete-btn {
		font-size: var(--text-sm);
		color: var(--color-danger);
		background: none;
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-input);
		padding: var(--space-2) var(--space-4);
		cursor: pointer;
	}
	.delete-btn:hover { opacity: var(--opacity-hover-btn); }

	.unpublish-btn {
		font-size: var(--text-sm);
		color: var(--text-muted);
		background: none;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		padding: var(--space-2) var(--space-4);
		cursor: pointer;
	}
	.unpublish-btn:hover { border-color: var(--text-primary); color: var(--text-primary); }

	/* .btn-primary / .btn-primary--sm live in shared.css */

	/* Back arrow */
	.back-arrow {
		display: inline-flex;
		align-items: center;
		color: var(--text-muted);
		margin-right: var(--space-3);
		flex-shrink: 0;
		transition: color 0.15s;
	}
	.back-arrow:hover { color: var(--text-primary); }

	/* Published action bar — top of page */
	.pub-action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-6);
	}

	.pub-save-status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.save-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.save-dot.saved { background: var(--color-success); }
	.save-dot.saving { background: var(--color-saving); }

	.pub-actions { display: flex; gap: var(--space-3); align-items: center; }

	.continue-inline-btn {
		font-size: var(--text-sm);
		font-weight: 500;
		padding: var(--space-2) var(--space-5);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.continue-inline-btn:hover { opacity: var(--opacity-hover-btn); }
</style>
