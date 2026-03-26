<script lang="ts">
	import { fly } from 'svelte/transition';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let mobileMenuOpen = $state(false);

	let currentPath = $derived($page.url.pathname);
</script>

<div class="app-layout">
	<aside class="sidebar">
		<a href="/discover" class="sidebar-logo">
			<img src="/images/logo.png" alt="dyad" class="sidebar-logo-img" />
		</a>
		<nav class="sidebar-nav">
			<a href="/discover" class="sidebar-link" class:active={currentPath === '/discover'}>Discover</a>
			<a href="/profile" class="sidebar-link" class:active={currentPath === '/profile'}>Profile</a>
		</nav>
		<div class="sidebar-bottom">
			<span class="sidebar-username">@{data.username}</span>
			<a href="/logout" class="sidebar-logout">sign out</a>
		</div>
		<button class="mobile-menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Menu">
			{#if mobileMenuOpen}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{/if}
		</button>
	</aside>

	{#if mobileMenuOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="mobile-overlay" onclick={() => mobileMenuOpen = false}></div>
		<aside class="mobile-panel" transition:fly={{ x: 300, duration: 250 }}>
			<nav class="mobile-panel-nav">
				<a href="/discover" onclick={() => mobileMenuOpen = false}>discover</a>
				<a href="/profile" onclick={() => mobileMenuOpen = false}>profile</a>
			</nav>
			<div class="mobile-panel-bottom">
				<span class="mobile-panel-user">@{data.username}</span>
				<a href="/logout" onclick={() => mobileMenuOpen = false}>sign out</a>
			</div>
		</aside>
	{/if}

	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
		background: var(--bg-canvas);
	}

	.sidebar {
		width: 180px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 1.5rem 1.25rem;
		border-right: 1px solid var(--border-link);
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
	}

	.sidebar-logo {
		display: block;
		margin-bottom: 1.25rem;
		padding: 0 0.65rem;
	}

	.sidebar-logo-img {
		width: 22px;
		height: auto;
		object-fit: contain;
		filter: brightness(0) opacity(0.4);
	}

	:global([data-theme='dark']) .sidebar-logo-img {
		filter: brightness(0) invert(1) opacity(0.7);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sidebar-link {
		display: block;
		padding: 0.5rem 0.65rem;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		border-radius: 4px;
		transition: color 0.15s, background 0.15s;
	}

	.sidebar-link:hover {
		color: var(--text-primary);
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
	}

	.sidebar-link.active {
		color: var(--text-primary);
		font-weight: 500;
	}

	.sidebar-bottom {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sidebar-username {
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: monospace;
	}

	.sidebar-logout {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.8rem;
		transition: color 0.2s;
	}

	.sidebar-logout:hover { color: var(--text-primary); }

	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-primary, #1a1a1a);
		align-items: center;
		justify-content: center;
	}

	.mobile-overlay, .mobile-panel { display: none; }

	.main-content {
		flex: 1;
		min-width: 0;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	@media (max-width: 430px) {
		.app-layout { flex-direction: column; }

		.sidebar {
			width: 100%;
			height: auto;
			position: static;
			flex-direction: row;
			align-items: center;
			padding: 1rem 1.5rem;
			border-right: none;
			border-bottom: 1px solid var(--border-link);
			gap: 1rem;
		}

		.sidebar-logo { margin-bottom: 0; padding: 0; }
		.sidebar-logo-img { width: 28px; }
		.sidebar-nav { display: none; }
		.sidebar-bottom { display: none; }
		.mobile-menu-btn { display: flex; margin-left: auto; }

		.mobile-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.15);
			z-index: 200;
		}

		.mobile-panel {
			display: flex;
			flex-direction: column;
			position: fixed;
			top: 0;
			right: 0;
			width: 280px;
			max-width: 80vw;
			height: 100vh;
			background: var(--bg-canvas, #f5f3f0);
			z-index: 300;
			padding: 24px;
			box-sizing: border-box;
			box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
		}

		.mobile-panel-nav {
			display: flex;
			flex-direction: column;
			gap: 0;
			margin-top: 32px;
		}

		.mobile-panel-nav a {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 18px;
			font-weight: 500;
			color: var(--text-primary, #1a1a1a);
			text-decoration: none;
			padding: 14px 0;
			border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		}

		.mobile-panel-bottom {
			margin-top: auto;
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.mobile-panel-user {
			font-family: monospace;
			font-size: 13px;
			color: var(--text-muted, #666);
		}

		.mobile-panel-bottom a {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 16px;
			color: var(--text-secondary, #333);
			text-decoration: none;
		}

		.main-content { padding: 1rem; }
	}
</style>
