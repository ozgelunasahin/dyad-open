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

{#if data.navItems && data.navItems.length > 0}
	<WebsiteContainer
		author={data.author ?? ''}
		navItems={data.navItems}
		currentItem={data.currentSection ?? undefined}
		baseUrl="/"
		useQueryParam={true}
	>
		{#if data.canvasUrl}
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
		{:else if data.currentPage}
			<div class="page-content">
				<div class="splash">
					<h1 class="splash-logo">dyad.berlin</h1>
					<p class="splash-tagline">Social civic infrastructure for Berlin</p>

					<div class="splash-signup">
						{#if contactStatus === 'sent'}
							<p class="contact-thanks">Thanks — we'll be in touch.</p>
						{:else}
							<form class="contact-form" onsubmit={handleContactSubmit}>
								<input type="text" bind:value={contactName} placeholder="Name" class="contact-input" />
								<input type="email" bind:value={contactEmail} placeholder="Email" required class="contact-input" />
								<button type="submit" class="contact-btn" disabled={contactStatus === 'sending'}>
									{contactStatus === 'sending' ? 'Sending...' : 'Stay in touch'}
								</button>
							</form>
							{#if contactStatus === 'error'}
								<p class="contact-error">Something went wrong. Please try again.</p>
							{/if}
						{/if}
					</div>
				</div>

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
			</div>
		{/if}
	</WebsiteContainer>
{:else}
	<!-- Fallback when no site configured -->
	<div class="fallback">
		<h1 class="splash-logo">dyad.berlin</h1>
		<p class="splash-tagline">Social civic infrastructure for Berlin</p>
		<div class="splash-signup">
			<form class="contact-form" onsubmit={handleContactSubmit}>
				<input type="text" bind:value={contactName} placeholder="Name" class="contact-input" />
				<input type="email" bind:value={contactEmail} placeholder="Email" required class="contact-input" />
				<button type="submit" class="contact-btn" disabled={contactStatus === 'sending'}>
					{contactStatus === 'sending' ? 'Sending...' : 'Stay in touch'}
				</button>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Canvas iframe */
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

	/* Page content (splash) */
	.page-content {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-canvas);
		position: relative;
	}

	.splash {
		text-align: center;
		max-width: 400px;
		padding: 2rem;
	}

	.splash-logo {
		font-family: 'Georgia', serif;
		font-size: 2.5rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 0.75rem 0;
	}

	.splash-tagline {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin: 0 0 2.5rem 0;
		line-height: 1.5;
	}

	.splash-signup {
		width: 100%;
	}

	/* Contact form */
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

	/* Theme toggle */
	.theme-toggle {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		background: var(--bg-control);
		cursor: pointer;
		color: var(--control-color);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		opacity: 0.4;
		z-index: 100;
	}

	.theme-toggle:hover {
		background: var(--bg-control-hover);
		color: var(--control-color-hover);
		opacity: 1;
	}

	/* Fallback */
	.fallback {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg-canvas);
		color: var(--text-primary);
		padding: 2rem;
	}

	.fallback .splash-signup {
		max-width: 400px;
	}
</style>
