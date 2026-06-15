<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createSubscriber } from 'svelte/reactivity';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import Placeholder from '@tiptap/extension-placeholder';
	import type { JSONContent } from '@tiptap/core';
	import { renderTiptapToEmailHtml, buildPreviewDocument } from '$lib/utils/tiptap-email-html.js';

	interface Props {
		content?: JSONContent;
		onUpdate?: (json: JSONContent) => void;
		disabled?: boolean;
	}

	let { content, onUpdate, disabled = false }: Props = $props();

	let editorEl: HTMLElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();
	let editor: Editor | undefined = $state();
	let uploading = $state(false);

	const subscribe = createSubscriber((update) => {
		if (!editor) return;
		editor.on('transaction', update);
		return () => editor?.off('transaction', update);
	});

	let isActive = $derived.by(() => {
		subscribe();
		return {
			bold: editor?.isActive('bold') ?? false,
			italic: editor?.isActive('italic') ?? false,
			heading1: editor?.isActive('heading', { level: 1 }) ?? false,
			heading2: editor?.isActive('heading', { level: 2 }) ?? false,
			bulletList: editor?.isActive('bulletList') ?? false,
			blockquote: editor?.isActive('blockquote') ?? false,
			link: editor?.isActive('link') ?? false
		};
	});

	let currentJson = $state<JSONContent>(
		content ?? { type: 'doc', content: [{ type: 'paragraph' }] }
	);

	let previewHtml = $derived(
		buildPreviewDocument({ bodyHtml: renderTiptapToEmailHtml(currentJson) })
	);

	onMount(() => {
		if (!editorEl) return;
		editor = new Editor({
			element: editorEl,
			extensions: [
				StarterKit.configure({ link: false }),
				Link.configure({ openOnClick: false }),
				Image.configure({ inline: false }),
				Placeholder.configure({ placeholder: 'Write your invitation…' })
			],
			content: currentJson,
			editable: !disabled,
			onUpdate: ({ editor: e }) => {
				currentJson = e.getJSON();
				onUpdate?.(currentJson);
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	function toggleBold() {
		editor?.chain().focus().toggleBold().run();
	}
	function toggleItalic() {
		editor?.chain().focus().toggleItalic().run();
	}
	function toggleHeading(level: 1 | 2) {
		editor?.chain().focus().toggleHeading({ level }).run();
	}
	function toggleBulletList() {
		editor?.chain().focus().toggleBulletList().run();
	}
	function toggleBlockquote() {
		editor?.chain().focus().toggleBlockquote().run();
	}
	function setLink() {
		const url = window.prompt('URL');
		if (url) editor?.chain().focus().setLink({ href: url }).run();
		else editor?.chain().focus().unsetLink().run();
	}

	async function handleImageFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			const body = await res.json();
			if (res.ok && body.url) {
				editor?.chain().focus().setImage({ src: body.url }).run();
			}
		} finally {
			uploading = false;
		}
	}
</script>

<div class="composer">
	<div class="editor-pane">
		<div class="toolbar">
			<button
				type="button"
				class="tb"
				class:active={isActive.bold}
				onclick={toggleBold}
				{disabled}
				title="Bold">B</button
			>
			<button
				type="button"
				class="tb italic-btn"
				class:active={isActive.italic}
				onclick={toggleItalic}
				{disabled}
				title="Italic">I</button
			>
			<span class="sep"></span>
			<button
				type="button"
				class="tb"
				class:active={isActive.heading1}
				onclick={() => toggleHeading(1)}
				{disabled}
				title="Heading 1">H1</button
			>
			<button
				type="button"
				class="tb"
				class:active={isActive.heading2}
				onclick={() => toggleHeading(2)}
				{disabled}
				title="Heading 2">H2</button
			>
			<span class="sep"></span>
			<button
				type="button"
				class="tb"
				class:active={isActive.bulletList}
				onclick={toggleBulletList}
				{disabled}
				title="Bullet list">•</button
			>
			<button
				type="button"
				class="tb"
				class:active={isActive.blockquote}
				onclick={toggleBlockquote}
				{disabled}
				title="Quote">&ldquo;</button
			>
			<span class="sep"></span>
			<button
				type="button"
				class="tb"
				class:active={isActive.link}
				onclick={setLink}
				{disabled}
				title="Link">↗</button
			>
			<button
				type="button"
				class="tb"
				onclick={() => fileInput?.click()}
				disabled={disabled || uploading}
				title="Insert image">{uploading ? '…' : '⌅'}</button
			>
			<input
				type="file"
				accept="image/*"
				bind:this={fileInput}
				onchange={handleImageFile}
				style="display:none"
			/>
		</div>
		<div class="editor-wrap" bind:this={editorEl}></div>
	</div>

	<div class="preview-pane">
		<span class="preview-label">Preview</span>
		<iframe
			class="preview-frame"
			srcdoc={previewHtml}
			title="Email preview"
			sandbox="allow-same-origin"
		></iframe>
	</div>
</div>

<style>
	.composer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
		align-items: start;
	}

	.editor-pane {
		display: flex;
		flex-direction: column;
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
		font-family: inherit;
	}
	.italic-btn {
		font-style: italic;
	}
	.tb:hover {
		background: var(--bg-canvas);
		color: var(--text-primary);
	}
	.tb.active {
		background: var(--text-primary);
		color: var(--bg-canvas);
	}
	.tb:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.sep {
		width: 1px;
		height: 16px;
		background: var(--border-link);
		margin: 0 var(--space-1);
		flex-shrink: 0;
	}

	.editor-wrap {
		border: 1px solid var(--border-link);
		border-radius: 0 0 var(--radius-input) var(--radius-input);
		padding: var(--space-4);
		min-height: 220px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: var(--text-base);
		line-height: 1.7;
		background: var(--bg-canvas);
	}

	.editor-wrap :global(.tiptap) {
		outline: none;
		min-height: 180px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
	}

	.editor-wrap :global(.tiptap p) {
		margin: 0 0 0.75em;
	}
	.editor-wrap :global(.tiptap h1) {
		font-size: 1.5em;
		font-weight: 500;
		margin: 1.2em 0 0.5em;
		line-height: 1.3;
	}
	.editor-wrap :global(.tiptap h2) {
		font-size: 1.2em;
		font-weight: 500;
		margin: 1em 0 0.4em;
		line-height: 1.3;
	}
	.editor-wrap :global(.tiptap ul),
	.editor-wrap :global(.tiptap ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}
	.editor-wrap :global(.tiptap blockquote) {
		border-left: 3px solid var(--text-muted);
		padding-left: var(--space-4);
		margin: 0.75em 0;
		font-style: italic;
		color: var(--text-muted);
	}
	.editor-wrap :global(.tiptap img) {
		max-width: 100%;
		border-radius: var(--radius-input);
		margin: 0.75em 0;
		display: block;
	}
	.editor-wrap :global(.tiptap a) {
		color: var(--text-link);
		text-decoration: underline;
	}
	.editor-wrap :global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		color: var(--text-muted);
		pointer-events: none;
		float: left;
		height: 0;
		font-family: 'SangBleu Sunrise', Georgia, serif;
	}

	.preview-pane {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.preview-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.preview-frame {
		width: 100%;
		height: 460px;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: #fff;
	}
</style>
