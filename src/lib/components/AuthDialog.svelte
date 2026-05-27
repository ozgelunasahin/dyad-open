<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { copy } from '$lib/copy';
	import { capture } from '$lib/analytics';
	import CitySearch from '$lib/components/CitySearch.svelte';

	interface Props {
		mode?: 'waitlist' | 'login';
	}

	let { mode: initialMode = 'waitlist' }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | undefined>();
	let currentMode = $state(initialMode);
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	// Waitlist fields
	let freewrite = $state('');
	let name = $state('');
	let city = $state('');
	let email = $state('');
	let referralSource = $state('');
	let referralOther = $state('');
	let newsletterConsent = $state(false);

	// Login fields
	let loginEmail = $state('');
	let loginPassword = $state('');

	export function show(mode: 'waitlist' | 'login' = 'waitlist') {
		currentMode = mode;
		error = '';
		success = false;
		loading = false;
		dialogEl?.showModal();
	}

	function hide() {
		dialogEl?.close();
	}

	function switchMode(mode: 'waitlist' | 'login') {
		currentMode = mode;
		error = '';
		success = false;
	}

	async function submitWaitlist() {
		if (!freewrite.trim() || !email.trim()) return;
		loading = true;
		error = '';

		// Read referral cookie
		const dyadRef = document.cookie.split('; ').find(r => r.startsWith('dyad_ref='))?.split('=')[1];

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					name: name.trim() || undefined,
					based_in: city.trim() || undefined,
					freewrite: freewrite.trim(),
					referral_source: referralSource === 'other' ? (referralOther.trim() || 'other') : (referralSource || undefined),
					referred_by_username: dyadRef || undefined
				})
			});

			if (res.ok) {
				success = true;
				capture('waitlist_joined', { referred_by: dyadRef || null });
				if (newsletterConsent) {
					fetch('/api/newsletter', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email: email.trim(), consent: true, source: 'waitlist' })
					}).catch(() => { /* non-critical */ });
				}
			} else if (res.status === 409) {
				success = true; // Already on waitlist — show friendly message
				error = 'already';
			} else {
				const data = await res.json().catch(() => ({}));
				error = (data as any).error ?? copy.auth.somethingWentWrong;
			}
		} catch {
			error = copy.common.networkError;
		} finally {
			loading = false;
		}
	}

	function handleLoginEnhance() {
		loading = true;
		error = '';
		return async ({ result }: { result: { type: string; location?: string; data?: Record<string, unknown>; error?: Error } }) => {
			loading = false;
			if (result.type === 'redirect') {
				hide();
				await goto(result.location!, { invalidateAll: true });
			} else if (result.type === 'failure') {
				error = (result.data?.error as string) ?? 'Login failed';
			} else if (result.type === 'error') {
				error = result.error?.message ?? copy.auth.somethingWentWrong;
			}
		};
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	class="auth-dialog"
	aria-labelledby="auth-dialog-title"
	onclick={(e) => { if (e.target === dialogEl) hide(); }}
	onkeydown={(e) => { if (e.key === 'Escape') hide(); }}
>
	<div class="dialog-content">
		<button class="close-btn" onclick={hide} aria-label="Close">&times;</button>

		{#if currentMode === 'waitlist'}
			<h2 id="auth-dialog-title" class="dialog-title">{copy.waitlist.joinWaitlist}</h2>

			{#if success}
				<div class="success-message">
					{#if error === 'already'}
						<p>{copy.waitlist.alreadyOnWaitlist}</p>
					{:else}
						<p>{copy.waitlist.thanksForJoining}</p>
					{/if}
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); submitWaitlist(); }}>
					<label class="field">
						<span class="field-label">{copy.waitlist.whatsOnYourMind}</span>
						<textarea
							bind:value={freewrite}
							rows={3}
							required
							maxlength={2000}
							placeholder={copy.waitlist.thoughtPlaceholder}
						></textarea>
					</label>

					<label class="field">
						<span class="field-label">{copy.auth.email} *</span>
						<input
							type="email"
							bind:value={email}
							required
							placeholder="you@example.com"
							autocomplete="email"
							autocapitalize="off"
							autocorrect="off"
							spellcheck="false"
						/>
					</label>

					<label class="field">
						<span class="field-label">{copy.auth.name}</span>
						<input
							type="text"
							bind:value={name}
							maxlength={200}
							placeholder="Optional"
							autocomplete="name"
						/>
					</label>

					<label class="field">
						<span class="field-label">{copy.waitlist.city}</span>
						<CitySearch bind:value={city} placeholder={copy.waitlist.selectCity} />
						<p class="city-note">{copy.waitlist.cityExpansionNote}</p>
					</label>

					<div class="referral-field">
						<span class="referral-label">{copy.waitlist.referralLabel}</span>
						<span class="referral-note">{copy.waitlist.referralNote}</span>
						<select bind:value={referralSource} class="referral-select">
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
								maxlength={200}
							/>
						{/if}
					</div>

					<label class="newsletter-consent">
						<input type="checkbox" bind:checked={newsletterConsent} />
						<span>Subscribe to the Dyad newsletter on Substack.</span>
					</label>

					{#if error && error !== 'already'}
						<p class="error-msg">{error}</p>
					{/if}

					<button class="btn-primary btn-primary--block" type="submit" disabled={loading || !freewrite.trim() || !email.trim()}>
						{loading ? copy.waitlist.sendingWaitlist : copy.waitlist.joinWaitlistButton}
					</button>
				</form>

				<p class="mode-switch">
					{copy.auth.alreadyHaveAccount} <button class="link-btn" onclick={() => switchMode('login')}>{copy.auth.logIn}</button>
				</p>
			{/if}

		{:else}
			<h2 id="auth-dialog-title" class="dialog-title">{copy.auth.logIn}</h2>

			<form method="POST" action="/login?/login" use:enhance={handleLoginEnhance}>
				<label class="field">
					<span class="field-label">{copy.auth.email}</span>
					<input
						type="email"
						name="email"
						bind:value={loginEmail}
						required
						autocomplete="email"
						autocapitalize="off"
						autocorrect="off"
						spellcheck="false"
					/>
				</label>

				<label class="field">
					<span class="field-label">{copy.auth.password}</span>
					<input
						type="password"
						name="password"
						bind:value={loginPassword}
						required
						autocomplete="current-password"
					/>
				</label>

				{#if error}
					<p class="error-msg">{error}</p>
				{/if}

				<button class="btn-primary btn-primary--block" type="submit" disabled={loading}>
					{loading ? copy.auth.loggingIn : copy.auth.logIn}
				</button>
			</form>

			<p class="mode-switch">
				<a href="/login?mode=reset" class="link-btn" onclick={hide}>{copy.auth.forgotPassword}</a>
			</p>
			<p class="mode-switch">
				{copy.auth.dontHaveAccount} <button class="link-btn" onclick={() => switchMode('waitlist')}>{copy.auth.join}</button>
			</p>
		{/if}
	</div>
</dialog>

<style>
	.auth-dialog {
		border: none;
		border-radius: var(--radius-card);
		padding: 0;
		max-width: 420px;
		width: calc(100% - var(--space-8));
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	.auth-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	.dialog-content {
		padding: var(--space-8) var(--space-6);
		position: relative;
	}

	.close-btn {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		background: none;
		border: none;
		font-size: var(--text-2xl);
		color: var(--text-muted);
		cursor: pointer;
		line-height: 1;
		padding: var(--space-1);
	}
	.close-btn:hover { color: var(--text-primary); }

	.dialog-title {
		font-size: var(--text-xl);
		font-weight: 500;
		margin: 0 0 var(--space-6);
	}

	.field {
		display: block;
		margin-bottom: var(--space-4);
	}

	.field-label {
		display: block;
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-bottom: var(--space-1);
	}

	.field input, .field textarea {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.field input:focus, .field textarea:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.field textarea { resize: vertical; line-height: var(--leading-relaxed); }

	.city-select {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
		cursor: pointer;
	}
	.city-select:focus { outline: none; border-color: var(--text-muted); }

	.city-note {
		margin: var(--space-2) 0 0;
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: 1.5;
	}

	.referral-field {
		background: color-mix(in srgb, var(--color-accent, #c8c2b6) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent, #c8c2b6) 30%, transparent);
		border-radius: var(--radius-input);
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-4);
	}

	.referral-label {
		display: block;
		font-size: var(--text-sm);
		color: var(--text-primary);
		font-weight: 500;
		margin-bottom: var(--space-1);
	}

	.referral-note {
		display: block;
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin-bottom: var(--space-3);
		line-height: 1.5;
	}

	.referral-select {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
		cursor: pointer;
	}

	.referral-select:focus { outline: none; border-color: var(--text-muted); }

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

	.referral-other:focus { outline: none; border-color: var(--text-muted); }

	.newsletter-consent {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		cursor: pointer;
		margin-bottom: var(--space-4);
	}

	.newsletter-consent input[type='checkbox'] {
		margin-top: 3px;
		flex-shrink: 0;
		cursor: pointer;
	}

	.newsletter-consent span {
		font-size: var(--text-sm);
		color: var(--text-muted);
		line-height: 1.5;
	}

	.error-msg {
		font-size: var(--text-sm);
		color: var(--color-danger);
		margin: 0 0 var(--space-3);
	}

	.success-message {
		font-size: var(--text-md);
		line-height: var(--leading-relaxed);
		padding: var(--space-4) 0;
	}

	.success-message p { margin: 0; }

	/* .btn-primary / .btn-primary--block live in shared.css */

	.mode-switch {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-align: center;
		margin: var(--space-4) 0 0;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--text-link);
		cursor: pointer;
		font-size: inherit;
		padding: 0;
		text-decoration: underline;
	}

	a.link-btn { text-decoration: underline; }
</style>
