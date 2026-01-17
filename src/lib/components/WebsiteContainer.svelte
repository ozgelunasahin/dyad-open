<script lang="ts">
	import { parseMarkdown } from '$lib/utils/markdown';

	interface Props {
		/** Canvas title */
		title: string;
		/** Author username */
		author: string;
		/** Optional introduction text with wikilinks (markdown) */
		introduction?: string;
		/** Optional header graphic URL */
		graphicUrl?: string;
		/** Whether to show the intro panel */
		showIntro?: boolean;
		/** Callback when a page link (cross-canvas) is clicked */
		onPageLink?: (path: string) => void;
		/** Child content (the canvas) */
		children: import('svelte').Snippet;
	}

	let {
		title,
		author,
		introduction = '',
		graphicUrl,
		showIntro = true,
		onPageLink,
		children
	}: Props = $props();

	let introExpanded = $state(true);

	// Parse introduction markdown
	let introHtml = $derived(introduction ? parseMarkdown(introduction) : '');

	function handleIntroClick(event: MouseEvent) {
		const target = event.target as HTMLElement;

		// Handle wikilinks in the introduction
		if (target.classList.contains('wikilink')) {
			event.preventDefault();
			const linkTarget = target.dataset.target;
			if (!linkTarget) return;

			// Check if it's a page link (starts with /)
			if (linkTarget.startsWith('/')) {
				// Cross-canvas navigation
				onPageLink?.(linkTarget);
			} else {
				// In-canvas link - dispatch event for canvas to handle
				window.dispatchEvent(new CustomEvent('intro-wikilink-click', {
					detail: { target: linkTarget }
				}));
			}
		}
	}

	function toggleIntro() {
		introExpanded = !introExpanded;
	}
</script>

<div class="website-container">
	<!-- Introduction panel -->
	{#if showIntro}
		<aside class="intro-panel" class:collapsed={!introExpanded}>
			<button class="intro-toggle" onclick={toggleIntro} aria-label={introExpanded ? 'Collapse introduction' : 'Expand introduction'}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					{#if introExpanded}
						<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					{:else}
						<path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					{/if}
				</svg>
			</button>

			{#if introExpanded}
				<div class="intro-content">
					{#if graphicUrl}
						<div class="intro-graphic">
							<img src={graphicUrl} alt="" />
						</div>
					{:else}
						<!-- Placeholder graphic -->
						<div class="intro-graphic placeholder">
							<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
								<rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
								<circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2"/>
							</svg>
						</div>
					{/if}

					<div class="intro-text">
						<h1 class="intro-title">{title}</h1>
						<p class="intro-author">by <a href="/{author}">@{author}</a></p>

						{#if introHtml}
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<div class="intro-body" onclick={handleIntroClick}>
								{@html introHtml}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</aside>
	{/if}

	<!-- Main canvas area -->
	<main class="canvas-area">
		{@render children()}
	</main>
</div>

<style>
	.website-container {
		display: flex;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}

	/* Introduction panel */
	.intro-panel {
		position: relative;
		width: 360px;
		min-width: 360px;
		height: 100%;
		background: var(--bg-canvas);
		border-right: 1px solid var(--border-link);
		display: flex;
		flex-direction: column;
		transition: width 0.3s ease, min-width 0.3s ease;
		z-index: 10;
	}

	.intro-panel.collapsed {
		width: 48px;
		min-width: 48px;
	}

	.intro-toggle {
		position: absolute;
		top: 16px;
		right: 12px;
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
		z-index: 1;
	}

	.intro-panel.collapsed .intro-toggle {
		right: 12px;
	}

	.intro-toggle:hover {
		color: var(--text-primary);
	}

	.intro-content {
		padding: 48px 32px 32px;
		overflow-y: auto;
		flex: 1;
	}

	.intro-graphic {
		width: 100%;
		aspect-ratio: 16 / 9;
		margin-bottom: 24px;
		border-radius: 4px;
		overflow: hidden;
	}

	.intro-graphic img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.intro-graphic.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-control);
		color: var(--text-muted);
	}

	.intro-text {
		font-family: 'Georgia', serif;
	}

	.intro-title {
		margin: 0 0 8px;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.intro-author {
		margin: 0 0 24px;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.intro-author a {
		color: var(--text-link);
		text-decoration: none;
	}

	.intro-author a:hover {
		color: var(--text-link-hover);
	}

	.intro-body {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.intro-body :global(p) {
		margin: 0 0 1em;
	}

	.intro-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.intro-body :global(.wikilink) {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--text-link);
		text-decoration: underline;
		text-decoration-color: var(--border-link);
		text-underline-offset: 2px;
		cursor: pointer;
		transition: color 0.15s, text-decoration-color 0.15s;
	}

	.intro-body :global(.wikilink:hover) {
		color: var(--text-link-hover);
		text-decoration-color: var(--text-link-hover);
	}

	/* Page links (cross-canvas navigation) - slightly different styling */
	.intro-body :global(.pagelink) {
		font-weight: 500;
	}

	.intro-body :global(.pagelink::after) {
		content: ' →';
		font-size: 0.85em;
		opacity: 0.6;
	}

	/* Canvas area */
	.canvas-area {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	/* Responsive: collapse intro on small screens */
	@media (max-width: 768px) {
		.intro-panel {
			position: absolute;
			left: 0;
			top: 0;
			height: 100%;
			box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
		}

		.intro-panel.collapsed {
			width: 0;
			min-width: 0;
			border-right: none;
		}

		.intro-panel.collapsed .intro-toggle {
			position: fixed;
			left: 8px;
			top: 16px;
			right: auto;
			background: var(--bg-canvas);
			border: 1px solid var(--border-link);
			border-radius: 4px;
			width: 32px;
			height: 32px;
		}

		.canvas-area {
			width: 100%;
		}
	}
</style>
