<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { JSONContent } from '@tiptap/core';
	import type { TimeSlotInput } from '$lib/domain/types';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import PublishSheet from '$lib/components/PublishSheet.svelte';

	let { data }: { data: PageData } = $props();

	// ── Editable state ─────────────────────────────────────────────────────────
	let title = $state(data.prompt.title ?? '');
	let body = $state<JSONContent>(data.prompt.body ?? { type: 'doc', content: [{ type: 'paragraph' }] });
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
				goto(`/prompts/${data.prompt.id}`);
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
		if (res.ok) goto(`/prompts/${data.prompt.id}/edit`, { invalidateAll: true });
	}

	function handleBack() {
		if (saveTimer) {
			saveNow().then(() => history.back());
		} else {
			history.back();
		}
	}

	let isDraft = $derived(data.prompt.state === 'draft');
	let isPublished = $derived(data.prompt.state === 'published');
</script>

<svelte:head>
	<title>{title || 'Edit'} - dyad.berlin</title>
</svelte:head>

<!-- FloatingNav editor variant -->
<div class="floating-nav-wrapper">
	<FloatingNav
		variant="editor"
		position="top"
		saveStatus={saveStatus}
		onBack={handleBack}
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
		<div class="editor-loading">Loading editor...</div>
	{:then { default: PromptEditor }}
		<PromptEditor content={body} onUpdate={handleEditorUpdate} showToolbar={false} />
	{:catch}
		<p class="error-text">Failed to load editor.</p>
	{/await}

	{#if publishError}
		<p class="publish-error">{publishError}</p>
	{/if}

	<!-- Published state management -->
	{#if isPublished}
		<section class="published-info">
			<h2 class="section-title">Published</h2>
			<p class="section-desc">Your conversation is live on the discover feed.</p>
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
			<button class="unpublish-btn" onclick={handleUnpublish}>Unpublish</button>
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
	.content { width: 100%; max-width: 700px; padding-top: 72px; }

	/* Cover image placeholder */
	.cover-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 32px;
		margin-bottom: 24px;
		border: 2px dashed var(--border-link, rgba(0, 0, 0, 0.15));
		border-radius: 12px;
		background: rgba(0, 0, 0, 0.02);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.cover-placeholder:hover { border-color: var(--text-muted, #999); }
	.cover-placeholder.drag-over { border-color: var(--text-primary); background: rgba(0, 0, 0, 0.05); border-style: solid; }
	.cover-placeholder.cover-error { border-color: #c00; }

	.cover-icon { color: var(--text-muted, #bbb); }
	.cover-text { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 0.95rem; color: var(--text-muted, #999); }
	.cover-hint { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 0.8rem; color: var(--text-muted, #bbb); }

	/* Cover preview */
	.cover-preview-wrap { position: relative; margin-bottom: 24px; }
	.cover-preview { width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; display: block; }
	.cover-change {
		position: absolute;
		bottom: 12px;
		right: 12px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 12px;
		color: #fff;
		background: rgba(0, 0, 0, 0.6);
		padding: 6px 12px;
		border-radius: 6px;
		cursor: pointer;
	}

	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

	/* Title */
	.title-input {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 2rem;
		font-weight: normal;
		color: var(--text-primary);
		border: none;
		background: transparent;
		width: 100%;
		padding: 0;
		margin-bottom: 12px;
		outline: none;
	}

	.title-input::placeholder { color: var(--text-muted, #ccc); }

	/* Username badge */
	.username-badge {
		display: inline-block;
		font-family: 'SF Mono', monospace;
		font-size: 0.8rem;
		color: var(--text-muted, #999);
		background: rgba(0, 0, 0, 0.04);
		padding: 4px 12px;
		border-radius: 999px;
		margin-bottom: 20px;
	}

	.editor-loading {
		padding: 40px;
		text-align: center;
		color: var(--text-muted, #999);
		font-family: 'SangBleu Sunrise', Georgia, serif;
	}

	.error-text { color: #c00; font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; }
	.publish-error { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 13px; color: #c00; margin: 12px 0; }

	/* Published state */
	.published-info { margin-top: 40px; padding-top: 32px; border-top: 1px solid var(--border-link, rgba(0,0,0,0.08)); }
	.section-title { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 1.1rem; font-weight: normal; margin: 0 0 4px; color: var(--text-primary); }
	.section-desc { font-family: 'SangBleu Sunrise', Georgia, serif; font-size: 0.85rem; color: var(--text-muted, #666); margin: 0 0 20px; }

	.slot-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
	.existing-slot {
		display: flex;
		gap: 12px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-primary);
		padding: 8px 0;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06));
	}
	.slot-area { color: var(--text-muted, #666); text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }

	.unpublish-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		background: none;
		border: 1px solid var(--border-link, rgba(0,0,0,0.15));
		border-radius: 6px;
		padding: 8px 16px;
		cursor: pointer;
	}
	.unpublish-btn:hover { border-color: var(--text-primary); color: var(--text-primary); }
</style>
