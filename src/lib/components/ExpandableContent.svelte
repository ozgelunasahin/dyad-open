<script lang="ts">
	import type { Vault } from '$lib/types';

	interface Props {
		content: any;
		vault: Vault;
		depth?: number;
	}

	let { content, vault, depth = 0 }: Props = $props();
	let expandedTargets = $state(new Set<string>());

	function toggle(target: string) {
		if (!vault.notes[target]) return;
		const next = new Set(expandedTargets);
		if (next.has(target)) next.delete(target);
		else next.add(target);
		expandedTargets = next;
	}

	function isBroken(target: string): boolean {
		return !vault.notes[target];
	}

	/**
	 * Split a paragraph's inline content at expanded wikilinks.
	 * Returns segments: 'inline' (rendered as <p>) or 'expanded' (rendered as toggle body).
	 * When a wikilink is expanded, the paragraph breaks:
	 *   [text before + wikilink] → [expanded content] → [remaining text]
	 */
	function splitParagraph(block: any): Array<{ type: 'inline'; nodes: any[] } | { type: 'expanded'; target: string }> {
		if (!block.content || block.content.length === 0) return [];

		const segments: Array<{ type: 'inline'; nodes: any[] } | { type: 'expanded'; target: string }> = [];
		let currentNodes: any[] = [];

		for (const node of block.content) {
			currentNodes.push(node);

			if (
				node.type === 'wikilink' &&
				expandedTargets.has(node.attrs?.target) &&
				vault.notes[node.attrs?.target]
			) {
				// Close the inline segment (includes the wikilink)
				segments.push({ type: 'inline', nodes: [...currentNodes] });
				currentNodes = [];
				// Insert expanded content
				segments.push({ type: 'expanded', target: node.attrs.target });
			}
		}

		// Remaining inline content after last expanded wikilink
		if (currentNodes.length > 0) {
			segments.push({ type: 'inline', nodes: currentNodes });
		}

		return segments;
	}

	function hasExpandedWikilink(block: any): boolean {
		if (!block.content) return false;
		return block.content.some(
			(n: any) => n.type === 'wikilink' && expandedTargets.has(n.attrs?.target) && vault.notes[n.attrs?.target]
		);
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function renderMarkedText(node: any): string {
		let text = escapeHtml(node.text || '');
		if (!node.marks) return text;
		for (const mark of node.marks) {
			switch (mark.type) {
				case 'bold':
					text = `<strong>${text}</strong>`;
					break;
				case 'italic':
					text = `<em>${text}</em>`;
					break;
				case 'code':
					text = `<code>${text}</code>`;
					break;
				case 'strike':
					text = `<s>${text}</s>`;
					break;
				case 'underline':
					text = `<u>${text}</u>`;
					break;
				case 'link':
					if (mark.attrs?.href) {
						if (/^(javascript|data|vbscript):/i.test(mark.attrs.href)) break;
						const href = escapeHtml(mark.attrs.href);
						text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
					}
					break;
			}
		}
		return text;
	}

	/** Check if an inline nodes array is only whitespace or empty */
	function isEmptyInline(nodes: any[]): boolean {
		return nodes.every((n) => n.type === 'text' && !n.text?.trim());
	}
</script>

{#snippet inlineNodes(nodes: any[])}
	{#each nodes as node}
		{#if node.type === 'text'}
			{@html renderMarkedText(node)}
		{:else if node.type === 'wikilink'}
			<button
				class="toggle-link"
				class:expanded={expandedTargets.has(node.attrs.target)}
				class:broken={isBroken(node.attrs.target)}
				onclick={() => toggle(node.attrs.target)}
			>
				{node.attrs.display || node.attrs.target}
			</button>
		{:else if node.type === 'hardBreak'}
			<br />
		{/if}
	{/each}
{/snippet}

{#if content?.content}
	<div class="expandable-content" class:nested={depth > 0}>
		{#each content.content as block, blockIdx (blockIdx)}
			{#if block.type === 'paragraph'}
				{#if !block.content || block.content.length === 0}
					<p class="empty-para"></p>
				{:else if hasExpandedWikilink(block)}
					<!-- Paragraph with expanded wikilink(s) — split at expansion points -->
					{#each splitParagraph(block) as segment}
						{#if segment.type === 'inline' && !isEmptyInline(segment.nodes)}
							<p>{@render inlineNodes(segment.nodes)}</p>
						{:else if segment.type === 'expanded'}
							<div class="toggle-body">
								<svelte:self content={vault.notes[segment.target].content} {vault} depth={depth + 1} />
							</div>
						{/if}
					{/each}
				{:else}
					<!-- Normal paragraph — no expanded wikilinks -->
					<p>{@render inlineNodes(block.content)}</p>
				{/if}

			{:else if block.type === 'heading'}
				{#if block.attrs?.level === 1}
					<h1>
						{#each block.content ?? [] as node}
							{#if node.type === 'text'}{@html renderMarkedText(node)}{/if}
						{/each}
					</h1>
				{:else if block.attrs?.level === 2}
					<h2>
						{#each block.content ?? [] as node}
							{#if node.type === 'text'}{@html renderMarkedText(node)}{/if}
						{/each}
					</h2>
				{:else if block.attrs?.level === 3}
					<h3>
						{#each block.content ?? [] as node}
							{#if node.type === 'text'}{@html renderMarkedText(node)}{/if}
						{/each}
					</h3>
				{:else}
					<h4>
						{#each block.content ?? [] as node}
							{#if node.type === 'text'}{@html renderMarkedText(node)}{/if}
						{/each}
					</h4>
				{/if}

			{:else if block.type === 'image'}
				{#if block.attrs?.src}
					<img src={block.attrs.src} alt={block.attrs.alt || ''} />
				{/if}

			{:else if block.type === 'blockquote'}
				<blockquote>
					<svelte:self content={block} {vault} {depth} />
				</blockquote>

			{:else if block.type === 'bulletList'}
				<ul>
					{#each block.content ?? [] as item}
						<li>
							<svelte:self content={item} {vault} {depth} />
						</li>
					{/each}
				</ul>

			{:else if block.type === 'orderedList'}
				<ol>
					{#each block.content ?? [] as item}
						<li>
							<svelte:self content={item} {vault} {depth} />
						</li>
					{/each}
				</ol>

			{:else if block.type === 'codeBlock'}
				<pre><code>{block.content?.[0]?.text ?? ''}</code></pre>

			{:else if block.type === 'horizontalRule'}
				<hr />
			{/if}
		{/each}
	</div>
{/if}

<style>
	.expandable-content {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 17px;
		line-height: 1.7;
		color: var(--text-secondary, #4a4a4a);
	}

	.expandable-content.nested {
		font-size: inherit;
		line-height: inherit;
	}

	p {
		margin: 0 0 1.4em 0;
		text-align: left;
	}

	.empty-para {
		margin: 0 0 0.5em 0;
	}

	h1, h2, h3, h4 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		color: var(--text-primary, #1a1a1a);
		font-weight: 500;
		line-height: 1.3;
	}

	h1 { font-size: 22px; margin: 0 0 16px 0; }
	h2 { font-size: 18px; margin: 24px 0 12px 0; }
	h3 { font-size: 16px; margin: 20px 0 10px 0; }
	h4 { font-size: 15px; margin: 18px 0 8px 0; }

	img {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		display: block;
		margin: 16px 0;
	}

	blockquote {
		margin: 0 0 16px 0;
		padding-left: 16px;
		border-left: 2px solid var(--border-link, rgba(0, 0, 0, 0.1));
		color: var(--text-muted, #8b7355);
	}

	ul, ol {
		margin: 0 0 16px 0;
		padding-left: 24px;
	}

	li {
		margin: 0 0 4px 0;
	}

	pre {
		background: var(--bg-control, rgba(0, 0, 0, 0.04));
		border-radius: 6px;
		padding: 12px;
		overflow-x: auto;
		margin: 0 0 16px 0;
	}

	pre code {
		font-family: monospace;
		font-size: 14px;
	}

	hr {
		border: none;
		border-top: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		margin: 24px 0;
	}

	/* Wikilink — italic + underlined, no icon */
	.toggle-link {
		display: inline;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-style: italic;
		color: var(--text-secondary, #4a4a4a);
		text-decoration: underline;
		text-decoration-color: var(--border-link, rgba(0, 0, 0, 0.25));
		text-underline-offset: 3px;
		cursor: pointer;
		transition: color 0.15s, text-decoration-color 0.15s;
	}

	.toggle-link:hover {
		color: var(--text-primary, #1a1a1a);
		text-decoration-color: var(--text-primary, #1a1a1a);
	}

	.toggle-link.expanded {
		color: var(--text-primary, #1a1a1a);
		text-decoration-color: var(--text-primary, #1a1a1a);
	}

	.toggle-link.broken {
		color: var(--text-muted, #8b7355);
		opacity: 0.4;
		cursor: default;
		text-decoration-style: dashed;
	}

	/* Expanded content — indented, appears right after the wikilink */
	.toggle-body {
		padding-left: 20px;
		margin: 0.5em 0 1.4em 0;
		border-left: 1.5px solid var(--border-link, rgba(0, 0, 0, 0.1));
		animation: toggleOpen 200ms ease-out;
	}

	@keyframes toggleOpen {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Links inside content */
	.expandable-content :global(a) {
		color: var(--text-link, #5b4a3f);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
