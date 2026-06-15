<svelte:head>
	<title>Field Notes — dyad.</title>
	<meta name="description" content="Field notes on building social technology as civic infrastructure." />
</svelte:head>

<div class="page">
	<div class="page-intro">
		<p class="issue-label">Draft Edition · June 2026</p>
		<h1 class="page-title">Field Notes</h1>
		<p class="page-subtitle">Field notes on building social technology as civic infrastructure.</p>
	</div>

	<div class="grid">

		<a href="/field-notes/embedding-care" class="card">
			<div class="card-image"></div>
			<div class="card-body">
				<p class="card-section">Introduction</p>
				<h2 class="card-title">Embedding care into the infrastructure</h2>
				<p class="card-teaser">Dyad began from a state of disillusionment that came through my own experience with harassment online, and with the strange powerlessness I mistook, at first, as personal.</p>
				<p class="card-meta">Luna Sahin · June 2026</p>
			</div>
		</a>

		<a href="/field-notes/systemic-diagnosis" class="card">
			<div class="card-image"></div>
			<div class="card-body">
				<p class="card-section">Problem</p>
				<h2 class="card-title">A systemic diagnosis</h2>
				<p class="card-teaser">Thirty years into the internet era, we find ourselves at a crossroads. The harms of the incumbent social technology companies are experienced, witnessed, and documented widely.</p>
				<p class="card-meta">June 2026</p>
			</div>
		</a>

		<a href="/field-notes/why-ownership-matters" class="card">
			<div class="card-image"></div>
			<div class="card-body">
				<p class="card-section">Steward Ownership</p>
				<h2 class="card-title">Why ownership matters</h2>
				<p class="card-teaser">Every company eventually faces the same question: Whose interests are represented in decision making when tradeoffs arise? Ownership answers this at the deepest level.</p>
				<p class="card-meta">June 2026</p>
			</div>
		</a>

		<a href="/field-notes/community-experiment" class="card">
			<div class="card-image"></div>
			<div class="card-body">
				<p class="card-section">Governance</p>
				<h2 class="card-title">Community building as a social experiment</h2>
				<p class="card-teaser">Our lived experiences organizing as communities for different intentions have presented us a valuable view of community building. We see communities as microcosms of society.</p>
				<p class="card-meta">June 2026</p>
			</div>
		</a>

		<a href="/field-notes/holding-space" class="card">
			<div class="card-image"></div>
			<div class="card-body">
				<p class="card-section">Community Care</p>
				<h2 class="card-title">Holding space online</h2>
				<p class="card-teaser">The places where we meet others online are part of public life. They may not look like streets, libraries, or community spaces, but they increasingly serve similar functions.</p>
				<p class="card-meta">June 2026</p>
			</div>
		</a>

	</div>
</div>

<style>
	.page {
		padding: 48px 48px 120px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-intro {
		margin-bottom: 56px;
		padding-bottom: 40px;
		border-bottom: 1px solid rgba(240, 236, 230, 0.07);
	}

	.issue-label {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.28);
		margin: 0 0 16px;
	}

	.page-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: 400;
		color: rgba(240, 236, 230, 0.92);
		margin: 0 0 12px;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.page-subtitle {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 300;
		font-style: italic;
		color: rgba(240, 236, 230, 0.38);
		margin: 0;
		line-height: 1.6;
	}

	/* ── Grid ── */
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 32px;
	}

	/* ── Card ── */
	.card {
		display: flex;
		flex-direction: column;
		gap: 16px;
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}

	.card:hover { opacity: 0.7; }

	.card-image {
		width: 100%;
		aspect-ratio: 3 / 4;
		background: rgba(240, 236, 230, 0.04);
		border: 1px solid rgba(240, 236, 230, 0.06);
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.card-section {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.28);
		margin: 0;
	}

	.card-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.1rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.88);
		margin: 0;
		line-height: 1.3;
		letter-spacing: -0.01em;
	}

	.card-teaser {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.85rem;
		font-weight: 300;
		color: rgba(240, 236, 230, 0.42);
		margin: 4px 0 0;
		line-height: 1.65;
	}

	.card-meta {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.2);
		margin: 4px 0 0;
	}

	@media (max-width: 900px) {
		.grid { grid-template-columns: repeat(2, 1fr); }
	}

	@media (max-width: 560px) {
		.page { padding: 32px 20px 80px; }
		.grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
		.card-image { aspect-ratio: 3 / 4; }
		.card-title { font-size: 0.9rem; }
		.card-teaser { display: none; }
	}
</style>
