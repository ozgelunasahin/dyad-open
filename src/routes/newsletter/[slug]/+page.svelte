<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { post, isAdmin, postId } = data;

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>{post.title} — field notes — dyad.</title>
	<meta name="description" content={post.teaser} />
</svelte:head>

<div class="page">
	<header class="header">
		<a href="/" class="logo-link"><img src="/images/logo.png" alt="dyad." class="logo" /></a>
		<a href="/newsletter" class="back-link">field notes</a>
		{#if isAdmin}
			<a href={postId ? `/admin/newsletter/${postId}` : '/admin/newsletter'} class="edit-link">edit</a>
		{/if}
	</header>

	{#if post.cover_image_url}
		<div class="cover-wrap">
			<img src={post.cover_image_url} alt={post.title} class="cover" />
		</div>
	{/if}

	<main class="main">
		<article class="article">
			<div class="article-header">
				<h1 class="article-title">{post.title}</h1>
				{#if post.subtitle}
					<p class="article-subtitle">{post.subtitle}</p>
				{/if}
				<div class="article-byline">
					<span class="article-date">{formatDate(post.published_at)}</span>
					{#if post.author}
						<span class="article-author">Words by {post.author}</span>
					{/if}
				</div>
			</div>

			<div class="article-body">
				{@html post.bodyHtml}
			</div>
		</article>
	</main>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-8) var(--space-10);
	}

	.logo-link { display: inline-block; }

	.logo {
		height: 24px;
		width: auto;
		display: block;
		filter: brightness(0) opacity(0.4);
	}
	:global([data-theme='dark']) .logo { filter: none; }

	.back-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.back-link:hover { color: var(--text-primary); }

	.edit-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.15s;
	}
	.edit-link:hover { color: var(--text-primary); }

	/* ── Full-bleed cover ─────────────────────────────────────── */
	.cover-wrap {
		width: 100%;
	}

	.cover {
		width: 100%;
		height: auto;
		display: block;
	}

	/* ── Prose column ─────────────────────────────────────────── */
	.main {
		max-width: 680px;
		margin: 0 auto;
		padding: 0 var(--space-10) 120px;
	}

	.article-header {
		padding: var(--space-10) 0;
		border-bottom: 1px solid var(--border-link);
		margin-bottom: var(--space-10);
		text-align: center;
	}

	.article-label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin: 0 0 var(--space-5);
	}

	.article-title {
		font-size: 20px;
		font-weight: 300;
		line-height: 1.1;
		letter-spacing: -0.02em;
		margin: 0 0 var(--space-4);
		color: var(--text-primary);
	}

	.article-subtitle {
		font-size: var(--text-lg);
		font-weight: 300;
		font-style: italic;
		line-height: var(--leading-normal);
		color: var(--text-muted);
		margin: 0 0 var(--space-5);
	}

	.article-byline {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.article-author {
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}

	.byline-sep {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.article-date {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	/* ── Body prose ──────────────────────────────────────────── */
	.article-body :global(p) {
		font-size: var(--text-md);
		font-weight: 300;
		line-height: var(--leading-relaxed);
		color: var(--text-secondary);
		margin: 0 0 var(--space-6);
	}

	.article-body :global(h2) {
		font-size: var(--text-xl);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text-primary);
		margin: var(--space-8) 0 var(--space-4);
	}

	.article-body :global(h3) {
		font-size: var(--text-lg);
		font-weight: 400;
		line-height: var(--leading-tight);
		color: var(--text-primary);
		margin: var(--space-6) 0 var(--space-3);
	}

	.article-body :global(blockquote) {
		margin: var(--space-6) 0;
		padding: 0;
		border: none;
		border-radius: 0;
	}

	.article-body :global(blockquote p) {
		font-style: italic;
		color: var(--text-secondary) !important;
		margin: 0 !important;
	}

	.article-body :global(blockquote footer) {
		display: inline;
		font-style: normal;
		color: var(--text-secondary);
	}

	.article-body :global(img) {
		max-width: 100%;
		border-radius: var(--radius-card);
		margin: var(--space-6) 0 var(--space-1);
		display: block;
	}

	.article-body :global(img + p) {
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-align: center;
		margin: 0 0 var(--space-6);
	}

	.article-body :global(a) {
		color: var(--text-primary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.article-body :global(ul), .article-body :global(ol) {
		padding-left: var(--space-6);
		margin: 0 0 var(--space-6);
	}

	.article-body :global(li) {
		font-size: var(--text-md);
		font-weight: 300;
		line-height: var(--leading-relaxed);
		color: var(--text-secondary);
		margin-bottom: var(--space-2);
	}

	@media (max-width: 600px) {
		.header { padding: var(--space-6) var(--space-4); }
		.main { padding: 0 var(--space-4) 80px; }
	}
</style>
