<script lang="ts">
	interface NavItem {
		slug: string;
		name: string;
		type: string;
	}

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
	<span class="site-name">{siteName}</span>
	<ul>
		{#each items as item}
			<li>
				<button
					class:active={item.slug === activeSlug}
					onclick={() => onNavigate(item.slug)}
				>
					{item.name}
				</button>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.site-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 0 24px;
		height: 48px;
		background: rgba(255, 255, 255, 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		transform: translateY(0);
		transition: transform 0.3s ease;
	}

	.site-nav.hidden {
		transform: translateY(-100%);
	}

	.site-name {
		font-family: 'Georgia', serif;
		font-size: 14px;
		font-weight: 600;
		color: #1a1a1a;
		white-space: nowrap;
		letter-spacing: -0.01em;
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

	@media (prefers-color-scheme: dark) {
		.site-nav {
			background: rgba(26, 26, 26, 0.92);
			border-bottom-color: rgba(255, 255, 255, 0.06);
		}

		.site-name {
			color: #e5e5e5;
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
	}

	@media (max-width: 768px) {
		.site-nav {
			padding: 0 16px;
			gap: 16px;
		}

		.site-name {
			font-size: 13px;
		}

		button {
			font-size: 12px;
			padding: 6px 10px;
		}
	}
</style>
