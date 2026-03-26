<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createSubscriber } from 'svelte/reactivity';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import type { JSONContent } from '@tiptap/core';

	interface Props {
		content?: JSONContent;
		onUpdate?: (json: JSONContent) => void;
		editable?: boolean;
		showToolbar?: boolean;
	}

	let { content, onUpdate, editable = true, showToolbar = true }: Props = $props();

	let element: HTMLElement | undefined = $state();
	let editor: Editor | undefined = $state();

	// Bridge TipTap transactions into Svelte 5 reactivity
	const subscribe = createSubscriber((update) => {
		if (!editor) return;
		editor.on('transaction', update);
		return () => editor?.off('transaction', update);
	});

	// Reactive toolbar state
	let isActive = $derived.by(() => {
		subscribe();
		return {
			bold: editor?.isActive('bold') ?? false,
			italic: editor?.isActive('italic') ?? false,
			heading1: editor?.isActive('heading', { level: 1 }) ?? false,
			heading2: editor?.isActive('heading', { level: 2 }) ?? false,
			bulletList: editor?.isActive('bulletList') ?? false,
			orderedList: editor?.isActive('orderedList') ?? false,
			blockquote: editor?.isActive('blockquote') ?? false,
			link: editor?.isActive('link') ?? false,
		};
	});

	onMount(() => {
		if (!element) return;

		editor = new Editor({
			element,
			extensions: [
				StarterKit,
				Link.configure({
					openOnClick: false,
					HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }
				}),
				Image.configure({ inline: false })
			],
			content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
			editable,
			onUpdate: ({ editor: e }) => {
				onUpdate?.(e.getJSON());
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	function toggleBold() { editor?.chain().focus().toggleBold().run(); }
	function toggleItalic() { editor?.chain().focus().toggleItalic().run(); }
	function toggleHeading(level: 1 | 2) { editor?.chain().focus().toggleHeading({ level }).run(); }
	function toggleBulletList() { editor?.chain().focus().toggleBulletList().run(); }
	function toggleOrderedList() { editor?.chain().focus().toggleOrderedList().run(); }
	function toggleBlockquote() { editor?.chain().focus().toggleBlockquote().run(); }

	function setLink() {
		const url = window.prompt('URL');
		if (url) {
			editor?.chain().focus().setLink({ href: url }).run();
		} else {
			editor?.chain().focus().unsetLink().run();
		}
	}
</script>

{#if editor && showToolbar}
	<div class="toolbar">
		<button type="button" class="tb" class:active={isActive.bold} onclick={toggleBold} title="Bold">B</button>
		<button type="button" class="tb" class:active={isActive.italic} onclick={toggleItalic} title="Italic"><em>I</em></button>
		<span class="tb-sep"></span>
		<button type="button" class="tb" class:active={isActive.heading1} onclick={() => toggleHeading(1)} title="Heading 1">H1</button>
		<button type="button" class="tb" class:active={isActive.heading2} onclick={() => toggleHeading(2)} title="Heading 2">H2</button>
		<span class="tb-sep"></span>
		<button type="button" class="tb" class:active={isActive.bulletList} onclick={toggleBulletList} title="Bullet list">&bull;</button>
		<button type="button" class="tb" class:active={isActive.orderedList} onclick={toggleOrderedList} title="Ordered list">1.</button>
		<button type="button" class="tb" class:active={isActive.blockquote} onclick={toggleBlockquote} title="Quote">&ldquo;</button>
		<span class="tb-sep"></span>
		<button type="button" class="tb" class:active={isActive.link} onclick={setLink} title="Link">&#128279;</button>
	</div>
{/if}

<div class="editor" class:no-toolbar={!showToolbar} bind:this={element}></div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 8px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-bottom: none;
		border-radius: 6px 6px 0 0;
		background: var(--bg-control, rgba(0, 0, 0, 0.02));
	}

	.tb {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		padding: 4px 8px;
		border: none;
		border-radius: 3px;
		background: none;
		color: var(--text-muted, #666);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
	}

	.tb:hover { background: var(--bg-control, rgba(0, 0, 0, 0.06)); color: var(--text-primary); }
	.tb.active { background: var(--text-primary, #1a1a1a); color: var(--bg-canvas, #f5f3f0); }

	.tb-sep {
		width: 1px;
		height: 16px;
		background: var(--border-link, rgba(0, 0, 0, 0.1));
		margin: 0 4px;
	}

	.editor {
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 0 0 6px 6px;
		padding: 16px 20px;
		min-height: 200px;
	}

	.editor.no-toolbar {
		border: none;
		border-radius: 0;
		padding: 0;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-primary, #1a1a1a);
		background: transparent;
	}

	.editor :global(.tiptap) {
		outline: none;
		min-height: 200px;
	}

	.editor :global(.tiptap p) {
		margin: 0 0 0.75em;
	}

	.editor :global(.tiptap h1) {
		font-size: 1.5rem;
		font-weight: 500;
		margin: 1.2em 0 0.5em;
	}

	.editor :global(.tiptap h2) {
		font-size: 1.2rem;
		font-weight: 500;
		margin: 1em 0 0.4em;
	}

	.editor :global(.tiptap blockquote) {
		border-left: 2px solid var(--text-muted, #ccc);
		padding-left: 16px;
		margin: 0.75em 0;
		color: var(--text-muted, #666);
	}

	.editor :global(.tiptap ul),
	.editor :global(.tiptap ol) {
		padding-left: 24px;
		margin: 0.5em 0;
	}

	.editor :global(.tiptap a) {
		color: var(--text-link, #555);
		text-decoration: underline;
	}

	.editor :global(.tiptap img) {
		max-width: 100%;
		border-radius: 4px;
		margin: 0.75em 0;
	}

	.editor :global(.tiptap p.is-editor-empty:first-child::before) {
		content: 'Start writing...';
		color: var(--text-muted, #999);
		pointer-events: none;
		float: left;
		height: 0;
	}
</style>
