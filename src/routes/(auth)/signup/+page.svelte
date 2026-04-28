<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	// svelte-ignore state_referenced_locally
	let username = $state(form?.username ?? '');

	const checkEmail = $derived((form as any)?.checkEmail === true);
	const verifyEmail = $derived((form as any)?.email as string | undefined);
	const verifyError = $derived((form as any)?.verifyError as string | undefined);

	// Preserve the referral context across the OTP round-trip. After the
	// signup POST the URL keeps any `?ref=` param, so reading from page.url
	// here is resilient to refreshes and cross-checks data.ref.
	const startOverHref = $derived.by(() => {
		const params = new URLSearchParams();
		const ref = page.url.searchParams.get('ref') ?? data.ref ?? '';
		if (ref) params.set('ref', ref);
		const qs = params.toString();
		return qs ? `/signup?${qs}` : '/signup';
	});

	// 6 individual digit inputs
	let digits = $state(['', '', '', '', '', '']);
	let inputRefs: HTMLInputElement[] = [];

	const otp = $derived(digits.join(''));

	function handleDigit(i: number, e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value.replace(/\D/g, '').slice(-1);
		digits[i] = val;
		if (val && i < 5) inputRefs[i + 1]?.focus();
	}

	function handleKeyDown(i: number, e: KeyboardEvent) {
		if (e.key === 'Backspace') {
			if (!digits[i] && i > 0) {
				digits[i - 1] = '';
				inputRefs[i - 1]?.focus();
			} else {
				digits[i] = '';
			}
		}
	}

	function handlePaste(e: ClipboardEvent) {
		const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
		if (pasted.length > 0) {
			e.preventDefault();
			digits = pasted.split('').concat(Array(6).fill('')).slice(0, 6) as [string, string, string, string, string, string];
			const nextEmpty = digits.findIndex((d) => !d);
			inputRefs[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
		}
	}
</script>

<svelte:head>
	<title>{copy.auth.signupPageTitle}</title>
</svelte:head>

<div class="auth-card">
	{#if checkEmail}
		<!-- Step 2: OTP verification -->
		<h1>{copy.auth.checkYourEmail}</h1>
		<p class="subtitle">
			{copy.auth.otpIntro} <strong>{verifyEmail}</strong>.
		</p>

		{#if verifyError}
			<div class="error-message">{verifyError}</div>
		{/if}

		<form
			method="POST"
			action="?/verify"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					loading = false;
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="email" value={verifyEmail} />
			<input type="hidden" name="token" value={otp} />

			<div class="otp-wrap" onpaste={handlePaste}>
				{#each digits as digit, i}
					<input
						class="otp-digit"
						type="text"
						inputmode="numeric"
						maxlength={1}
						value={digit}
						bind:this={inputRefs[i]}
						oninput={(e) => handleDigit(i, e)}
						onkeydown={(e) => handleKeyDown(i, e)}
						disabled={loading}
						autocomplete="one-time-code"
					/>
				{/each}
			</div>

			<button type="submit" class="btn-primary btn-primary--block" disabled={loading || otp.length < 6}>
				{loading ? copy.auth.verifying : copy.auth.confirm}
			</button>
		</form>

		<p class="switch-auth">{copy.auth.wrongEmail} <a href={startOverHref} class="link-btn">{copy.auth.startOver}</a></p>

	{:else}
		<!-- Step 1: Create account form -->
		<h1>{copy.auth.youreInvited}</h1>
		<p class="subtitle">{copy.auth.createAccountSubtitle}</p>

		{#if form?.error}
			<div class="error-message">{form.error}</div>
		{/if}

		<form
			method="POST"
			action="?/signup"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					loading = false;
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="ref" value={data.ref} />
			<input type="hidden" name="motivation" value={data.motivation ?? ''} />

			<div class="form-group">
				<label for="email" class="sr-only">{copy.auth.email}</label>
				<input
					type="email"
					id="email"
					name="email"
					value={data.email ?? ''}
					required
					autocomplete="email"
					placeholder={copy.auth.emailPlaceholder}
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="username" class="sr-only">{copy.auth.usernamePlaceholder}</label>
				<input
					type="text"
					id="username"
					name="username"
					bind:value={username}
					required
					autocomplete="username"
					placeholder={copy.auth.usernamePlaceholder}
					disabled={loading}
					minlength={3}
					maxlength={30}
					pattern="[a-z0-9_\-]+"
					title={copy.auth.usernameTitle}
				/>
				<p class="hint">{copy.auth.usernameHintShort}<strong>@username</strong></p>
			</div>

			<div class="form-group">
				<label for="password" class="sr-only">{copy.auth.password}</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					autocomplete="new-password"
					placeholder={copy.auth.passwordWithMinPlaceholder}
					disabled={loading}
					minlength={8}
				/>
			</div>

			<div class="form-group checkbox-group">
				<label class="checkbox-label">
					<input type="checkbox" name="berlin_based" checked disabled={loading} />
					<span>{copy.auth.berlinBased}</span>
				</label>
			</div>

			<button type="submit" class="btn-primary btn-primary--block" disabled={loading}>
				{loading ? copy.auth.creatingAccount : copy.auth.createAccount}
			</button>
		</form>

		<p class="switch-auth">
			{copy.auth.alreadyHaveAccount}
			<a href="/login" class="link-btn">{copy.auth.signIn}</a>
		</p>
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

	.error-message {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
		color: var(--color-danger);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-input);
		margin-bottom: var(--space-6);
		font-size: var(--text-base);
	}

	.form-group {
		margin-bottom: var(--space-5);
	}

	label {
		display: block;
		margin-bottom: var(--space-2);
		color: var(--text-secondary);
		font-size: var(--text-md);
	}

	input[type='text'],
	input[type='email'],
	input[type='password'] {
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

	input:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	input:disabled {
		opacity: var(--opacity-disabled);
		cursor: not-allowed;
	}

	.hint {
		margin: var(--space-2) 0 0 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.checkbox-group {
		margin-top: var(--space-2);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
		font-size: var(--text-md);
		color: var(--text-primary);
	}

	.checkbox-label input[type='checkbox'] {
		width: auto;
		margin: 0;
		cursor: pointer;
	}

	/* ── OTP digits ── */
	.otp-wrap {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-5);
	}

	.otp-digit {
		flex: 1;
		aspect-ratio: 1;
		text-align: center;
		font-size: var(--text-2xl);
		font-weight: 300;
		padding: 0;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
		color: var(--text-primary);
		caret-color: transparent;
	}

	.otp-digit:focus {
		outline: none;
		border-color: var(--text-primary);
	}

	/* .btn-primary / .btn-primary--block live in shared.css */

	.switch-auth {
		margin: var(--space-6) 0 0 0;
		text-align: center;
		color: var(--text-muted);
		font-size: var(--text-md);
	}

	.link-btn {
		color: var(--text-link);
		font: inherit;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
		text-decoration: none;
	}

	.link-btn:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
	}
</style>
