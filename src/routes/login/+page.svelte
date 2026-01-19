<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
	let mode = $state<'login' | 'signup'>('login');
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Login' : 'Sign Up'} - dyad.berlin</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
		<p class="subtitle">
			{mode === 'login' ? 'Sign in to continue to your canvases' : 'Get started with your own canvas'}
		</p>

		{#if form?.error}
			<div class="error-message">{form.error}</div>
		{/if}

		{#if form?.success}
			<div class="success-message">{form.message}</div>
		{/if}

		<form
			method="POST"
			action="?/{mode}"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
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

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					disabled={loading}
					minlength={mode === 'signup' ? 6 : undefined}
				/>
				{#if mode === 'signup'}
					<p class="hint">At least 6 characters</p>
				{/if}
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{#if loading}
					{mode === 'login' ? 'Signing in...' : 'Creating account...'}
				{:else}
					{mode === 'login' ? 'Sign in' : 'Create account'}
				{/if}
			</button>
		</form>

		<p class="switch-auth">
			{#if mode === 'login'}
				Don't have an account?
				<button type="button" class="link-btn" onclick={() => (mode = 'signup')}>Create one</button>
			{:else}
				Already have an account?
				<button type="button" class="link-btn" onclick={() => (mode = 'login')}>Sign in</button>
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
</style>
