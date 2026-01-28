<script lang="ts">
	import type { Card } from '$lib/types';

	interface Props {
		card: Card;
		sectionType: 'hero' | 'contact';
	}

	let { card, sectionType }: Props = $props();

	// Contact form state
	let contactStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let contactEmail = $state('');
	let contactName = $state('');

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

<foreignObject
	data-note-id={card.id}
	x={card.position.x}
	y={card.position.y}
	width={card.dimensions.width}
	height={card.dimensions.height}
	class="section-card-container"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		xmlns="http://www.w3.org/1999/xhtml"
		class="section-card"
		onpointerdown={(e) => e.stopPropagation()}
	>
		{#if sectionType === 'hero'}
			<div class="hero-content">
				<h1 class="hero-title">{card.note.title}</h1>
				{#if card.note.content?.content?.[0]?.content?.[0]?.text}
					<p class="hero-tagline">{card.note.content.content[0].content[0].text}</p>
				{/if}
			</div>
		{:else if sectionType === 'contact'}
			<div class="contact-content">
				<h2 class="contact-title">{card.note.title}</h2>
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
						<p class="contact-error">Something went wrong.</p>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</foreignObject>

<style>
	.section-card-container {
		overflow: visible;
	}

	.section-card {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Hero */
	.hero-content {
		text-align: center;
		max-width: 100%;
		padding: 2rem 1rem;
	}

	.hero-title {
		font-family: 'Georgia', serif;
		font-size: 2.5rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 0.75rem 0;
	}

	.hero-tagline {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	/* Contact */
	.contact-content {
		width: 100%;
		max-width: 400px;
		padding: 2rem 1rem;
	}

	.contact-title {
		font-family: 'Georgia', serif;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 1.5rem 0;
		text-align: center;
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
	}

	.contact-btn:disabled {
		opacity: 0.5;
	}

	.contact-thanks {
		color: var(--text-muted);
		font-style: italic;
		text-align: center;
	}

	.contact-error {
		color: #dc2626;
		font-size: 0.9rem;
		margin-top: 0.5rem;
		text-align: center;
	}
</style>
