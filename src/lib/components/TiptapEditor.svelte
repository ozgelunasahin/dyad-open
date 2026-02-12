<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, type JSONContent } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Image from '@tiptap/extension-image';
	import type { EditorView } from '@tiptap/pm/view';
	import { Wikilink } from '$lib/tiptap/wikilink';
	import { canvasStore } from '$lib/stores/canvas.svelte';

	interface Props {
		content: JSONContent;
		onUpdate?: (json: JSONContent) => void;
		onWikilinkClick?: (target: string) => void;
		onWikilinkDelete?: (target: string) => void;
		isLinkBroken?: (target: string) => boolean;
		editable?: boolean;
	}

	let {
		content,
		onUpdate,
		onWikilinkClick,
		onWikilinkDelete,
		isLinkBroken,
		editable = true
	}: Props = $props();

	let element: HTMLDivElement;
	let editor: Editor | null = $state(null);

	// Guard to prevent onUpdate firing during programmatic content sync
	let isExternalUpdate = false;

	onMount(() => {
		// Ensure content is valid JSONContent, fallback to empty doc if string or invalid
		const safeContent =
			content && typeof content === 'object' && content.type === 'doc'
				? content
				: { type: 'doc', content: [{ type: 'paragraph' }] };

		try {
			editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					heading: {
						levels: [1, 2, 3]
					},
					bulletList: {},
					orderedList: {},
					blockquote: {},
					codeBlock: {},
					code: {},
					bold: {},
					italic: {}
				}),
				Wikilink.configure({
					onWikilinkClick,
					onWikilinkDelete,
					isLinkBroken
				}),
				Image
			],
			content: safeContent,
			editable,
			editorProps: {
				attributes: {
					// Zen writing: no browser interference
					spellcheck: 'false',
					autocorrect: 'off',
					autocapitalize: 'off',
					autocomplete: 'off',
					'data-gramm': 'false',
					'data-gramm_editor': 'false',
					'data-enable-grammarly': 'false',
					class: 'tiptap-content'
				},
				handleClick: (view, pos, event) => {
					const target = event.target as HTMLElement;
					if (target.classList.contains('wikilink') && onWikilinkClick) {
						const wikilinkTarget = target.dataset.target;
						if (wikilinkTarget) {
							event.preventDefault();
							event.stopPropagation();
							onWikilinkClick(wikilinkTarget);
							return true;
						}
					}
					return false;
				},
				handlePaste(view: EditorView, event: ClipboardEvent): boolean {
					if (!view.editable) return false;

					const files = event.clipboardData?.files;
					if (!files?.length) return false;

					const imageFile = Array.from(files).find((f) =>
						['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)
					);
					if (!imageFile) return false;

					event.preventDefault();

					const formData = new FormData();
					formData.append('file', imageFile);

					fetch('/api/upload', { method: 'POST', body: formData })
						.then((r) => r.json())
						.then((data) => {
							if (data.url) {
								const { state, dispatch } = view;
								const node = state.schema.nodes.image.create({ src: data.url });
								dispatch(state.tr.replaceSelectionWith(node));
							} else if (data.error) {
								console.error('Upload failed:', data.error);
							}
						})
						.catch(console.error);

					return true;
				}
			},
			onUpdate: ({ editor }) => {
				// Don't fire onUpdate during programmatic content sync
				if (!isExternalUpdate) {
					onUpdate?.(editor.getJSON());
				}
			}
		});
		} catch (err) {
			console.error('TiptapEditor initialization failed:', err);
		}
	});

	onDestroy(() => {
		editor?.destroy();
	});

	// Track previous editable state to detect transitions
	let wasEditable = false;

	$effect(() => {
		if (editor) {
			editor.setEditable(editable);

			// Auto-focus when becoming editable, blur when leaving
			if (editable && !wasEditable) {
				// Check if store requests cursor at end (e.g., after creating orphan card)
				if (canvasStore.editFocusPosition === 'end') {
					editor.commands.focus('end');
				} else {
					// Default: focus without position to preserve any existing selection
					editor.commands.focus();
				}
			} else if (!editable && wasEditable) {
				editor.commands.blur();
			}
			wasEditable = editable;
		}
	});

	// Sync content prop changes to editor (e.g., when switching edit modes or external updates)
	// Only sync when editor is NOT focused to avoid overwriting user's active edits
	$effect(() => {
		if (editor && content) {
			// Skip if user is actively editing
			if (editor.isFocused) return;

			// Compare content to avoid unnecessary updates
			const currentJSON = JSON.stringify(editor.getJSON());
			const newJSON = JSON.stringify(content);
			if (currentJSON !== newJSON) {
				isExternalUpdate = true;
				editor.commands.setContent(content);
				isExternalUpdate = false;
			}
		}
	});

	export function getEditor(): Editor | null {
		return editor;
	}

	export function focus(): void {
		editor?.commands.focus('end');
	}

	export function getJSON(): JSONContent {
		return editor?.getJSON() ?? { type: 'doc', content: [] };
	}
