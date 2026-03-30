<svelte:head>
	<title>impressum - dyad. cultivating a culture of conversation</title>
</svelte:head>

<main class="legal-page">
	<a href="/" class="back-link">
		<svg width="16" height="16" viewBox="0 0 20 20" fill="none" style="vertical-align:middle;margin-right:4px"><path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
		dyad.berlin
	</a>

	<h1>Impressum</h1>
	<p class="subtitle">Angaben gem&auml;&szlig; &sect; 5 DDG</p>

	<section>
		<h2>Betreiber</h2>
		<p>
			Monad Engineering UG (haftungsbeschr&auml;nkt)<br />
			c/o tuesday coworking<br />
			Belziger Str. 69&ndash;71<br />
			10823 Berlin<br />
			Deutschland
		</p>
	</section>

	<section>
		<h2>Vertreten durch</h2>
		<p>Gesch&auml;ftsf&uuml;hrerin: &Ouml;zge Sahin</p>
	</section>

	<section>
		<h2>Handelsregister</h2>
		<p>
			Amtsgericht Charlottenburg<br />
			HRB XXXXX
		</p>
	</section>

	<section>
		<h2>Kontakt</h2>
		<p>
			E-Mail: <a href="mailto:hello@dyad.berlin">hello@dyad.berlin</a>
		</p>
	</section>

	<section>
		<h2>Umsatzsteuer-ID</h2>
		<p>
			Umsatzsteuer-Identifikationsnummer gem&auml;&szlig; &sect; 27a UStG:<br />
			DE XXXXXXXXX
		</p>
	</section>

	<section>
		<h2>Verantwortlich f&uuml;r den Inhalt nach &sect; 18 Abs. 2 MStV</h2>
		<p>
			&Ouml;zge Sahin<br />
			c/o tuesday coworking<br />
			Belziger Str. 69&ndash;71<br />
			10823 Berlin
		</p>
	</section>

	<section>
		<h2>Haftungsausschluss</h2>

		<h3>Haftung f&uuml;r Inhalte</h3>
		<p>
			Die Inhalte unserer Seiten wurden mit gr&ouml;&szlig;ter Sorgfalt erstellt. F&uuml;r die
			Richtigkeit, Vollst&auml;ndigkeit und Aktualit&auml;t der Inhalte k&ouml;nnen wir jedoch
			keine Gew&auml;hr &uuml;bernehmen.
		</p>

		<h3>Haftung f&uuml;r Links</h3>
		<p>
			Unser Angebot enth&auml;lt Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen
			Einfluss haben. F&uuml;r die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
			verantwortlich.
		</p>
	</section>
</main>

<style>
	:global(body) {
		overflow: auto !important;
	}

	.legal-page {
		max-width: var(--content-narrow);
		margin: 0 auto;
		padding: 80px var(--space-6) 120px;

		font-size: var(--text-lg);
		line-height: var(--leading-relaxed);
		color: var(--text-secondary);
	}

	.back-link {
		display: inline-block;
		margin-bottom: 48px;
		font-size: var(--text-base);
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--text-primary);
	}

	h1 {
		font-size: var(--text-3xl);
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 var(--space-2);
	}

	.subtitle {
		font-size: var(--text-base);
		color: var(--text-muted);
		margin: 0 0 48px;
	}

	h2 {
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text-primary);
		margin: var(--space-8) 0 var(--space-2);
	}

	h3 {
		font-size: var(--text-md);
		font-weight: 500;
		color: var(--text-primary);
		margin: var(--space-6) 0 var(--space-1);
	}

	section {
		margin-bottom: var(--space-2);
	}

	p {
		margin: 0 0 var(--space-2);
	}

	a {
		color: var(--text-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a:hover {
		color: var(--text-primary);
	}
</style>
