<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Register - dyad.berlin</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1>Create Account</h1>
		<p class="subtitle">Join dyad.berlin to create your spatial reading canvas</p>

		{#if form?.error}
			<div class="error-message">{form.error}</div>
		{/if}

		<form
			method="POST"
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
				<label for="username">Username</label>
				<input
					type="text"
					id="username"
					name="username"
					value={form?.username ?? ''}
					required
					autocomplete="username"
					pattern="[a-z0-9-]+"
					minlength="3"
					maxlength="30"
					disabled={loading}
				/>
				<span class="hint">Lowercase letters, numbers, and hyphens only</span>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					autocomplete="new-password"
					minlength="8"
					disabled={loading}
				/>
				<span class="hint">At least 8 characters</span>
			</div>

			<div class="form-group">
				<label for="confirmPassword">Confirm Password</label>
				<input
					type="password"
					id="confirmPassword"
					name="confirmPassword"
					required
					autocomplete="new-password"
					disabled={loading}
				/>
			</div>

			<button type="submit" class="submit-btn" disabled={loading}>
				{loading ? 'Creating account...' : 'Create Account'}
			</button>
		</form>

		<p class="switch-auth">
			Already have an account? <a href="/login">Sign in</a>
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
		display: block;
		margin-top: 0.35rem;
		font-size: 0.8rem;
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

	.switch-auth a {
		color: var(--text-link);
		text-decoration: none;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
	}

	.switch-auth a:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
	}
</style>
