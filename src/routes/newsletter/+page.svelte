<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>field notes — dyad.</title>
	<meta name="description" content="Writing on encounter, difference, and what city life is missing. From dyad." />
</svelte:head>

<div class="page">
	<header class="header">
		<a href="/" class="logo-link"><img src="/images/logo.png" alt="dyad." class="logo" /></a>
		<h1 class="page-title">field notes</h1>
		<div class="header-spacer"></div>
	</header>

	<main class="main">
		{#if data.posts.length === 0}
			<p class="empty">No posts published yet.</p>
		{:else}
			<div class="grid">
				{#each data.posts as post}
					<a href="/newsletter/{post.slug}" class="card">
						<div class="card-image">
							{#if post.cover_image_url}
								<img src={post.cover_image_url} alt={post.title} />
							{:else}
								<div class="card-placeholder"></div>
							{/if}
						</div>
						<div class="card-body">
							<h2 class="card-title">{post.title}</h2>
							<p class="card-date">{new Date(post.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
							{#if post.tags && post.tags.length > 0}
								<div class="card-tags">
									{#each post.tags as tag}
										<span class="tag">{tag}</span>
									{/each}
								</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</main>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	.header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: var(--space-6) var(--space-8);
		border-bottom: 1px solid var(--border-link);
	}

	.logo-link { display: inline-block; }

	.logo {
		height: 22px;
		width: auto;
		display: block;
		filter: brightness(0) opacity(0.4);
	}
	:global([data-theme='dark']) .logo { filter: none; }

	.page-title {
		font-size: var(--text-base);
		font-weight: 400;
		margin: 0;
		text-align: center;
	}

	.header-spacer {}

	.main {
		padding: var(--space-8);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-8);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}
	.card:hover { opacity: var(--opacity-hover-card); }

	.card-image {
		width: 100%;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		background: var(--bg-control);
	}

	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.card-placeholder {
		width: 100%;
		height: 100%;
		background: var(--bg-control);
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.card-title {
		font-size: 20px;
		font-weight: 400;
		line-height: var(--leading-tight);
		margin: 0;
	}

	.card-date {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0;
	}

	.card-tags {
		display: flex;
		gap: var(--space-3);
	}

	.tag {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.empty {
		color: var(--text-muted);
		padding: var(--space-10) 0;
	}

	@media (max-width: 900px) {
		.grid { grid-template-columns: repeat(2, 1fr); }
	}

	@media (max-width: 560px) {
		.header { padding: var(--space-4); }
		.main { padding: var(--space-4); }
		.grid { grid-template-columns: 1fr; gap: var(--space-6); }
		.card-image { aspect-ratio: 4 / 5; }
	}
</style>
