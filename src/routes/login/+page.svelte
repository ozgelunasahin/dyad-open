<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let mode = $state<'login' | 'reset' | 'update'>(data.mode === 'update' ? 'update' : 'login');

	// Waitlist form state
	let waitlistName = $state('');
	let waitlistEmail = $state('');
	let waitlistFreewrite = $state('');
	let waitlistStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let waitlistError = $state('');

	async function handleWaitlist(e: Event) {
		e.preventDefault();
		if (!waitlistEmail) return;
		if (!waitlistFreewrite.trim()) {
			waitlistError = 'Please share your thoughts before joining.';
			waitlistStatus = 'error';
			return;
		}
		waitlistStatus = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: waitlistEmail.trim(),
					name: waitlistName.trim() || undefined,
					freewrite: waitlistFreewrite.trim() || undefined
				})
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Something went wrong');
			}
			waitlistStatus = 'sent';
		} catch (err) {
			waitlistError = err instanceof Error ? err.message : 'Something went wrong';
			waitlistStatus = 'error';
		}
	}
</script>

<svelte:head>
	<title>{mode === 'login' ? 'login' : mode === 'reset' ? 'reset password' : 'set new password'} - dyad. cultivating a culture of conversation</title>
</svelte:head>

<nav class="login-nav">
	<a href="/" class="logo-link" aria-label="Back to home">
		<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt="dyad" class="site-logo" />
	</a>
</nav>

<div class="auth-container">
	<div class="auth-card">
		<h1>
			{#if mode === 'login'}Welcome back{:else if mode === 'reset'}Reset password{:else}Set new password{/if}
		</h1>
		<p class="subtitle">
			{#if mode === 'login'}Sign in to continue to your canvases{:else if mode === 'reset'}Enter your email to receive a reset link{:else}Choose a new password for your account{/if}
		</p>

		{#if form?.error}
			<div class="error-message">{form.error}</div>
		{/if}

		{#if form?.success}
			<div class="success-message">{form.message}</div>
		{/if}

		<form
			method="POST"
			action="?/{mode === 'reset' ? 'resetPassword' : mode === 'update' ? 'updatePassword' : mode}"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			{#if mode !== 'update'}
				<div class="form-group">
					<label for="email">Email</label>
					<input
						type="email"
						id="email"
						name="email"
						value={form?.email ?? ''}
						required
						autocomplete="email"
						disabled={loading}
					/>
				</div>
			{/if}

			{#if mode !== 'reset'}
				<div class="form-group">
					<label for="password">{mode === 'update' ? 'New password' : 'Password'}</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
						disabled={loading}
						minlength={mode === 'update' ? 6 : undefined}
					/>
					{#if mode === 'update'}
						<p class="hint">At least 6 characters</p>
					{/if}
				</div>
			{/if}

			<button type="submit" class="submit-btn" disabled={loading}>
				{#if loading}
					{#if mode === 'login'}Signing in...{:else if mode === 'reset'}Sending...{:else}Updating...{/if}
				{:else}
					{#if mode === 'login'}Sign in{:else if mode === 'reset'}Send reset link{:else}Update password{/if}
				{/if}
			</button>
		</form>

		<p class="switch-auth">
			{#if mode === 'login'}
				<button type="button" class="link-btn" onclick={() => (mode = 'reset')}>Forgot password?</button>
			{:else if mode === 'reset'}
				Remember your password?
				<button type="button" class="link-btn" onclick={() => (mode = 'login')}>Sign in</button>
			{:else}
				<a href="/dashboard" class="link-btn">Go to dashboard</a>
			{/if}
		</p>
	</div>

	<div class="waitlist-card">
		<span class="waitlist-tag">join</span>
		<p class="waitlist-description">For all free thinkers who want company.</p>

		{#if waitlistStatus === 'sent'}
			<p class="success-message">Thank you. We'll be in touch.</p>
		{:else}
			<form onsubmit={handleWaitlist}>
				<div class="form-group">
					<label for="waitlist-freewrite" class="freewrite-label">What's in a conversation?</label>
					<textarea
						id="waitlist-freewrite"
						placeholder="Write freely..."
						bind:value={waitlistFreewrite}
						disabled={waitlistStatus === 'sending'}
						maxlength={2000}
						rows={3}
					></textarea>
				</div>
				<div class="waitlist-row">
					<input type="text" placeholder="Name" bind:value={waitlistName} disabled={waitlistStatus === 'sending'} />
					<input type="email" placeholder="Email" bind:value={waitlistEmail} required disabled={waitlistStatus === 'sending'} />
					<button type="submit" class="submit-btn waitlist-btn" disabled={waitlistStatus === 'sending'}>
						{waitlistStatus === 'sending' ? 'Sending...' : 'Join'}
					</button>
				</div>
				{#if waitlistStatus === 'error'}
					<p class="error-text">{waitlistError}</p>
				{/if}
			</form>
		{/if}
	</div>
</div>

<style>
	.login-nav {
		position: fixed;
		top: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 28px;
		height: 48px;
		background: color-mix(in srgb, var(--bg-canvas, #f5f3f0) 92%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 8px;
		box-shadow: 0 1px 12px var(--bg-control, rgba(0, 0, 0, 0.08));
	}

	.logo-link {
		display: flex;
		align-items: center;
	}

	.site-logo {
		height: 34px;
		width: auto;
		filter: brightness(0);
		transition: filter 0.2s ease;
	}

	:global([data-theme='dark']) .site-logo {
		filter: none;
	}

	.auth-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: var(--bg-canvas);
	}

	.auth-card {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
	}

	h1 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0 0 1.5rem 0;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.success-message {
		background: rgba(25, 135, 84, 0.1);
		border: 1px solid rgba(25, 135, 84, 0.3);
		color: #198754;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.hint {
		margin: 0.5rem 0 0 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.submit-btn {
		width: 100%;
		padding: 0.85rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.switch-auth {
		margin: 1.5rem 0 0 0;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.link-btn {
		background: none;
		border: none;
		padding: 0;
		color: var(--text-link);
		font: inherit;
		cursor: pointer;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
	}

	.link-btn:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
	}

	/* === Waitlist section === */
	.waitlist-card {
		width: 100%;
		max-width: 400px;
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-link);
	}

	.waitlist-tag {
		font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted, #666);
	}

	.waitlist-description {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.95rem;
		color: var(--text-muted);
		margin: 8px 0 16px;
	}

	.freewrite-label {
		display: block;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-bottom: 6px;
		font-style: italic;
	}

	textarea {
		width: 100%;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-canvas);
		color: var(--text-primary);
		resize: vertical;
		line-height: 1.5;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	textarea:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	textarea::placeholder {
		color: var(--text-muted);
	}

	textarea:disabled {
		opacity: 0.6;
	}

	.waitlist-row {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}

	.waitlist-btn {
		width: auto;
		padding: 0.75rem 1.25rem;
		margin-top: 0;
		white-space: nowrap;
	}

	.error-text {
		font-size: 0.85rem;
		color: #dc3545;
		margin: 8px 0 0;
	}
</style>
