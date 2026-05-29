<script lang="ts">
	import { beforeNavigate, goto, invalidateAll, replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { JSONContent } from '@tiptap/core';
	import type { TimeSlotInput } from '$lib/domain/types';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import PublishSheet from '$lib/components/PublishSheet.svelte';
	import type { SubmitSlot } from '$lib/domain/types';
	import { capture } from '$lib/analytics';
	import { copy } from '$lib/copy';

	let { data }: { data: PageData } = $props();

	// Tracks the prompt id locally so lazy-create can flip it from 'new' to a
	// real UUID without fighting Svelte 5's readonly $props.
	// svelte-ignore state_referenced_locally
	let promptId = $state(data.prompt.id);

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
			// First save of a /conversations/new session — create the row now,
			// then rewrite the URL so subsequent edits go through the PATCH path.
			if (promptId === 'new') {
				const res = await fetch('/api/prompts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: title || undefined,
						body,
						coverImageUrl: coverImageUrl || undefined
					})
				});
				if (gen !== saveGeneration) return;
				if (res.ok) {
					const created = await res.json();
					promptId = created.id;
					replaceState(`/conversations/${created.id}/edit`, {});
					saveStatus = 'saved';
				} else {
					saveStatus = 'error';
				}
				return;
			}

			const res = await fetch(`/api/prompts/${promptId}`, {
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
		// The virtual /conversations/new/edit page has no backing row yet, so
		// there's nothing to save, nothing to delete. Just let navigation through.
		if (promptId === 'new') return;

		// Draft row exists but the user cleared all content back to blank
		// (or never really added any) — delete the blank row on the way out.
		const blank = !title.trim() && !coverImageUrl && !bodyHasText(body);
		if (blank && data.prompt.state === 'draft') {
			if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
			saveGeneration++;
			fetch(`/api/prompts/${promptId}`, { method: 'DELETE', keepalive: true }).catch(() => {});
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
	let coverErrorMessage = $state<string | null>(null);

	function friendlyUploadError(serverMessage: string | undefined): string {
		const msg = serverMessage ?? '';
		if (msg.includes('Invalid file type')) return copy.editor.coverInvalidType;
		if (msg.includes('too large')) return copy.editor.coverTooLarge;
		return copy.editor.coverUploadFailed;
	}

	async function uploadFile(file: File) {
		if (coverPreview) URL.revokeObjectURL(coverPreview);
		coverPreview = URL.createObjectURL(file);
		coverError = false;
		coverErrorMessage = null;
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
				coverErrorMessage = friendlyUploadError((err as { error?: string }).error);
				// Clear both the in-flight preview AND any stale upload URL so the
				// placeholder returns to its "add a cover" state. Prevents the
				// "image appears present but publish complains" trap.
				URL.revokeObjectURL(coverPreview);
				coverPreview = null;
				coverImageUrl = '';
				coverError = true;
			}
		} catch {
			coverErrorMessage = copy.editor.coverNetworkError;
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
	let savingSlots = $state(false);
	let publishError = $state('');

	async function handleSaveDraft() {
		await saveNow();
		goto('/profile');
	}

	let discardDialog = $state<ConfirmDialog | undefined>();

	async function handleDiscard() {
		if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
		const res = await fetch(`/api/prompts/${promptId}`, { method: 'DELETE' });
		if (res.ok) {
			capture('conversation_deleted', { origin: 'editor' });
			goto('/profile?view=conversations');
		} else publishError = 'Failed to discard draft.';
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

	async function handlePublish(submitted: SubmitSlot[], audienceScope: string | null, capacity: number) {
		publishError = '';

		// Publish requires LocationRef per slot. Drop incomplete drafts (those
		// without locations — typically existing slots whose stored location
		// the loader had to mask via the public view; if the user wanted to
		// republish them as-is, they need to re-pick the location to confirm).
		const slots = submitted
			.filter((s) => s.location)
			.map((s) => ({
				start_time: s.start_time,
				duration_minutes: s.duration_minutes,
				location: s.location
			}));

		if (slots.length === 0) {
			publishError = 'At least one slot with a location is required.';
			return;
		}

		publishing = true;
		await saveNow();

		try {
			const res = await fetch(`/api/prompts/${promptId}/publish`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slots, audience_scope: audienceScope, capacity })
			});
			if (res.ok) {
				capture('conversation_published');
				goto(`/conversations/${promptId}`);
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

	// Save slot changes without publishing. Computes diff against the loader's
	// initial slot set (data.slots) and sends add/edit/remove via the PATCH
	// /slots endpoint. Lets the author stage their slots on a draft and come
	// back later to publish, or adjust slots on a republishable archive.
	async function handleSaveSlots(submitted: SubmitSlot[]) {
		publishError = '';
		savingSlots = true;
		try {
			const initialIds = new Set((data.slots ?? []).map((s) => s.id));
			const submittedIds = new Set(submitted.filter((s) => s.dbId).map((s) => s.dbId as string));
			const remove = [...initialIds].filter((id) => !submittedIds.has(id));
			// Edit existing slots — always include start_time/duration; include
			// location only when the user picked a new one (non-null). When
			// null, the loader masked it (public view privacy) and editSlot
			// leaves the stored exact_location alone.
			const edit = submitted
				.filter((s) => s.dbId)
				.map((s) => {
					const updates: Record<string, unknown> = {
						start_time: s.start_time,
						duration_minutes: s.duration_minutes
					};
					if (s.location) updates.location = s.location;
					return { slotId: s.dbId as string, updates };
				});
			// New slots — must have a location. Drop incomplete drafts silently.
			const add = submitted
				.filter((s) => !s.dbId && s.location)
				.map((s) => ({
					start_time: s.start_time,
					duration_minutes: s.duration_minutes,
					location: s.location
				}));
			const res = await fetch(`/api/prompts/${promptId}/slots`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ add, edit, remove })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				publishError = (err as { error?: string }).error ?? 'Failed to save slots.';
				return;
			}
			showPublishSheet = false;
			await invalidateAll();
		} catch {
			publishError = 'Network error. Please try again.';
		} finally {
			savingSlots = false;
		}
	}

	let isDraft = $derived(data.prompt.state === 'draft');
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
				<button class="action-btn" onclick={() => discardDialog?.open()}>{copy.editor.discard}</button>
				<button class="btn-primary btn-primary--sm" onclick={handleOpenPublish}>{copy.editor.publishAction}</button>
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

	{#if coverErrorMessage}
		<p class="cover-error-message" role="alert">{coverErrorMessage}</p>
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

</div>

<ConfirmDialog
	bind:this={discardDialog}
	title={copy.editor.discardTitle}
	message={copy.editor.discardConfirm}
	confirmLabel={copy.editor.discard}
	onConfirm={handleDiscard}
/>

<!-- Publish bottom sheet -->
{#if showPublishSheet}
	<PublishSheet
		onClose={() => showPublishSheet = false}
		onPublish={handlePublish}
		onSave={handleSaveSlots}
		initialSlots={data.slots}
		availableScopes={data.myScopes}
		region={data.prompt.region}
		{publishing}
		saving={savingSlots}
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
		border: 1.5px dashed color-mix(in srgb, var(--text-primary) 12%, transparent);
		border-radius: var(--radius-card);
		background: color-mix(in srgb, var(--text-primary) 2.5%, transparent);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.cover-placeholder:hover { border-color: var(--text-muted); background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
	.cover-placeholder.drag-over { border-color: var(--text-primary); background: color-mix(in srgb, var(--text-primary) 5%, transparent); border-style: solid; }
	.cover-placeholder.cover-error { border-color: var(--color-danger); }

	.cover-error-message {
		font-size: var(--text-sm);
		color: var(--color-danger);
		margin: var(--space-2) 0 var(--space-3);
	}

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
		background: color-mix(in srgb, var(--text-primary) 4%, transparent);
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

	.action-btn {
		font-size: var(--text-sm);
		color: var(--text-muted);
		background: none;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		padding: var(--space-2) var(--space-4);
		cursor: pointer;
	}
	.action-btn:hover { border-color: var(--text-primary); color: var(--text-primary); }

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
</style>
