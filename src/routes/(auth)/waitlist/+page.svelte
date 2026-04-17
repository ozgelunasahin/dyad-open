<script lang="ts">
	import CitySearch from '$lib/components/CitySearch.svelte';
	import { copy } from '$lib/copy';

	let name = $state('');
	let email = $state('');
	let basedIn = $state('');
	let freewrite = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let errorMsg = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!email) return;

		if (!freewrite.trim()) {
			errorMsg = copy.waitlist.freewriteRequired;
			status = 'error';
			return;
		}

		// Read referral cookie if present
		const dyadRef = document.cookie.split('; ').find(r => r.startsWith('dyad_ref='))?.split('=')[1];
		const referredByUsername = dyadRef ? decodeURIComponent(dyadRef) : undefined;

		status = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, based_in: basedIn.trim() || undefined, freewrite: freewrite.trim() || undefined, referred_by_username: referredByUsername })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || copy.waitlist.genericError);
			}

			status = 'sent';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : copy.waitlist.genericError;
			status = 'error';
		}
	}
</script>

<svelte:head>
	<title>{copy.waitlist.pageTitle}</title>
</svelte:head>

<div class="auth-card">
	<h1>{copy.waitlist.heading}</h1>
	<p class="subtitle">{copy.waitlist.subtitle}</p>

	{#if status === 'sent'}
		<div class="success-message">{copy.waitlist.successMessage}</div>
	{:else}
		<form onsubmit={handleSubmit}>
			<div class="form-group">
				<label for="freewrite" class="freewrite-label">{copy.waitlist.freewriteLabel}</label>
				<textarea
					id="freewrite"
					placeholder={copy.waitlist.freewritePlaceholder}
					bind:value={freewrite}
					disabled={status === 'sending'}
					maxlength={2000}
					rows={4}
				></textarea>
			</div>
			<div class="form-group">
				<input
					type="text"
					placeholder={copy.waitlist.namePlaceholder}
					bind:value={name}
					disabled={status === 'sending'}
				/>
			</div>
			<div class="form-group">
				<CitySearch bind:value={basedIn} disabled={status === 'sending'} />
			</div>
			<div class="form-group">
				<input
					type="email"
					placeholder={copy.waitlist.emailPlaceholder}
					bind:value={email}
					required
					disabled={status === 'sending'}
				/>
			</div>
			<button type="submit" class="btn-primary btn-primary--block" disabled={status === 'sending'}>
				{status === 'sending' ? copy.waitlist.sending : copy.waitlist.submitCta}
			</button>
			{#if status === 'error'}
				<div class="error-message">{errorMsg}</div>
			{/if}
		</form>
	{/if}
</div>

<style>
	.auth-card {
		width: 100%;
		max-width: 400px;
	}

	h1 {
		margin: 0 0 var(--space-2) 0;
		font-size: var(--text-3xl);
		font-weight: 300;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0 0 var(--space-6) 0;
		color: var(--text-muted);
		font-size: var(--text-md);
	}

	.success-message {
		background: color-mix(in srgb, var(--color-success) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
		color: var(--color-success);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-input);
		font-size: var(--text-base);
	}

	.error-message {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
		color: var(--color-danger);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-input);
		margin-top: var(--space-4);
		font-size: var(--text-base);
	}

	.form-group {
		margin-bottom: var(--space-5);
	}

	.freewrite-label {
		display: block;
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-bottom: var(--space-1);
		font-style: italic;
	}

	textarea {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
		color: var(--text-primary);
		resize: vertical;
		line-height: 1.5;
		box-sizing: border-box;
		transition: border-color 0.2s;
		font-family: inherit;
	}

	textarea:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	textarea::placeholder {
		color: var(--text-muted);
	}

	textarea:disabled {
		opacity: var(--opacity-disabled);
	}

	input {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-size: var(--text-lg);
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	input:disabled {
		opacity: var(--opacity-disabled);
		cursor: not-allowed;
	}

	/* .btn-primary / .btn-primary--block live in shared.css */
</style>
