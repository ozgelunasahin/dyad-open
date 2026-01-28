<script lang="ts">
	import { fade } from 'svelte/transition';
	import { themeStore } from '$lib/stores/theme.svelte';
	import WebsiteContainer from '$lib/components/WebsiteContainer.svelte';

	let { data } = $props();

	let iframeLoading = $state(true);
	let contactStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let contactEmail = $state('');
	let contactName = $state('');

	$effect(() => {
		data.canvasUrl;
		iframeLoading = true;
	});

	function handleIframeLoad() {
		iframeLoading = false;
	}

	async function handleContactSubmit(event: SubmitEvent) {
		event.preventDefault();
		contactStatus = 'sending';

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: contactEmail, name: contactName })
			});

			if (res.ok) {
				contactStatus = 'sent';
				contactEmail = '';
				contactName = '';
			} else {
				contactStatus = 'error';
			}
		} catch {
			contactStatus = 'error';
		}
	}
</script>

<svelte:head>
	<title>dyad.berlin — social civic infrastructure</title>
	<meta name="description" content="Social civic infrastructure for community bridging in Berlin." />
</svelte:head>

<div class="landing">
	<!-- Header -->
	<header class="header">
		<a href="/" class="logo">dyad.berlin</a>
		<nav class="nav-links">
			<button class="theme-toggle" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
				{#if themeStore.current === 'light'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
						<path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				{/if}
			</button>
		</nav>
	</header>

	<!-- Hero -->
	<section class="hero">
		<h1>Social civic infrastructure for Berlin</h1>
		<p class="subtitle">
			Community bridging through events, research, and shared practice.
		</p>
	</section>

	<!-- Canvas Content -->
	{#if data.canvasUrl && data.siteCanvases.length > 0}
		<section class="content">
			<WebsiteContainer
				author={data.author}
				canvases={data.siteCanvases}
				currentCanvas={data.currentCanvas}
				baseUrl="/"
			useQueryParam={true}
			>
				<div class="iframe-wrapper">
					{#if iframeLoading}
						<div class="iframe-loading" out:fade={{ duration: 200 }}></div>
					{/if}
					<iframe
						src={data.canvasUrl}
						title="Content"
						class="canvas-iframe"
						onload={handleIframeLoad}
					></iframe>
				</div>
			</WebsiteContainer>
		</section>
	{/if}

	<!-- Stay in Touch -->
	<section class="contact">
		<h2>Stay in touch</h2>
		{#if contactStatus === 'sent'}
			<p class="contact-thanks">Thanks — we'll be in touch.</p>
		{:else}
			<form class="contact-form" onsubmit={handleContactSubmit}>
				<input
					type="text"
					bind:value={contactName}
					placeholder="Name"
					class="contact-input"
				/>
				<input
					type="email"
					bind:value={contactEmail}
					placeholder="Email"
					required
					class="contact-input"
				/>
				<button type="submit" class="contact-btn" disabled={contactStatus === 'sending'}>
					{contactStatus === 'sending' ? 'Sending...' : 'Submit'}
				</button>
			</form>
			{#if contactStatus === 'error'}
				<p class="contact-error">Something went wrong. Please try again.</p>
			{/if}
		{/if}
	</section>

	<!-- Footer -->
	<footer class="footer">
		<span>Berlin</span>
		<span class="footer-sep">·</span>
		<a href="mailto:hello@dyad.berlin">hello@dyad.berlin</a>
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	/* Header */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		max-width: 1000px;
		width: 100%;
		margin: 0 auto;
	}

	.logo {
		font-family: 'Georgia', serif;
		font-size: 1.25rem;
		color: var(--text-primary);
		text-decoration: none;
	}

	.nav-links {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.theme-toggle {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: var(--bg-control);
		cursor: pointer;
		color: var(--control-color);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		opacity: 0.4;
	}

	.theme-toggle:hover {
		background: var(--bg-control-hover);
		color: var(--control-color-hover);
		opacity: 1;
	}

	/* Hero */
	.hero {
		max-width: 700px;
		margin: 0 auto;
		padding: 4rem 2rem 3rem;
		text-align: center;
	}

	.hero h1 {
		font-family: 'Georgia', serif;
		font-size: 2.25rem;
		font-weight: normal;
		line-height: 1.3;
		margin: 0 0 1rem 0;
	}

	.subtitle {
		font-size: 1.1rem;
		line-height: 1.6;
		color: var(--text-muted);
		margin: 0;
	}

	/* Canvas content */
	.content {
		flex: 1;
		min-height: 70vh;
	}

	.iframe-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.iframe-loading {
		position: absolute;
		inset: 0;
		background: var(--bg-canvas);
		z-index: 1;
	}

	.canvas-iframe {
		width: 100%;
		height: 100%;
		border: none;
	}

	/* Contact */
	.contact {
		max-width: 500px;
		margin: 0 auto;
		padding: 4rem 2rem;
		text-align: center;
	}

	.contact h2 {
		font-family: 'Georgia', serif;
		font-size: 1.5rem;
		font-weight: normal;
		margin: 0 0 1.5rem 0;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.contact-input {
		padding: 0.75rem 1rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-canvas);
		color: var(--text-primary);
		font-size: 1rem;
		font-family: inherit;
	}

	.contact-input:focus {
		outline: none;
		border-color: var(--text-link);
	}

	.contact-btn {
		padding: 0.75rem 1.5rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.contact-btn:hover {
		opacity: 0.9;
	}

	.contact-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.contact-thanks {
		color: var(--text-muted);
		font-style: italic;
	}

	.contact-error {
		color: #dc2626;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	/* Footer */
	.footer {
		padding: 2rem;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.footer a {
		color: var(--text-muted);
		text-decoration: none;
	}

	.footer a:hover {
		color: var(--text-primary);
	}

	.footer-sep {
		margin: 0 0.5rem;
	}

	@media (max-width: 600px) {
		.hero h1 {
			font-size: 1.75rem;
		}

		.hero {
			padding: 2rem 1.5rem;
		}
	}
</style>
