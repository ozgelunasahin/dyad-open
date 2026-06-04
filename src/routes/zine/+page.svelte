<script lang="ts">
	import { env } from '$env/dynamic/public';

	// The zine is sold through Stripe Payment Links — full-page redirects to
	// Stripe-hosted checkout. We deliberately do NOT embed Stripe.js or the
	// Stripe Buy Button: an embed loads js.stripe.com on render and observes
	// (cookies + device fingerprint) every visitor before they consent or even
	// click. A plain link loads no third-party script on our page and only
	// hands the visitor to Stripe once they choose to buy — Stripe's own
	// checkout page carries its own privacy disclosure. This keeps the data
	// boundary tight and avoids a consent banner. See DESIGN.md § Consent-free
	// as a constraint, and CLAUDE.md § Data Collection and Values.
	//
	// Each tier is its own Payment Link, created in the Stripe dashboard.
	// Tier content (name, description) is versioned here; the environment
	// supplies the URLs (documented in .env.example and CLAUDE.md):
	//
	//   PUBLIC_ZINE_PAYMENT_LINK_STANDARD
	//   PUBLIC_ZINE_PAYMENT_LINK_REDUCED
	//   PUBLIC_ZINE_PAYMENT_LINK_SUPPORTER
	//
	// A tier renders only when its URL is set; with none set the page shows a
	// calm "available soon" state. Prices are shown on the Stripe checkout
	// page — the Payment Link is the source of truth for what is charged.
	const tiers = [
		{
			name: 'Standard',
			detail: 'One copy of Issue 001.',
			url: env.PUBLIC_ZINE_PAYMENT_LINK_STANDARD
		},
		{
			name: 'Reduced',
			detail: 'One copy, if the standard price is a stretch.',
			url: env.PUBLIC_ZINE_PAYMENT_LINK_REDUCED
		},
		{
			name: 'Supporter',
			detail: 'One copy, with a little extra toward the next print run.',
			url: env.PUBLIC_ZINE_PAYMENT_LINK_SUPPORTER
		}
	]
		.map((tier) => ({ ...tier, url: tier.url?.trim() ?? '' }))
		.filter((tier) => {
			// Accept only absolute https URLs — a misconfigured value degrades
			// to the tier not rendering rather than a broken buy button.
			try {
				return new URL(tier.url).protocol === 'https:';
			} catch {
				return false;
			}
		});
</script>

<svelte:head>
	<title>The Dyad Zine — dyad.berlin</title>
	<meta name="description" content="A zine about conversation, connection, and the city. Made in Berlin." />
</svelte:head>

<div class="page">
	<header class="header">
		<a href="/" class="logo-link"><img src="/images/logo.png" alt="dyad." class="logo" /></a>
	</header>

	<section class="hero">
		<div class="hero-text">
			<h1 class="title">The Dyad Zine</h1>
			<p class="subtitle">Issue 001</p>
		</div>
	</section>

	<section class="body-section">
		<div class="prose">
			<p>
				We made a zine because some things deserve paper. The conversations that stayed with us,
				the questions we kept returning to, the city as we have come to know it through strangers —
				none of it felt right on a screen.
			</p>
			<p>
				Issue 001 collects writing from the first year of dyad. Prompts that sparked something.
				Reflections on what it means to sit across from someone you have never met and mean it.
				Notes from Berlin.
			</p>
			<p>
				Printed in a small run. Black and white. Staple-bound. The kind of thing you leave on a table
				for someone else to find.
			</p>
		</div>
	</section>

	<section class="buy-section">
		<div class="buy-block">
			{#if tiers.length > 1}
				<ul class="tier-list">
					{#each tiers as tier (tier.url)}
						<li class="tier">
							<div class="tier-text">
								<span class="tier-name">{tier.name}</span>
								<span class="tier-detail">{tier.detail}</span>
							</div>
							<a class="buy-btn buy-btn--tier" href={tier.url} aria-label="order the zine — {tier.name}">
								order <span class="arrow">→</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else if tiers.length === 1}
				<a class="buy-btn" href={tiers[0].url}>
					order the zine <span class="arrow">→</span>
				</a>
			{:else}
				<span class="buy-btn buy-btn--soon" aria-disabled="true">available soon</span>
			{/if}

			<p class="fulfillment-note">
				Ships from Berlin within 5–7 days. Write to
				<a href="mailto:hello@dyad.berlin">hello@dyad.berlin</a> for bulk orders or questions.
			</p>
		</div>
	</section>

	<footer class="footer">
		<a href="/" class="footer-link">← back to dyad</a>
	</footer>
</div>

<style>
	.page {
		min-height: 100vh;
		background: var(--bg-canvas);
		color: var(--text-primary);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-6) var(--space-5);
	}

	.header {
		width: 100%;
		max-width: var(--content-narrow);
		padding-bottom: var(--space-10);
	}

	.logo {
		height: 28px;
		display: block;
	}

	.logo-link {
		display: inline-block;
	}

	.hero {
		width: 100%;
		max-width: var(--content-narrow);
		padding-bottom: var(--space-10);
		border-bottom: 1px solid var(--border-subtle);
	}

	.title {
		font-family: var(--font-serif);
		font-size: var(--text-3xl);
		font-weight: 300;
		line-height: var(--leading-tight);
		margin: 0 0 var(--space-2);
		letter-spacing: -0.01em;
	}

	.subtitle {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.body-section {
		width: 100%;
		max-width: var(--content-narrow);
		padding: var(--space-10) 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	.prose {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.prose p {
		font-family: var(--font-serif);
		font-size: var(--text-md);
		line-height: var(--leading-relaxed);
		margin: 0;
		color: var(--text-secondary);
	}

	.buy-section {
		width: 100%;
		max-width: var(--content-narrow);
		padding: var(--space-10) 0;
	}

	.buy-block {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-5);
	}

	/* Primary action, mirrors the landing-page .join-btn: inverted fill, takes
	   the visitor to Stripe-hosted checkout via a full-page navigation. */
	.buy-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-base);
		color: var(--bg-canvas);
		background: var(--text-primary);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-input);
		padding: var(--space-3) var(--space-5);
		text-decoration: none;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.buy-btn:hover {
		opacity: var(--opacity-hover-btn);
	}

	.arrow {
		font-size: var(--text-sm);
	}

	.tier-list {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	.tier {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-4);
		padding: var(--space-4) 0;
	}

	.tier + .tier {
		border-top: 1px solid var(--border-subtle);
	}

	.tier-text {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.tier-name {
		font-family: var(--font-serif);
		font-size: var(--text-md);
		color: var(--text-primary);
	}

	.tier-detail {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: var(--leading-relaxed);
	}

	.buy-btn--tier {
		padding: var(--space-2) var(--space-4);
		flex-shrink: 0;
	}

	/* No payment links configured: a calm, non-interactive placeholder. */
	.buy-btn--soon {
		background: none;
		color: var(--text-muted);
		border-color: var(--border-subtle);
		cursor: default;
	}

	.buy-btn--soon:hover {
		opacity: 1;
	}

	.fulfillment-note {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	.fulfillment-note a {
		color: var(--text-muted);
		text-decoration: underline;
	}

	.fulfillment-note a:hover {
		color: var(--text-primary);
	}

	.footer {
		width: 100%;
		max-width: var(--content-narrow);
		padding-top: var(--space-8);
	}

	.footer-link {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-decoration: none;
	}

	.footer-link:hover {
		color: var(--text-primary);
	}
</style>
