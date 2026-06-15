<script lang="ts">
	let { children } = $props();
</script>

<div class="zine-shell">
	<header class="zine-header">
		<a href="/" class="zine-wordmark">DYAD</a>
		<nav class="zine-nav">
			<a href="/field-notes" class="zine-nav-link">field notes</a>
			<a href="/steward-ownership" class="zine-nav-link">steward ownership</a>
			<a href="/governance" class="zine-nav-link">governance</a>
			<a href="/community-care" class="zine-nav-link">community care</a>
		</nav>
	</header>

	<main class="zine-main">
		{@render children()}
	</main>

	<footer class="zine-footer">
		<div class="footer-grid">
			<div class="footer-col">
				<p class="footer-col-head">Field Notes</p>
				<a href="/field-notes/embedding-care" class="footer-link">Embedding care into the infrastructure</a>
				<a href="/field-notes/systemic-diagnosis" class="footer-link">A systemic diagnosis</a>
				<a href="/field-notes/why-ownership-matters" class="footer-link">Why ownership matters</a>
				<a href="/field-notes/community-experiment" class="footer-link">Community building as a social experiment</a>
				<a href="/field-notes/holding-space" class="footer-link">Holding space online</a>
			</div>
			<div class="footer-col">
				<p class="footer-col-head">Steward Ownership</p>
				<a href="/steward-ownership#why" class="footer-link">Why ownership matters</a>
				<a href="/steward-ownership#what" class="footer-link">What is steward ownership?</a>
				<a href="/steward-ownership#model" class="footer-link">How our model works</a>
				<a href="/steward-ownership#raise" class="footer-link">How we raise</a>
			</div>
			<div class="footer-col">
				<p class="footer-col-head">Governance</p>
				<a href="/governance#structure" class="footer-link">Governance structure</a>
				<a href="/governance#decision-making" class="footer-link">Decision making</a>
				<a href="/governance#assembly" class="footer-link">Assembly process</a>
				<a href="/governance#transparency" class="footer-link">Transparency & accountability</a>
			</div>
			<div class="footer-col">
				<p class="footer-col-head">Community Care</p>
				<a href="/community-care#holding-space" class="footer-link">Holding space online</a>
				<a href="/community-care#approach" class="footer-link">Our approach</a>
				<a href="/community-care#guidelines" class="footer-link">Community guidelines</a>
				<a href="/community-care#moderation" class="footer-link">Moderation</a>
			</div>
			<div class="footer-col">
				<p class="footer-col-head">Dyad</p>
				<a href="/" class="footer-link">Home</a>
				<a href="/why" class="footer-link">About</a>
				<a href="/join" class="footer-link">Join</a>
				<a href="/impressum" class="footer-link">Impressum</a>
				<a href="/datenschutz" class="footer-link">Datenschutz</a>
			</div>
		</div>
		<p class="footer-colophon">DYAD — Field notes on building social technology as civic infrastructure. Draft Edition, June 2026. Currently in beta in Berlin.</p>
	</footer>
</div>

<style>
	:global(body) { margin: 0; overflow: auto; }
	:global(html) { scroll-behavior: smooth; }

	.zine-shell {
		min-height: 100vh;
		background: #080808;
		color: rgba(240, 236, 230, 0.8);
		display: flex;
		flex-direction: column;
	}

	/* ── Header ── */
	.zine-header {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 48px;
		background: rgba(8, 8, 8, 0.92);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid rgba(240, 236, 230, 0.05);
	}

	.zine-wordmark {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: rgba(240, 236, 230, 0.9);
		text-decoration: none;
	}

	.zine-nav {
		display: flex;
		gap: 32px;
	}

	.zine-nav-link {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.35);
		text-decoration: none;
		transition: color 0.15s;
	}

	.zine-nav-link:hover {
		color: rgba(240, 236, 230, 0.85);
	}

	/* ── Main ── */
	.zine-main {
		flex: 1;
	}

	/* ── Footer ── */
	.zine-footer {
		border-top: 1px solid rgba(240, 236, 230, 0.06);
		padding: 64px 48px 48px;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 40px;
		margin-bottom: 56px;
	}

	.footer-col-head {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.5);
		margin: 0 0 16px;
	}

	.footer-link {
		display: block;
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.85rem;
		font-weight: 300;
		color: rgba(240, 236, 230, 0.4);
		text-decoration: none;
		margin-bottom: 10px;
		line-height: 1.4;
		transition: color 0.15s;
	}

	.footer-link:hover {
		color: rgba(240, 236, 230, 0.85);
	}

	.footer-colophon {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.15);
		margin: 0;
		border-top: 1px solid rgba(240, 236, 230, 0.04);
		padding-top: 24px;
	}

	/* ── Mobile ── */
	@media (max-width: 640px) {
		.zine-header {
			padding: 16px 20px;
		}

		.zine-nav {
			display: none;
		}

		.zine-footer {
			padding: 40px 20px 40px;
		}

		.footer-grid {
			grid-template-columns: 1fr 1fr;
			gap: 32px;
		}
	}
</style>
