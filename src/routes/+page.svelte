<svelte:head>
	<title>dyad. cultivating a culture of conversation</title>
	<meta name="description" content="Social civic infrastructure for community bridging in Berlin." />
</svelte:head>

<div class="landing">
	<img src="/images/logo.png" alt="dyad." class="logo" />
	<p class="tagline">cultivating a culture of conversation</p>
	<div class="actions">
		<a href="/login" class="btn">Log in</a>
		<a href="/waitlist" class="btn btn-primary">Join waitlist</a>
	</div>
	<div class="legal">
		<a href="/datenschutz">privacy policy</a>
		<span>|</span>
		<a href="/impressum">legal notice</a>
	</div>
</div>

<style>
	.landing {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 24px;
		text-align: center;
		padding: 24px;
	}

	.logo {
		height: 32px;
		width: auto;
		filter: brightness(0);
	}

	:global([data-theme='dark']) .logo {
		filter: none;
	}

	.tagline {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		color: var(--text-muted, #666);
		margin: 0;
	}

	.actions {
		display: flex;
		gap: 12px;
		margin-top: 8px;
	}

	.btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 24px;
		border-radius: 6px;
		text-decoration: none;
		border: 1px solid var(--text-primary, #1a1a1a);
		color: var(--text-primary, #1a1a1a);
		transition: opacity 0.15s;
	}

	.btn:hover { opacity: 0.7; }

	.btn-primary {
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
	}

	.legal {
		position: absolute;
		bottom: 24px;
		display: flex;
		gap: 8px;
		font-size: 11px;
		color: var(--text-muted, #999);
	}

	.legal a {
		color: var(--text-muted, #999);
		text-decoration: none;
	}

	.legal a:hover { color: var(--text-primary, #1a1a1a); }
	.legal span { color: var(--text-muted, #bbb); }
</style>
