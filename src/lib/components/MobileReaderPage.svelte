<script lang="ts">
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import type { Note } from '$lib/types';

	interface Props {
		note: Note;
		onWikilinkClick?: (target: string) => void;
		isLinkBroken?: (target: string) => boolean;
	}

	let { note, onWikilinkClick, isLinkBroken }: Props = $props();
</script>

<article class="mobile-reader-page">
	<h1 class="note-title">{note.title}</h1>
	<div class="note-body">
		<TiptapEditor
			content={note.content}
			editable={false}
			{onWikilinkClick}
			{isLinkBroken}
		/>
	</div>
</article>

<style>
	.mobile-reader-page {
		padding: 20px;
		padding-bottom: 80px;
	}

	.note-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 24px;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 20px 0;
		line-height: 1.3;
		letter-spacing: -0.01em;
	}

	/* Override TipTap's default typography for mobile reading */
	.note-body :global(.tiptap-content) {
		font-size: 16px !important;
		line-height: 1.75 !important;
		color: var(--text-secondary) !important;
	}

	.note-body :global(h1) {
		font-size: 22px !important;
		margin: 0 0 16px 0 !important;
	}

	.note-body :global(h2) {
		font-size: 18px !important;
		margin: 24px 0 12px 0 !important;
	}

	.note-body :global(h3) {
		font-size: 16px !important;
		margin: 20px 0 10px 0 !important;
	}

	.note-body :global(p) {
		margin: 0 0 16px 0 !important;
		text-align: left !important;
		hyphens: none !important;
	}

	.note-body :global(img) {
		border-radius: 8px !important;
	}

	.note-body :global(blockquote) {
		margin: 0 0 16px 0 !important;
		padding-left: 16px !important;
	}

	.note-body :global(.wikilink) {
		font-size: 16px;
	}
</style>
