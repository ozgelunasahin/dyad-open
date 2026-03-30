<svelte:head>
	<title>datenschutz - dyad. cultivating a culture of conversation</title>
</svelte:head>

<main class="legal-page">
	<a href="/" class="back-link">
		<svg width="16" height="16" viewBox="0 0 20 20" fill="none" style="vertical-align:middle;margin-right:4px"><path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
		dyad.berlin
	</a>

	<h1>Datenschutzerkl&auml;rung</h1>
	<p class="subtitle">Stand: Februar 2026</p>

	<section>
		<h2>1. Verantwortlicher</h2>
		<p>
			Monad Engineering UG (haftungsbeschr&auml;nkt)<br />
			c/o tuesday coworking<br />
			Belziger Str. 69&ndash;71<br />
			10823 Berlin<br />
			E-Mail: <a href="mailto:hello@dyad.berlin">hello@dyad.berlin</a>
		</p>
	</section>

	<section>
		<h2>2. &Uuml;bersicht der Verarbeitungen</h2>
		<p>
			Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung unserer Webseite
			und unserer Dienste erforderlich ist. Die Verarbeitung erfolgt auf Grundlage der
			DSGVO (Art. 6 Abs. 1).
		</p>
	</section>

	<section>
		<h2>3. Hosting</h2>
		<p>
			Unsere Webseite wird bei Cloudflare, Inc. gehostet. Beim Besuch unserer Seite werden
			automatisch Informationen (Server-Logfiles) erfasst, die Ihr Browser &uuml;bermittelt.
			Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
			zuverl&auml;ssigen Betrieb).
		</p>
	</section>

	<section>
		<h2>4. Datenbank und Authentifizierung</h2>
		<p>
			Wir nutzen Supabase f&uuml;r die Datenspeicherung und Authentifizierung. Bei der
			Registrierung werden E-Mail-Adresse und ggf. weitere Angaben gespeichert.
			Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserf&uuml;llung).
		</p>
	</section>

	<section>
		<h2>5. Cookies und lokale Speicherung</h2>
		<p>
			Wir verwenden technisch notwendige Cookies f&uuml;r die Authentifizierung sowie
			localStorage f&uuml;r Benutzereinstellungen (z.B. Theme-Auswahl). Es werden keine
			Tracking-Cookies eingesetzt.
		</p>
	</section>

	<section>
		<h2>6. Ihre Rechte</h2>
		<p>
			Sie haben das Recht auf Auskunft (&sect; 15 DSGVO), Berichtigung (&sect; 16 DSGVO),
			L&ouml;schung (&sect; 17 DSGVO), Einschr&auml;nkung der Verarbeitung (&sect; 18 DSGVO),
			Daten&uuml;bertragbarkeit (&sect; 20 DSGVO) und Widerspruch (&sect; 21 DSGVO).
		</p>
		<p>
			Zur Aus&uuml;bung Ihrer Rechte wenden Sie sich bitte an:
			<a href="mailto:hello@dyad.berlin">hello@dyad.berlin</a>
		</p>
	</section>

	<section>
		<h2>7. Beschwerderecht</h2>
		<p>
			Sie haben das Recht, sich bei der zust&auml;ndigen Aufsichtsbeh&ouml;rde zu beschweren:<br />
			Berliner Beauftragte f&uuml;r Datenschutz und Informationsfreiheit<br />
			Friedrichstr. 219<br />
			10969 Berlin<br />
			<a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer">www.datenschutz-berlin.de</a>
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
