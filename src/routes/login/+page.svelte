<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let mode = $state<'login' | 'signup' | 'reset' | 'update'>(data.mode === 'update' ? 'update' : 'login');
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Login' : mode === 'signup' ? 'Sign Up' : mode === 'reset' ? 'Reset Password' : 'Set New Password'} - dyad.berlin</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1>
			{#if mode === 'login'}Welcome back{:else if mode === 'signup'}Create account{:else if mode === 'reset'}Reset password{:else}Set new password{/if}
		</h1>
		<p class="subtitle">
			{#if mode === 'login'}Sign in to continue to your canvases{:else if mode === 'signup'}Get started with your own canvas{:else if mode === 'reset'}Enter your email to receive a reset link{:else}Choose a new password for your account{/if}
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
						minlength={mode === 'signup' || mode === 'update' ? 6 : undefined}
					/>
					{#if mode === 'signup' || mode === 'update'}
						<p class="hint">At least 6 characters</p>
					{/if}
				</div>
			{/if}

			<button type="submit" class="submit-btn" disabled={loading}>
				{#if loading}
					{#if mode === 'login'}Signing in...{:else if mode === 'signup'}Creating account...{:else if mode === 'reset'}Sending...{:else}Updating...{/if}
				{:else}
					{#if mode === 'login'}Sign in{:else if mode === 'signup'}Create account{:else if mode === 'reset'}Send reset link{:else}Update password{/if}
				{/if}
			</button>
		</form>

		<p class="switch-auth">
			{#if mode === 'login'}
				Don't have an account?
				<button type="button" class="link-btn" onclick={() => (mode = 'signup')}>Create one</button>
				<span class="separator">|</span>
				<button type="button" class="link-btn" onclick={() => (mode = 'reset')}>Forgot password?</button>
			{:else if mode === 'signup'}
				Already have an account?
				<button type="button" class="link-btn" onclick={() => (mode = 'login')}>Sign in</button>
			{:else if mode === 'reset'}
				Remember your password?
				<button type="button" class="link-btn" onclick={() => (mode = 'login')}>Sign in</button>
			{:else}
				<a href="/dashboard" class="link-btn">Go to dashboard</a>
			{/if}
		</p>
	</div>
</div>

<style>
	.auth-container {
		min-height: 100vh;
		display: flex;
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

	.separator {
		margin: 0 0.5rem;
		color: var(--text-muted);
	}
</style>
