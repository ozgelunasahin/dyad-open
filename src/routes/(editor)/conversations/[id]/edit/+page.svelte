<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { JSONContent } from '@tiptap/core';
	import type { TimeSlotInput } from '$lib/domain/types';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import PublishSheet from '$lib/components/PublishSheet.svelte';
	import { copy } from '$lib/copy';

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
		if (saveTimer) clearTimeout(saveTimer);
		saveStatus = 'idle';
		saveTimer = setTimeout(saveNow, 1500);
	}

	// ── Navigation guard ───────────────────────────────────────────────────────
	beforeNavigate((navigation) => {
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
				publishError = `Upload failed: ${(err as any).error ?? 'unknown error'}`;
				coverPreview = null;
			}
		} catch {
			publishError = 'Upload failed: network error';
			coverPreview = null;
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

	function handleOpenPublish() {
		publishError = '';
		if (uploading) { publishError = 'Please wait for the cover image to finish uploading.'; return; }
		if (!title.trim()) { publishError = 'Title is required to publish.'; return; }
		if (!coverImageUrl) {
			if (coverPreview) {
				publishError = 'Cover image upload may have failed. Please try uploading again.';
			} else {
				publishError = 'Cover image is required to publish.';
			}
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

	// ── Unpublish ──────────────────────────────────────────────────────────────
	async function handleUnpublish() {
		const res = await fetch(`/api/prompts/${data.prompt.id}/unpublish`, { method: 'POST' });
		if (res.ok) goto(`/conversations/${data.prompt.id}/edit`, { invalidateAll: true });
	}

	let isDraft = $derived(data.prompt.state === 'draft');
	let isPublished = $derived(data.prompt.state === 'published');
</script>

<svelte:head>
	<title>{title || 'Edit'} - dyad.berlin</title>
</svelte:head>

<!-- FloatingNav default variant with editor controls -->
<div class="floating-nav-wrapper">
	<FloatingNav
		variant="default"
saveStatus={saveStatus}
		onSaveDraft={handleSaveDraft}
		onPublish={isDraft ? handleOpenPublish : undefined}
	/>
</div>

<div class="content">
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
		<PromptEditor content={body} onUpdate={handleEditorUpdate} showToolbar={false} />
	{:catch}
		<p class="error-text">{copy.editor.failedToLoad}</p>
	{/await}

	{#if publishError}
		<p class="publish-error">{publishError}</p>
	{/if}

	<!-- Published state management -->
	{#if isPublished}
		<section class="published-info">
			<h2 class="section-title">{copy.editor.published}</h2>
			<p class="section-desc">{copy.editor.publishedDesc}</p>
			{#if data.slots.length > 0}
				<div class="slot-list">
					{#each data.slots as slot}
						<div class="existing-slot">
							<span>{new Date(slot.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
							<span>{new Date(slot.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
							<span>{slot.duration_minutes} min</span>
							<span class="slot-area">{slot.general_area}</span>
						</div>
					{/each}
				</div>
			{/if}
			<button class="unpublish-btn" onclick={handleUnpublish}>{copy.editor.unpublish}</button>
		</section>
	{/if}
</div>

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
</style>
