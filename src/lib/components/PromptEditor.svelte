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

	.editor {
		border: 1px solid var(--border-link);
		border-radius: 0 0 var(--radius-input) var(--radius-input);
		padding: var(--space-4) var(--space-5);
		min-height: 200px;
	}

	.editor.no-toolbar {
		border: none;
		border-radius: 0;
		padding: 0;
		min-height: 300px;
	}

	.editor :global(.tiptap) {
		outline: none;
		min-height: 200px;
	}

	.editor :global(.tiptap p) {
		margin: 0 0 0.75em;
	}

	.editor :global(.tiptap h1) {
		font-size: var(--text-2xl);
		font-weight: 500;
		margin: 1.2em 0 0.5em;
	}

	.editor :global(.tiptap h2) {
		font-size: var(--text-xl);
		font-weight: 500;
		margin: 1em 0 0.4em;
	}

	.editor :global(.tiptap blockquote) {
		border-left: 2px solid var(--text-muted);
		padding-left: var(--space-4);
		margin: 0.75em 0;
		color: var(--text-muted);
	}

	.editor :global(.tiptap ul),
	.editor :global(.tiptap ol) {
		padding-left: var(--space-6);
		margin: 0.5em 0;
	}

	.editor :global(.tiptap a) {
		color: var(--text-link);
		text-decoration: underline;
	}

	.editor :global(.tiptap img) {
		max-width: 100%;
		border-radius: var(--radius-input);
		margin: 0.75em 0;
	}

	.editor :global(.tiptap p.is-editor-empty:first-child::before) {
		content: 'Start writing your conversation...';
		color: var(--text-muted);
		pointer-events: none;
		float: left;
		height: 0;
	}
</style>
