<script lang="ts">
	import { copy } from '$lib/copy';
	import CitySearch from '$lib/components/CitySearch.svelte';

	let name = $state('');
	let email = $state('');
	let basedIn = $state('');
	let freewrite = $state('');
	let referralSource = $state('');
	let referralOther = $state('');
	let newsletterConsent = $state(false);
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

		const dyadRef = document.cookie.split('; ').find(r => r.startsWith('dyad_ref='))?.split('=')[1];
		const referredByUsername = dyadRef ? decodeURIComponent(dyadRef) : undefined;

		status = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					name: name.trim() || undefined,
					based_in: basedIn || undefined,
					freewrite: freewrite.trim() || undefined,
					referral_source: referralSource === 'other' ? (referralOther.trim() || 'other') : (referralSource || undefined),
					referred_by_username: referredByUsername
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || copy.waitlist.genericError);
			}

			status = 'sent';

			if (newsletterConsent) {
				fetch('/api/newsletter', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: email.trim(), consent: true })
				}).catch(() => {});
			}
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
				<CitySearch bind:value={basedIn} disabled={status === 'sending'} placeholder={copy.waitlist.cityPlaceholder} />
			</div>

			<div class="form-group referral-group">
				<label for="referral" class="referral-label">
					{copy.waitlist.referralLabel}
					<span class="referral-note">{copy.waitlist.referralNote}</span>
				</label>
				<select id="referral" bind:value={referralSource} disabled={status === 'sending'}>
					<option value="" disabled selected>Select one</option>
					{#each copy.waitlist.referralOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
				{#if referralSource === 'other'}
					<input
						type="text"
						class="referral-other"
						placeholder="Please tell us more"
						bind:value={referralOther}
						disabled={status === 'sending'}
						maxlength={200}
					/>
				{/if}
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

			<label class="newsletter-consent">
				<input
					type="checkbox"
					bind:checked={newsletterConsent}
					disabled={status === 'sending'}
				/>
				<span>Subscribe me to the Dyad newsletter on Substack.</span>
			</label>

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
		font-size: var(--text-md);
		color: var(--text-muted);
		margin-bottom: var(--space-4);
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

	input[type='text'],
	input[type='email'] {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-size: var(--text-lg);
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	input[type='text']:focus,
	input[type='email']:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	input[type='text']:disabled,
	input[type='email']:disabled {
		opacity: var(--opacity-disabled);
		cursor: not-allowed;
	}

	select {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-size: var(--text-base);
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-3) center;
		padding-right: var(--space-8);
		cursor: pointer;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	select:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	select:disabled {
		opacity: var(--opacity-disabled);
		cursor: not-allowed;
	}

	.referral-group {
		background: color-mix(in srgb, var(--color-accent, #c8c2b6) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent, #c8c2b6) 30%, transparent);
		border-radius: var(--radius-input);
		padding: var(--space-4);
		margin-bottom: var(--space-5);
	}

	.referral-label {
		display: block;
		font-size: var(--text-base);
		color: var(--text-primary);
		font-weight: 500;
		margin-bottom: var(--space-2);
	}

	.referral-other {
		width: 100%;
		margin-top: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-size: var(--text-sm);
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.referral-other:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.referral-note {
		display: block;
		font-size: var(--text-sm);
		color: var(--text-muted);
		font-weight: 400;
		margin-bottom: var(--space-3);
		line-height: 1.5;
	}

	.newsletter-consent {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		cursor: pointer;
		margin-bottom: var(--space-5);
	}

	.newsletter-consent input[type='checkbox'] {
		width: auto;
		margin-top: 3px;
		flex-shrink: 0;
		cursor: pointer;
	}

	.newsletter-consent span {
		font-size: var(--text-sm);
		color: var(--text-muted);
		line-height: 1.5;
	}
</style>
