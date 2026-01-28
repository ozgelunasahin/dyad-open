<script lang="ts">
	interface CanvasLink {
		name: string;
		slug: string;
	}

	interface Props {
		/** Author username */
		author: string;
		/** List of canvases for navigation */
		canvases?: CanvasLink[];
		/** Current canvas slug (for highlighting in nav) */
		currentCanvas?: string;
		/** Child content (the canvas) */
		children: import('svelte').Snippet;
		/** Optional base URL for navigation links (e.g., for preview mode) */
		baseUrl?: string;
		/** Use ?canvas= query param instead of path segments */
		useQueryParam?: boolean;
	}

	let {
		author,
		canvases = [],
		currentCanvas,
		children,
		baseUrl,
		useQueryParam = false
	}: Props = $props();

	function getCanvasUrl(canvasSlug: string): string {
		if (baseUrl) {
			if (useQueryParam || baseUrl.includes('/preview')) {
				return `${baseUrl}?canvas=${canvasSlug}`;
			}
			return `${baseUrl}/${canvasSlug}`;
		}
		return `/sites/@${author}/${canvasSlug}`;
	}

	let navExpanded = $state(true);

	function toggleNav() {
		navExpanded = !navExpanded;
	}
</script>

<div class="website-container">
	{#if canvases.length > 0}
		<aside class="nav-panel" class:collapsed={!navExpanded}>
			<button class="nav-toggle" onclick={toggleNav} aria-label={navExpanded ? 'Collapse navigation' : 'Expand navigation'}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					{#if navExpanded}
						<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					{:else}
						<path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					{/if}
				</svg>
			</button>

			{#if navExpanded}
				<nav class="canvas-nav">
					<ul>
						{#each canvases as canvas}
							<li>
								<a
									href={getCanvasUrl(canvas.slug)}
									class:active={canvas.slug === currentCanvas}
								>
									{canvas.name}
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}
		</aside>
	{/if}

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

	.nav-panel {
		position: relative;
		width: 200px;
		min-width: 200px;
		height: 100%;
		background: var(--bg-canvas);
		border-right: 1px solid var(--border-link);
		display: flex;
		flex-direction: column;
		transition: width 0.2s ease, min-width 0.2s ease;
		z-index: 10;
	}

	.nav-panel.collapsed {
		width: 32px;
		min-width: 32px;
	}

	.nav-toggle {
		position: absolute;
		top: 24px;
		right: 16px;
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

	.nav-panel.collapsed .nav-toggle {
		right: 4px;
		top: 24px;
	}

	.nav-toggle:hover {
		color: var(--text-primary);
	}

	.canvas-nav {
		padding: 24px 20px;
		overflow-y: auto;
		flex: 1;
	}

	.canvas-nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.canvas-nav li {
		margin: 0 0 8px;
	}

	.canvas-nav a {
		display: block;
		padding: 4px 0;
		font-family: 'Georgia', serif;
		font-size: 1.2rem;
		color: #8b7355;
		text-decoration: underline;
		text-decoration-color: rgba(139, 115, 85, 0.4);
		text-underline-offset: 3px;
		transition: color 0.15s, text-decoration-color 0.15s;
	}

	.canvas-nav a:hover {
		color: #5a4a3a;
		text-decoration-color: #5a4a3a;
	}

	.canvas-nav a.active {
		color: #1a1a1a;
		font-weight: 500;
		text-decoration-color: rgba(26, 26, 26, 0.3);
	}

	.canvas-nav a.active:hover {
		text-decoration-color: #1a1a1a;
	}

	.canvas-area {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	@media (max-width: 768px) {
		.nav-panel {
			position: absolute;
			left: 0;
			top: 0;
			height: 100%;
			box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
		}

		.nav-panel.collapsed {
			width: 0;
			min-width: 0;
			border-right: none;
		}

		.nav-panel.collapsed .nav-toggle {
			position: fixed;
			left: 8px;
			top: 12px;
			right: auto;
			background: var(--bg-canvas);
			border: 1px solid var(--border-link);
			border-radius: 4px;
			width: 28px;
			height: 28px;
		}

		.canvas-area {
			width: 100%;
		}
	}
</style>
