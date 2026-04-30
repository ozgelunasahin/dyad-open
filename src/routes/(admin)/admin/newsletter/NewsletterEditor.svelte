<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { createSubscriber } from 'svelte/reactivity';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import Placeholder from '@tiptap/extension-placeholder';
	import type { JSONContent } from '@tiptap/core';

	interface Post {
		id: string;
		slug: string;
		title: string;
		subtitle: string | null;
		author: string | null;
		published_at: string;
		teaser: string;
		cover_image_url: string | null;
		tags: string[];
		body: JSONContent;
		published: boolean;
	}

	interface Props {
		post?: Post | null;
	}

	let { post = null }: Props = $props();

	const isNew = !post?.id;

	// ── Fields ─────────────────────────────────────────────────────────────────
	let slug        = $state(post?.slug ?? '');
	let title       = $state(post?.title ?? '');
	let subtitle    = $state(post?.subtitle ?? '');
	let author      = $state(post?.author ?? '');
	let publishedAt = $state(post?.published_at ?? new Date().toISOString().slice(0, 10));
	let teaser      = $state(post?.teaser ?? '');
	let tagsRaw     = $state((post?.tags ?? []).join(', '));
	let coverImageUrl = $state(post?.cover_image_url ?? '');
	let coverPreview  = $state<string | null>(null);
	let published   = $state(post?.published ?? false);

	// ── Status ─────────────────────────────────────────────────────────────────
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveError  = $state('');
	let coverUploading = $state(false);

	// ── Slug auto-generation ───────────────────────────────────────────────────
	let slugTouched = $state(!!post?.slug);

	function titleToSlug(t: string) {
		return t
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-')
			.slice(0, 80);
	}

	$effect(() => {
		if (!slugTouched && title) {
			slug = titleToSlug(title);
		}
	});

	// ── TipTap ─────────────────────────────────────────────────────────────────
	let editorEl: HTMLElement | undefined = $state();
	let editor: Editor | undefined = $state();
	let body: JSONContent = post?.body ?? { type: 'doc', content: [{ type: 'paragraph' }] };

	const subscribe = createSubscriber((update) => {
		if (!editor) return;
		editor.on('transaction', update);
		return () => editor?.off('transaction', update);
	});

	let isActive = $derived.by(() => {
		subscribe();
		return {
			bold:       editor?.isActive('bold') ?? false,
			italic:     editor?.isActive('italic') ?? false,
			h2:         editor?.isActive('heading', { level: 2 }) ?? false,
			h3:         editor?.isActive('heading', { level: 3 }) ?? false,
			bullet:     editor?.isActive('bulletList') ?? false,
			blockquote: editor?.isActive('blockquote') ?? false,
			link:       editor?.isActive('link') ?? false,
		};
	});

	onMount(() => {
		if (!editorEl) return;
		editor = new Editor({
			element: editorEl,
			extensions: [
				StarterKit.configure({ link: false }),
				Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
				Image.configure({ inline: false, allowBase64: false }),
				Placeholder.configure({ placeholder: 'Write the essay...' })
			],
			content: body,
			onUpdate: ({ editor: e }) => { body = e.getJSON(); }
		});
	});

	onDestroy(() => editor?.destroy());

	function toggleBold()       { editor?.chain().focus().toggleBold().run(); }
	function toggleItalic()     { editor?.chain().focus().toggleItalic().run(); }
	function toggleH2()         { editor?.chain().focus().toggleHeading({ level: 2 }).run(); }
	function toggleH3()         { editor?.chain().focus().toggleHeading({ level: 3 }).run(); }
	function toggleBullet()     { editor?.chain().focus().toggleBulletList().run(); }
	function toggleBlockquote() { editor?.chain().focus().toggleBlockquote().run(); }

	function setLink() {
		const url = window.prompt('URL');
		if (url) editor?.chain().focus().setLink({ href: url }).run();
		else editor?.chain().focus().unsetLink().run();
	}

	// ── Cover image upload ─────────────────────────────────────────────────────
	async function uploadCover(file: File) {
		coverUploading = true;
		const fd = new FormData();
		fd.append('file', file);
		const res = await fetch('/api/upload', { method: 'POST', body: fd });
		coverUploading = false;
		if (!res.ok) { alert('Upload failed'); return; }
		const { url } = await res.json();
		coverImageUrl = url;
		coverPreview = url;
	}

	function onCoverInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) uploadCover(file);
	}

	function onCoverDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (file?.type.startsWith('image/')) uploadCover(file);
	}

	// ── Image drag-drop into body ──────────────────────────────────────────────
	async function onBodyDrop(e: DragEvent) {
		const file = e.dataTransfer?.files?.[0];
		if (!file?.type.startsWith('image/')) return;
		e.preventDefault();
		const fd = new FormData();
		fd.append('file', file);
		const res = await fetch('/api/upload', { method: 'POST', body: fd });
		if (!res.ok) return;
		const { url } = await res.json();
		editor?.chain().focus().setImage({ src: url }).run();
	}

	// ── Save ───────────────────────────────────────────────────────────────────
	async function save(andPublish?: boolean) {
		saveStatus = 'saving';
		saveError = '';

		const payload = {
			slug,
			title,
			subtitle: subtitle || null,
			author: author || null,
			published_at: publishedAt,
			teaser,
			cover_image_url: coverImageUrl || null,
			tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
			body,
			published: andPublish !== undefined ? andPublish : published
		};

		const res = isNew
			? await fetch('/api/newsletter-posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			: await fetch(`/api/newsletter-posts/${post!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

		if (res.ok) {
			saveStatus = 'saved';
			if (andPublish !== undefined) published = andPublish;
			if (isNew) {
				const created = await res.json();
				goto(`/admin/newsletter/${created.id}`, { replaceState: true });
			}
		} else {
			const data = await res.json().catch(() => ({}));
			saveStatus = 'error';
			saveError = data.error ?? 'Save failed';
		}
	}

	async function deletePost() {
		if (!post?.id) return;
		if (!confirm('Delete this post? This cannot be undone.')) return;
		await fetch(`/api/newsletter-posts/${post.id}`, { method: 'DELETE' });
		goto('/admin/newsletter');
	}
</script>

<div class="editor-page">
	<div class="top-bar">
		<a href="/admin/newsletter" class="back">← Field Notes</a>
		<div class="top-actions">
			{#if saveStatus === 'saving'}
				<span class="status">saving…</span>
			{:else if saveStatus === 'saved'}
				<span class="status saved">saved</span>
			{:else if saveStatus === 'error'}
				<span class="status error">{saveError}</span>
			{/if}
			<button class="btn-secondary" onclick={() => save()}>Save draft</button>
			{#if published}
				<button class="btn-secondary" onclick={() => save(false)}>Unpublish</button>
			{:else}
				<button class="btn-primary" onclick={() => save(true)}>Publish</button>
			{/if}
			{#if !isNew}
				<button class="btn-danger" onclick={deletePost}>Delete</button>
			{/if}
		</div>
	</div>

	<div class="form">
		<!-- Cover image -->
		<div class="cover-area"
			role="button"
			tabindex="0"
			ondrop={onCoverDrop}
			ondragover={(e) => e.preventDefault()}
		>
			{#if coverPreview || coverImageUrl}
				<img src={coverPreview ?? coverImageUrl} alt="Cover" class="cover-preview" />
				<label class="cover-change">
					{coverUploading ? 'uploading…' : 'Change cover'}
					<input type="file" accept="image/*" oninput={onCoverInput} class="file-input" />
				</label>
			{:else}
				<label class="cover-placeholder">
					<span class="cover-icon">+</span>
					<span>{coverUploading ? 'uploading…' : 'Add cover image'}</span>
					<span class="cover-hint">Click or drag an image here</span>
					<input type="file" accept="image/*" oninput={onCoverInput} class="file-input" />
				</label>
			{/if}
		</div>

		<!-- Meta fields -->
		<div class="meta-grid">
			<label class="field">
				<span class="field-label">Title</span>
				<input type="text" bind:value={title} placeholder="Post title" />
			</label>
			<label class="field">
				<span class="field-label">Slug</span>
				<input type="text" bind:value={slug} placeholder="url-slug" oninput={() => (slugTouched = true)} />
			</label>
			<label class="field">
				<span class="field-label">Subtitle</span>
				<input type="text" bind:value={subtitle} placeholder="Optional subtitle" />
			</label>
			<label class="field">
				<span class="field-label">Author</span>
				<input type="text" bind:value={author} placeholder="e.g. luna şahin" />
			</label>
			<label class="field">
				<span class="field-label">Date</span>
				<input type="date" bind:value={publishedAt} />
			</label>
			<label class="field">
				<span class="field-label">Tags</span>
				<input type="text" bind:value={tagsRaw} placeholder="Tag one, Tag two" />
			</label>
		</div>

		<label class="field field-full">
			<span class="field-label">Teaser</span>
			<textarea bind:value={teaser} rows="3" placeholder="One or two sentences shown on the index page"></textarea>
		</label>

		<!-- Body editor -->
		<div class="body-section">
			<span class="field-label">Body</span>
			<div class="toolbar">
				<button type="button" class="tb" class:active={isActive.bold}       onclick={toggleBold}       title="Bold">B</button>
				<button type="button" class="tb" class:active={isActive.italic}     onclick={toggleItalic}     title="Italic"><em>I</em></button>
				<span class="tb-sep"></span>
				<button type="button" class="tb" class:active={isActive.h2}         onclick={toggleH2}         title="Heading 2">H2</button>
				<button type="button" class="tb" class:active={isActive.h3}         onclick={toggleH3}         title="Heading 3">H3</button>
				<span class="tb-sep"></span>
				<button type="button" class="tb" class:active={isActive.bullet}     onclick={toggleBullet}     title="Bullet list">•</button>
				<button type="button" class="tb" class:active={isActive.blockquote} onclick={toggleBlockquote} title="Blockquote">"</button>
				<span class="tb-sep"></span>
				<button type="button" class="tb" class:active={isActive.link}       onclick={setLink}          title="Link">↗</button>
				<span class="tb-hint">drag images into the text to insert them</span>
			</div>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="body-editor"
				bind:this={editorEl}
				ondrop={onBodyDrop}
				ondragover={(e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); }}
			></div>
		</div>
	</div>
</div>

<style>
	.editor-page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	/* ── Top bar ─────────────────────────────────────────────── */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-8);
		border-bottom: 1px solid var(--border-link);
		position: sticky;
		top: 0;
		background: var(--bg-canvas);
		z-index: 10;
	}

	.back {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-decoration: none;
	}
	.back:hover { color: var(--text-primary); }

	.top-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.status {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.status.saved { color: var(--color-success); }
	.status.error { color: var(--color-danger); }

	.btn-primary {
		padding: var(--space-2) var(--space-4);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		font-size: var(--text-sm);
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-primary:hover { opacity: var(--opacity-hover-btn); }

	.btn-secondary {
		padding: var(--space-2) var(--space-4);
		background: none;
		color: var(--text-primary);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-size: var(--text-sm);
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-secondary:hover { opacity: var(--opacity-hover-btn); }

	.btn-danger {
		padding: var(--space-2) var(--space-4);
		background: none;
		color: var(--color-danger);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-input);
		font-size: var(--text-sm);
		font-family: inherit;
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.15s;
	}
	.btn-danger:hover { opacity: 1; }

	/* ── Form ────────────────────────────────────────────────── */
	.form {
		max-width: 780px;
		margin: 0 auto;
		padding: var(--space-8) var(--space-8) 120px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		box-sizing: border-box;
	}

	/* ── Cover ───────────────────────────────────────────────── */
	.cover-area {
		width: 100%;
		aspect-ratio: 3 / 2;
		position: relative;
		border-radius: var(--radius-card);
		overflow: hidden;
		border: 1.5px dashed var(--border-link);
	}

	.cover-preview {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.cover-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		height: 100%;
		cursor: pointer;
		color: var(--text-muted);
	}

	.cover-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.cover-hint {
		font-size: var(--text-sm);
		opacity: 0.6;
	}

	.cover-change {
		position: absolute;
		bottom: var(--space-3);
		right: var(--space-3);
		padding: var(--space-1) var(--space-3);
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		font-size: var(--text-xs);
		border-radius: var(--radius-input);
		cursor: pointer;
	}

	.file-input {
		display: none;
	}

	/* ── Meta grid ───────────────────────────────────────────── */
	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field-full {
		grid-column: 1 / -1;
	}

	.field-label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	input[type='text'],
	input[type='date'],
	textarea {
		padding: var(--space-3);
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-size: var(--text-base);
		font-family: inherit;
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
		box-sizing: border-box;
	}

	input:focus, textarea:focus {
		border-color: var(--text-muted);
	}

	textarea {
		resize: vertical;
		line-height: var(--leading-relaxed);
	}

	/* ── Body editor ─────────────────────────────────────────── */
	.body-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-link);
		border-bottom: none;
		border-radius: var(--radius-input) var(--radius-input) 0 0;
		background: var(--bg-control);
	}

	.tb {
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-2);
		border: none;
		border-radius: var(--radius-input);
		background: none;
		color: var(--text-muted);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
	}
	.tb:hover { background: var(--bg-control); color: var(--text-primary); }
	.tb.active { background: var(--text-primary); color: var(--bg-canvas); }

	.tb-sep {
		width: 1px;
		height: var(--space-4);
		background: var(--border-link);
		margin: 0 var(--space-1);
	}

	.tb-hint {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		opacity: 0.6;
		padding-right: var(--space-2);
	}

	.body-editor {
		border: 1px solid var(--border-link);
		border-radius: 0 0 var(--radius-input) var(--radius-input);
		min-height: 500px;
		padding: var(--space-6);
		font-size: var(--text-md);
		line-height: var(--leading-relaxed);
		color: var(--text-primary);
	}

	.body-editor :global(.ProseMirror) {
		outline: none;
		min-height: 460px;
	}

	.body-editor :global(.ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		color: var(--text-muted);
		pointer-events: none;
		float: left;
		height: 0;
	}

	.body-editor :global(h2) {
		font-size: var(--text-xl);
		font-weight: 400;
		margin: var(--space-6) 0 var(--space-2);
	}

	.body-editor :global(h3) {
		font-size: var(--text-lg);
		font-weight: 400;
		margin: var(--space-5) 0 var(--space-2);
	}

	.body-editor :global(blockquote) {
		padding: 0;
		border: none;
		color: var(--text-secondary);
		font-style: italic;
		margin: var(--space-4) 0;
	}

	.body-editor :global(img) {
		max-width: 100%;
		border-radius: var(--radius-card);
		margin: var(--space-4) 0 var(--space-1);
	}

	.body-editor :global(img + p) {
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-align: center;
		margin: 0 0 var(--space-4);
	}
</style>
