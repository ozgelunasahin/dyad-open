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
	// calm "available soon" state. Displayed prices must match the Payment
	// Link — Stripe still charges whatever the link says, so update both
	// together. Tiers are listed in increasing price order.
	const tiers = [
		{
			name: 'Reduced',
			price: '€15',
			detail: 'One copy, if the standard price is a stretch.',
			url: env.PUBLIC_ZINE_PAYMENT_LINK_REDUCED
		},
		{
			name: 'Standard',
			price: '€25',
			detail: 'One copy of Issue 001.',
			url: env.PUBLIC_ZINE_PAYMENT_LINK_STANDARD
		},
		{
			name: 'Supporter',
			price: '€50',
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
		<span class="ghost-numeral" aria-hidden="true">001</span>
		<div class="hero-text">
			<h1 class="title">The Dyad Zine</h1>
			<p class="subtitle">Issue 001</p>
		</div>
		<span class="stamp" aria-hidden="true">Made in Berlin</span>
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

	<div class="asterism" aria-hidden="true">⁂</div>

	<section class="buy-section">
		<div class="coupon">
			<span class="coupon-scissors" aria-hidden="true">✂</span>

			{#if tiers.length > 1}
				<ul class="tier-list">
					{#each tiers as tier (tier.url)}
						<li class="tier">
							<div class="tier-row">
								<span class="tier-name">{tier.name}</span>
								<span class="tier-leader" aria-hidden="true"></span>
								<span class="tier-price">{tier.price}</span>
								<a
									class="buy-btn buy-btn--tier"
									href={tier.url}
									aria-label="order the zine — {tier.name}, {tier.price}"
								>
									order <span class="arrow">→</span>
								</a>
							</div>
							<p class="tier-detail">{tier.detail}</p>
						</li>
					{/each}
				</ul>
			{:else if tiers.length === 1}
				<div class="tier-row">
					<span class="tier-price">{tiers[0].price}</span>
					<a class="buy-btn" href={tiers[0].url}>
						order the zine <span class="arrow">→</span>
					</a>
				</div>
			{:else}
				<span class="buy-btn buy-btn--soon" aria-disabled="true">available soon</span>
			{/if}

			<p class="fulfillment-note">
				Copies change hands in person — in Berlin, and wherever dyad travels. Write to
				<a href="mailto:hello@dyad.berlin">hello@dyad.berlin</a> to find one.
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
		overflow-x: clip;
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

	/* ── Masthead ─────────────────────────────────────────────────────────
	   The zine's own cover sheet: small mono issue label, oversized SangBleu
	   title, a double editorial rule, the issue numeral ghosted behind like a
	   registration mark, and the page's single terracotta accent — a stamp
	   sitting across the fold. */
	.hero {
		position: relative;
		width: 100%;
		max-width: var(--content-narrow);
		padding: var(--space-8) 0 var(--space-8);
		border-bottom: 3px double var(--line-color);
	}

	.hero-text {
		position: relative;
		display: flex;
		flex-direction: column-reverse; /* label reads above the title; h1 stays first in DOM */
		gap: var(--space-3);
		z-index: 1;
	}

	.title {
		font-family: var(--font-serif);
		font-size: clamp(2.5rem, 8.5vw, 3.75rem);
		font-weight: 300;
		line-height: 1.04;
		margin: 0;
		letter-spacing: -0.02em;
		text-wrap: balance;
	}

	.subtitle {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.ghost-numeral {
		position: absolute;
		right: calc(-1 * var(--space-8));
		bottom: calc(-1 * var(--space-4));
		font-family: var(--font-serif);
		font-weight: 300;
		font-size: clamp(6.5rem, 26vw, 11rem);
		line-height: 1;
		letter-spacing: -0.04em;
		color: transparent;
		-webkit-text-stroke: 1px color-mix(in srgb, var(--text-primary) 28%, transparent);
		pointer-events: none;
		user-select: none;
		z-index: 0;
	}

	@supports not (-webkit-text-stroke: 1px black) {
		.ghost-numeral {
			color: color-mix(in srgb, var(--text-primary) 7%, transparent);
		}
	}

	.stamp {
		position: absolute;
		right: 0;
		bottom: calc(-1 * var(--space-4));
		z-index: 2;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-accent);
		border: 1.5px solid var(--color-accent);
		border-radius: 2px;
		padding: var(--space-1) var(--space-3);
		background: var(--bg-canvas);
		transform: rotate(-4deg);
		opacity: 0.9;
	}

	/* ── Prose ────────────────────────────────────────────────────────── */
	.body-section {
		width: 100%;
		max-width: var(--content-narrow);
		padding: var(--space-10) 0 var(--space-6);
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

	.prose p:first-of-type::first-letter {
		float: left;
		font-size: 3.1em;
		line-height: 0.82;
		font-weight: 300;
		padding: var(--space-1) var(--space-2) 0 0;
		color: var(--text-primary);
	}

	/* ── Asterism — the printer's section break ───────────────────────── */
	.asterism {
		width: 100%;
		max-width: var(--content-narrow);
		text-align: center;
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		color: var(--text-muted);
		padding: var(--space-4) 0;
		user-select: none;
	}

	/* ── The order coupon ─────────────────────────────────────────────── */
	.buy-section {
		width: 100%;
		max-width: var(--content-narrow);
		padding: var(--space-4) 0 var(--space-10);
	}

	.coupon {
		position: relative;
		border: 1px dashed var(--line-color);
		border-radius: 2px;
		padding: var(--space-8) var(--space-6) var(--space-6);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-6);
	}

	.coupon-scissors {
		position: absolute;
		top: -0.72em;
		left: var(--space-6);
		font-size: var(--text-lg);
		line-height: 1;
		color: var(--text-muted);
		background: var(--bg-canvas);
		padding: 0 var(--space-2);
		user-select: none;
	}

	.tier-list {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.tier-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.tier-name {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		color: var(--text-primary);
		flex-shrink: 0;
	}

	/* Dotted leader, as in a colophon price list */
	.tier-leader {
		flex: 1;
		min-width: var(--space-6);
		border-bottom: 1px dotted var(--line-color);
		transform: translateY(0.2em);
	}

	.tier-price {
		font-family: var(--font-mono);
		font-size: var(--text-base);
		color: var(--text-primary);
		letter-spacing: 0.02em;
		flex-shrink: 0;
	}

	.tier-detail {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: var(--leading-relaxed);
		margin: var(--space-1) 0 0;
	}

	/* ── Buttons — small letterpress blocks ───────────────────────────── */
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
		box-shadow: 3px 3px 0 color-mix(in srgb, var(--text-primary) 20%, transparent);
		transition:
			transform var(--duration-fast) var(--ease-ink),
			box-shadow var(--duration-fast) var(--ease-ink);
	}

	.buy-btn:hover {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 color-mix(in srgb, var(--text-primary) 20%, transparent);
	}

	.buy-btn--tier {
		padding: var(--space-2) var(--space-4);
		flex-shrink: 0;
	}

	.arrow {
		font-size: var(--text-sm);
	}

	/* No payment links configured: a calm, non-interactive placeholder. */
	.buy-btn--soon {
		background: none;
		color: var(--text-muted);
		border: 1px solid var(--border-subtle);
		box-shadow: none;
		cursor: default;
	}

	.buy-btn--soon:hover {
		transform: none;
		box-shadow: none;
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

	/* ── Colophon ─────────────────────────────────────────────────────── */
	.footer {
		width: 100%;
		max-width: var(--content-narrow);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border-subtle);
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

	/* ── Load choreography — one staggered ink-settle ─────────────────── */
	@media (prefers-reduced-motion: no-preference) {
		.header,
		.hero-text,
		.body-section,
		.asterism,
		.buy-section,
		.footer {
			animation: rise var(--duration-slow) var(--ease-ink) both;
		}

		.hero-text { animation-delay: 60ms; }
		.body-section { animation-delay: 140ms; }
		.asterism { animation-delay: 200ms; }
		.buy-section { animation-delay: 260ms; }
		.footer { animation-delay: 320ms; }

		.ghost-numeral {
			animation: ghost-in 700ms var(--ease-ink) 240ms both;
		}

		.stamp {
			animation: stamp-in var(--duration-slow) var(--ease-ink) 520ms both;
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}

	@keyframes ghost-in {
		from {
			opacity: 0;
		}
	}

	@keyframes stamp-in {
		from {
			opacity: 0;
			transform: rotate(-9deg) scale(1.14);
		}
	}

	/* ── Small screens — the numeral tucks in, the stamp keeps its corner ── */
	@media (max-width: 640px) {
		.ghost-numeral {
			right: calc(-1 * var(--space-4));
		}

		.coupon {
			padding: var(--space-8) var(--space-4) var(--space-5);
		}
	}
</style>
