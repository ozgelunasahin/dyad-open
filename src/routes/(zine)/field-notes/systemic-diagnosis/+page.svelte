<svelte:head>
	<title>A systemic diagnosis — Field Notes — dyad.</title>
</svelte:head>

<div class="essay-page">
	<div class="essay-nav">
		<a href="/field-notes" class="back">← field notes</a>
	</div>

	<article class="article">
		<div class="article-header">
			<p class="article-section">Problem</p>
			<h1 class="article-title">A systemic diagnosis</h1>
			<p class="article-byline">June 2026</p>
		</div>

		<div class="article-body">
			<p>Thirty years into the internet era, we find ourselves at a crossroads. The harms of the incumbent social technology companies are experienced, witnessed, and documented widely. Yet a credible plan for what comes next remains elusive.</p>

			<p>Climate online has grown increasingly commodified, and hostile. The desire to connect and exchange, once held as the emancipatory promise of the World Wide Web, is now met by systems that capture and translate our lives into data, extracting from our relationships, expressions, and attention in ways that mirror colonial patterns of appropriation. For many of us, the internet has become a source of stress, overwhelm, and exhaustion. These harms continue to fall disproportionately on already marginalized communities, but their consequences reach all of society.</p>

			<p>The scale and scope of the harm is difficult to overstate. From loneliness and declining mental health, to information warfare, political polarization, the erosion of trust in institutions, and democratic instability, the effects of opaque and self-serving social technology corporations' operations increasingly reach far beyond the screen.</p>

			<p>They are working exactly as they were built to work. With the identification of behavioral data as the new frontier of untapped resource, and the intricate ways to mine, repurpose, and sell that data available, these platforms modified themselves from social technologies for those who use them to surveillance machinery that profits from prediction, attention capture, and eventually, behavioral influence.</p>

			<blockquote>The problem with the status quo of social technologies is systemic, and so must be the response.</blockquote>

			<p>We are therefore not interested in one-off interventions, nor in building a gentler interface on top of the same underlying logic. Our approach here is to surface what is least seen. Who owns the platforms we meet on? What incentives does that ownership create? What kinds of design decisions follow from those incentives? What behaviors do those designs reward, distort, or make more likely? Who benefits from the system as it runs now? Who is harmed by it? Who can inspect its workings, contest its decisions, and shape it back?</p>

			<p>Looking at previous struggles for liberation, justice, and democratic participation, we find a common lesson. Durable change begins with understanding the forces that give rise to a problem and continue to sustain it. It is to those forces that we now turn.</p>
		</div>
	</article>
</div>

<style>
	.essay-page {
		max-width: 680px;
		margin: 0 auto;
		padding: 48px 48px 120px;
	}

	.essay-nav { margin-bottom: 48px; }

	.back {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.3);
		text-decoration: none;
		transition: color 0.15s;
	}

	.back:hover { color: rgba(240, 236, 230, 0.7); }

	.article-header {
		margin-bottom: 48px;
		padding-bottom: 36px;
		border-bottom: 1px solid rgba(240, 236, 230, 0.07);
	}

	.article-section {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.28);
		margin: 0 0 16px;
	}

	.article-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: clamp(1.8rem, 4vw, 2.8rem);
		font-weight: 400;
		color: rgba(240, 236, 230, 0.92);
		margin: 0 0 16px;
		line-height: 1.15;
		letter-spacing: -0.02em;
	}

	.article-byline {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.22);
		margin: 0;
	}

	.article-body p {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.05rem;
		font-weight: 300;
		color: rgba(240, 236, 230, 0.65);
		line-height: 1.8;
		margin: 0 0 24px;
	}

	.article-body blockquote {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.15rem;
		font-weight: 400;
		font-style: italic;
		color: rgba(240, 236, 230, 0.55);
		border-left: 2px solid rgba(240, 236, 230, 0.12);
		margin: 36px 0;
		padding: 4px 0 4px 24px;
		line-height: 1.65;
	}

	@media (max-width: 640px) {
		.essay-page { padding: 32px 20px 80px; }
	}
</style>
