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
		<button class="coming-soon">field notes</button>
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
		<button class="coming-soon" onclick={() => mobileMenuOpen = false}>field notes</button>
		<hr />
		<a href="/signup" class="mobile-link" onclick={() => mobileMenuOpen = false}>sign up</a>
		<a href="/login" class="mobile-link" onclick={() => mobileMenuOpen = false}>log in</a>
	</div>
{/if}


<style>
	.site-nav {
		position: fixed;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 0 28px;
		height: 48px;
		background: rgba(30, 30, 30, 0.9);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 28px;
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
		transition: transform 0.3s ease, opacity 0.3s ease;
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
		color: rgba(255, 255, 255, 0.8);
		padding: 4px;
		transition: color 0.15s;
	}

	.user-link:hover {
		color: #fff;
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
		height: 30px;
		width: auto;
	}

	/* Nav buttons */
	button {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		background: none;
		border: none;
		padding: 6px 12px;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s;
	}

	button:hover {
		color: #fff;
	}

	button.active {
		color: #fff;
	}

	button.coming-soon {
		cursor: default;
	}


	/* Mobile hamburger — hidden on desktop */
	.menu-btn {
		display: none;
		padding: 4px;
		color: rgba(255, 255, 255, 0.9);
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
		}

		.menu-btn {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.mobile-menu {
			display: flex;
			flex-direction: column;
			position: fixed;
			top: 56px;
			left: 20px;
			right: 20px;
			z-index: 99;
			background: rgba(30, 30, 30, 0.95);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border-radius: 16px;
			padding: 12px 8px;
			box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
		}

		.mobile-menu button, .mobile-menu .mobile-link {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 16px;
			font-weight: 500;
			color: rgba(255, 255, 255, 0.85);
			background: none;
			border: none;
			padding: 12px 16px;
			text-align: left;
			cursor: pointer;
			text-decoration: none;
			display: block;
			border-radius: 8px;
			transition: background 0.15s;
		}

		.mobile-menu button:hover, .mobile-menu .mobile-link:hover {
			background: rgba(255, 255, 255, 0.08);
			color: #fff;
		}

		.mobile-menu hr {
			border: none;
			border-top: 1px solid rgba(255, 255, 255, 0.1);
			margin: 4px 16px;
		}
	}
</style>
