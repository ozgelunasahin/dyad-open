<!-- Shared zine footer — used by the (zine) layout and the /why page. -->
<script lang="ts">
	import { copy } from '$lib/copy';
</script>

<footer class="zine-footer">
	<div class="footer-grid">
		<div class="footer-col">
			<p class="footer-col-head">Steward Ownership</p>
			<a href="/steward-ownership#why" class="footer-link">Why ownership matters</a>
			<a href="/steward-ownership#what" class="footer-link">What is steward ownership?</a>
			<a href="/steward-ownership#model" class="footer-link">How our model works</a>
			<a href="/steward-ownership#raise" class="footer-link">How we raise</a>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Participatory Governance</p>
			<a href="/governance#structure" class="footer-link">Governance structure</a>
			<a href="/governance#decision-making" class="footer-link">Decision making</a>
			<a href="/governance#assembly" class="footer-link">Assembly process</a>
			<a href="/governance#transparency" class="footer-link">Transparency & accountability</a>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Trust, Safety &amp; Community Care</p>
			<a href="/community-care#holding-space" class="footer-link">Holding space online</a>
			<a href="/community-care#approach" class="footer-link">Our approach</a>
			<a href="/community-care#guidelines" class="footer-link">Community guidelines</a>
			<a href="/community-care#moderation" class="footer-link">Moderation</a>
		</div>
		<div class="footer-col">
			<p class="footer-col-head">Dyad</p>
			<a href="/why" class="footer-link">About</a>
			<a href="/join" class="footer-link">Join</a>
			<a href="/impressum" class="footer-link">Impressum</a>
			<a href="/datenschutz" class="footer-link">Privacy</a>
		</div>
	</div>
	<p class="footer-colophon">{copy.landing.zineColophon}</p>
</footer>

<style>
	.zine-footer {
		border-top: 1px solid rgba(240, 236, 230, 0.06);
		padding: 64px 48px 48px;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 40px;
		margin-bottom: 56px;
	}

	.footer-col-head {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.5);
		margin: 0 0 16px;
	}

	.footer-link {
		display: block;
		font-family: var(--font-serif);
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
		font-family: var(--font-mono);
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.15);
		margin: 0;
		border-top: 1px solid rgba(240, 236, 230, 0.04);
		padding-top: 24px;
	}

	@media (max-width: 640px) {
		.zine-footer {
			padding: 40px 20px 40px;
		}
		.footer-grid {
			grid-template-columns: 1fr 1fr;
			gap: 32px;
		}
	}
</style>