</script>

<div bind:this={element} class="tiptap-editor"></div>

<style>
	.tiptap-editor {
		width: 100%;
		height: 100%;
	}

	/* Content styling - matches existing NoteCard styles */
	.tiptap-editor :global(.tiptap-content) {
		outline: none;
		min-height: 100%;
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.tiptap-editor :global(.tiptap-content:focus) {
		outline: none;
	}

	/* Headings */
	.tiptap-editor :global(h1) {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px 0;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.tiptap-editor :global(h2) {
		font-size: 15px;
		font-weight: 600;
		margin: 20px 0 10px 0;
		color: var(--text-primary);
	}

	.tiptap-editor :global(h3) {
		font-size: 14px;
		font-weight: 600;
		margin: 16px 0 8px 0;
		color: var(--text-secondary);
	}

	/* Paragraphs */
	.tiptap-editor :global(p) {
		margin: 0 0 14px 0;
		text-align: justify;
		hyphens: auto;
	}

	/* Lists */
	.tiptap-editor :global(ul),
	.tiptap-editor :global(ol) {
		margin: 0 0 14px 0;
		padding-left: 18px;
	}

	.tiptap-editor :global(li) {
		margin-bottom: 6px;
	}

	/* Code */
	.tiptap-editor :global(code) {
		background: var(--bg-code);
		padding: 2px 5px;
		border-radius: 3px;
		font-size: 12px;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
		color: var(--text-muted);
	}

	.tiptap-editor :global(pre) {
		background: var(--bg-code-block);
		padding: 12px;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0 0 14px 0;
		border-left: 2px solid var(--border-code);
	}

	.tiptap-editor :global(pre code) {
		background: none;
		padding: 0;
	}

	/* Formatting */
	.tiptap-editor :global(strong) {
		font-weight: 600;
		color: var(--text-primary);
	}

	.tiptap-editor :global(em) {
		font-style: italic;
	}

	/* Blockquotes */
	.tiptap-editor :global(blockquote) {
		border-left: 3px solid var(--border-link);
		margin: 0 0 14px 0;
		padding-left: 16px;
		color: var(--text-muted);
		font-style: italic;
	}

	/* Wikilinks */
	.tiptap-editor :global(.wikilink) {
		background: none;
		border: none;
		outline: none;
		color: var(--text-link);
		text-decoration: none;
		border-bottom: 1px solid var(--border-link);
		cursor: pointer;
		padding: 0;
		font: inherit;
		transition: all 0.15s ease;
	}

	.tiptap-editor :global(.wikilink:hover) {
		color: var(--text-link-hover);
		border-bottom-color: var(--border-link-hover);
	}

	.tiptap-editor :global(.wikilink.broken) {
		color: var(--text-muted);
		border-bottom-color: var(--border-code);
		opacity: 0.5;
	}

	.tiptap-editor :global(.wikilink.broken:hover) {
		color: var(--text-muted);
		border-bottom-color: var(--border-code);
	}

	/* Link focus mode (Tab navigation) */
	.tiptap-editor :global(.wikilink.link-focused) {
		background: color-mix(in srgb, var(--text-link) 15%, transparent);
		border-radius: 2px;
		padding: 1px 3px;
		margin: -1px -3px;
		border-bottom-color: var(--text-link);
	}

	/* Hide underline when connection line is active */
	.tiptap-editor :global(.wikilink.has-connection) {
		border-bottom-color: transparent;
	}

	/* Images - centered and shrink to fit */
	.tiptap-editor :global(img) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 1em auto;
		border-radius: 4px;
	}
</style>
