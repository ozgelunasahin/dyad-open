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
</script>

<nav class="site-nav" class:hidden aria-label="Site navigation">
	<button class="logo-btn" onclick={() => onNavigate(items[0]?.slug ?? '')} aria-label={siteName}>
		<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt={siteName} class="site-logo" />
	</button>
	<ul>
		{#each items.slice(1) as item}
			<li>
				<button
					class:active={item.slug === activeSlug}
					onclick={() => onNavigate(item.slug)}
				>
					{item.name}
				</button>
			</li>
		{/each}
		<li>
			<button class="coming-soon">field notes</button>
		</li>
	</ul>
	<a href="/login" class="login-link">Log in</a>
</nav>

<style>
	.site-nav {
		position: fixed;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 20px;
		padding: 0 24px;
		height: 44px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 24px;
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
		transition: transform 0.3s ease, opacity 0.3s ease;
	}

	.login-link {
		margin-left: auto;
		font-family: 'Georgia', serif;
		font-size: 13px;
		color: #8b7355;
		text-decoration: none;
		padding: 6px 12px;
		border-radius: 4px;
		transition: color 0.15s, background 0.15s;
	}

	.login-link:hover {
		color: #5a4a3a;
		background: rgba(139, 115, 85, 0.08);
	}

	.site-nav.hidden {
		transform: translateX(-50%) translateY(-120%);
		opacity: 0;
	}

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
		height: 22px;
		width: auto;
	}

	ul {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 4px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	ul::-webkit-scrollbar {
		display: none;
	}

	li {
		flex-shrink: 0;
	}

	button {
		font-family: 'Georgia', serif;
		font-size: 13px;
		color: #8b7355;
		background: none;
		border: none;
		padding: 6px 12px;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s, background 0.15s;
	}

	button:hover {
		color: #5a4a3a;
		background: rgba(139, 115, 85, 0.08);
	}

	button.active {
		color: #1a1a1a;
		font-weight: 500;
		background: rgba(0, 0, 0, 0.04);
	}

	button.coming-soon {
		opacity: 0.45;
		cursor: default;
	}

	@media (prefers-color-scheme: dark) {
		.site-nav {
			background: rgba(26, 26, 26, 0.95);
			box-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
		}

		.site-logo {
			/* keep original logo color in dark mode */
		}

		button {
			color: #a89070;
		}

		button:hover {
			color: #c4a882;
			background: rgba(139, 115, 85, 0.12);
		}

		button.active {
			color: #e5e5e5;
			background: rgba(255, 255, 255, 0.06);
		}

		.login-link {
			color: #a89070;
		}

		.login-link:hover {
			color: #c4a882;
			background: rgba(139, 115, 85, 0.12);
		}
	}

	@media (max-width: 768px) {
		.site-nav {
			padding: 0 16px;
			gap: 16px;
		}

		.site-logo {
			height: 18px;
		}

		button {
			font-size: 12px;
			padding: 6px 10px;
		}
	}
</style>
