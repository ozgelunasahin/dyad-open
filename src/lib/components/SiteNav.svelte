<script lang="ts">
	import type { NavItem } from '$lib/server/load-site-sections';

	interface Props {
		items: NavItem[];
		activeSlug: string;
		siteName: string;
		hidden?: boolean;
		onNavigate: (slug: string) => void;
	}

	let { items, activeSlug, siteName, hidden = false, onNavigate }: Props = $props();
	let mobileMenuOpen = $state(false);
</script>

<nav class="site-nav" class:hidden aria-label="Site navigation">
	<!-- Left: logo -->
	<button class="logo-btn" onclick={() => onNavigate(items[0]?.slug ?? '')} aria-label={siteName}>
		<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt={siteName} class="site-logo" />
	</button>

	<!-- Center: section links (desktop) -->
	<div class="nav-center">
		{#each items.slice(1) as item}
			<button
				class:active={item.slug === activeSlug}
				onclick={() => onNavigate(item.slug)}
			>
				{item.name}
			</button>
		{/each}
	</div>

	<!-- Right: user icon links to login (desktop) -->
	<a href="/login" class="user-link" aria-label="Log in">
		<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
			<circle cx="9" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/>
			<path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
		</svg>
	</a>

	<!-- Mobile: hamburger -->
	<button class="menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Menu">
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
</nav>

<!-- Mobile menu -->
{#if mobileMenuOpen}
	<div class="mobile-menu">
		{#each items.slice(1) as item}
			<button onclick={() => { onNavigate(item.slug); mobileMenuOpen = false; }}>
				{item.name}
			</button>
		{/each}
		<hr />
		<a href="/signup" class="mobile-link" onclick={() => mobileMenuOpen = false}>sign up</a>
		<a href="/login" class="mobile-link" onclick={() => mobileMenuOpen = false}>log in</a>
	</div>
{/if}


<style>
	.site-nav {
		position: fixed;
		top: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 0 28px;
		height: 48px;
		background: color-mix(in srgb, var(--bg-canvas, #f5f3f0) 92%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 8px;
		box-shadow: 0 1px 12px var(--bg-control, rgba(0, 0, 0, 0.08));
		transition: transform 0.3s ease, opacity 0.3s ease, background-color 0.2s ease;
	}

	.site-nav.hidden {
		transform: translateX(-50%) translateY(-120%);
		opacity: 0;
	}

	/* Three-column layout: logo - center links - user icon */
	.nav-center {
		display: flex;
		align-items: center;
		gap: 4px;
		margin: 0 auto;
	}

	/* User icon link (desktop) */
	.user-link {
		display: flex;
		align-items: center;
		color: var(--text-muted, #666);
		padding: 4px;
		transition: color 0.15s;
	}

	.user-link:hover {
		color: var(--text-primary, #1a1a1a);
	}

	/* Mobile menu (hidden on desktop) */
	.mobile-menu {
		display: none;
	}

	/* Logo in center */
	.logo-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.site-logo {
		height: 34px;
		width: auto;
		/* Logo is white on transparent — darken it in light mode */
		filter: brightness(0);
		transition: filter 0.2s ease;
	}

	:global([data-theme='dark']) .site-logo {
		filter: none;
	}

	/* Nav buttons */
	button {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-muted, #666);
		background: none;
		border: none;
		padding: 6px 12px;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s;
	}

	button:hover {
		color: var(--text-primary, #1a1a1a);
	}

	button.active {
		color: var(--text-primary, #1a1a1a);
	}

	/* Mobile hamburger — hidden on desktop */
	.menu-btn {
		display: none;
		padding: 4px;
		color: var(--text-primary, #1a1a1a);
	}

	/* === Mobile === */
	@media (max-width: 768px) {
		.site-nav {
			top: 0;
			left: 0;
			right: 0;
			transform: none;
			padding: 16px 20px;
			height: auto;
			border-radius: 0;
			background: transparent;
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			box-shadow: none;
		}

		.site-nav.hidden {
			transform: translateY(-100%);
		}

		.nav-center, .user-link {
			display: none;
		}

		.logo-btn {
			margin-right: auto;
		}

		.site-logo {
			height: 24px;
			filter: brightness(0);
		}

		:global([data-theme='dark']) .site-logo {
			filter: none;
		}

		.menu-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--text-primary, #1a1a1a);
		}

		.mobile-menu {
			display: flex;
			flex-direction: column;
			position: fixed;
			top: 56px;
			left: 20px;
			right: 20px;
			z-index: 99;
			background: color-mix(in srgb, var(--bg-canvas, #f5f3f0) 95%, transparent);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border-radius: 16px;
			padding: 12px 8px;
			box-shadow: 0 4px 24px var(--bg-control, rgba(0, 0, 0, 0.1));
		}

		.mobile-menu button, .mobile-menu .mobile-link {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 16px;
			font-weight: 500;
			color: var(--text-secondary, #333);
			background: none;
			border: none;
			padding: 12px 16px;
			text-align: left;
			cursor: pointer;
			text-decoration: none;
			display: block;
			border-radius: 8px;
			transition: background 0.15s, color 0.15s;
		}

		.mobile-menu button:hover, .mobile-menu .mobile-link:hover {
			background: var(--bg-control, rgba(0, 0, 0, 0.05));
			color: var(--text-primary, #1a1a1a);
		}

		.mobile-menu hr {
			border: none;
			border-top: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
			margin: 4px 16px;
		}
	}
</style>
