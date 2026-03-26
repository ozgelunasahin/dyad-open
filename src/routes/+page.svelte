<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatSlotDate(isoDate: string): string {
		const d = new Date(isoDate);
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>dyad. cultivating a culture of conversation</title>
	<meta name="description" content="Meet people through conversation in Berlin. Read prompts, pick a time, meet in person." />
</svelte:head>

<div class="landing">
	<header class="top-bar">
		<img src="/images/logo.png" alt="dyad." class="logo" />
		<div class="top-actions">
			<a href="/login" class="link-btn">Log in</a>
			<a href="/waitlist" class="btn-primary">Join waitlist</a>
		</div>
	</header>

	<main class="content">
		{#if data.prompts.length > 0}
			<section class="prompts-section">
				<h2 class="section-heading">What people are writing about</h2>
				<div class="prompt-grid">
					{#each data.prompts as prompt}
						<article class="prompt-card">
							{#if prompt.cover_image_url}
								<img
									src={prompt.cover_image_url}
									alt=""
									class="card-image"
									loading="lazy"
								/>
							{/if}
							<div class="card-body">
								<h3 class="card-title">{prompt.title}</h3>
								<p class="card-snippet">{prompt.body_snippet}</p>
								<div class="card-meta">
									{#if prompt.available_slots[0]}
										<span class="meta-area">{prompt.available_slots[0].general_area}</span>
										<span class="meta-sep">&middot;</span>
									{/if}
									{#if prompt.soonest_slot}
										<span class="meta-date">{formatSlotDate(prompt.soonest_slot)}</span>
										<span class="meta-sep">&middot;</span>
									{/if}
									<span class="meta-author">@{prompt.author_username}</span>
								</div>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}

		<section class="cta-section">
			<p class="cta-tagline">cultivating a culture of conversation</p>
			<p class="cta-desc">Read a prompt. Pick a time. Meet in person.</p>
			<a href="/waitlist" class="btn-primary cta-btn">Join the waitlist</a>
		</section>
	</main>

	<footer class="landing-footer">
		<div class="footer-links">
			<a href="/datenschutz">privacy policy</a>
			<span>|</span>
			<a href="/impressum">legal notice</a>
		</div>
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg-canvas);
		overflow: auto !important;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 40px;
		flex-shrink: 0;
	}

	.logo {
		height: 28px;
		width: auto;
		filter: brightness(0);
	}

	:global([data-theme='dark']) .logo { filter: none; }

	.top-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.link-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		text-decoration: none;
		padding: 8px 12px;
		transition: color 0.15s;
	}

	.link-btn:hover { color: var(--text-primary); }

	.btn-primary {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		padding: 8px 20px;
		border-radius: 6px;
		text-decoration: none;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border: 1px solid var(--text-primary, #1a1a1a);
		transition: opacity 0.15s;
	}

	.btn-primary:hover { opacity: 0.8; }

	.content {
		flex: 1;
		max-width: 820px;
		margin: 0 auto;
		padding: 20px 40px 60px;
		width: 100%;
		box-sizing: border-box;
	}

	.section-heading {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.1rem;
		font-weight: normal;
		color: var(--text-muted, #666);
		margin: 0 0 24px;
		font-style: italic;
	}

	.prompt-grid {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.prompt-card {
		display: flex;
		gap: 16px;
		padding: 16px 0;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
	}

	.prompt-card:last-child { border-bottom: none; }

	.card-image {
		width: 100px;
		height: 100px;
		object-fit: cover;
		border-radius: 6px;
		flex-shrink: 0;
		background: var(--bg-control, rgba(0, 0, 0, 0.04));
	}

	.card-body { flex: 1; min-width: 0; }

	.card-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 6px;
		line-height: 1.3;
	}

	.card-snippet {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.85rem;
		color: var(--text-muted, #666);
		margin: 0 0 8px;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.75rem;
		color: var(--text-muted, #999);
	}

	.meta-area {
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.7rem;
	}

	.meta-sep { color: var(--text-muted, #bbb); }

	.cta-section {
		text-align: center;
		padding: 60px 0 40px;
	}

	.cta-tagline {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.2rem;
		color: var(--text-primary);
		margin: 0 0 8px;
	}

	.cta-desc {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		color: var(--text-muted, #666);
		margin: 0 0 24px;
	}

	.cta-btn { font-size: 14px; padding: 10px 28px; }

	.landing-footer { padding: 20px 40px; flex-shrink: 0; }

	.footer-links {
		display: flex;
		justify-content: center;
		gap: 8px;
		font-size: 11px;
		color: var(--text-muted, #999);
	}

	.footer-links a {
		color: var(--text-muted, #999);
		text-decoration: none;
		font-family: 'SangBleu Sunrise', Georgia, serif;
	}

	.footer-links a:hover { color: var(--text-primary); }
	.footer-links span { color: var(--text-muted, #bbb); }

	@media (max-width: 430px) {
		.top-bar { padding: 16px 20px; }
		.content { padding: 16px 20px 40px; }
		.landing-footer { padding: 16px 20px; }
		.card-image { width: 72px; height: 72px; }
	}
</style>
