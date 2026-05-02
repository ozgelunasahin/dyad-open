<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let email = $state(form?.email ?? '');
</script>

<svelte:head>
	<title>Admin sign in</title>
</svelte:head>

<main class="login-main">
	<h1 class="login-title">Admin sign in</h1>

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
			<label for="email" class="sr-only">Email</label>
			<input
				type="email"
				id="email"
				name="email"
				bind:value={email}
				required
				autocomplete="email"
				placeholder="email"
				disabled={loading}
			/>
		</div>

		<div class="form-group">
			<label for="password" class="sr-only">Password</label>
			<input
				type="password"
				id="password"
				name="password"
				required
				autocomplete="current-password"
				placeholder="password"
				disabled={loading}
			/>
		</div>

		<button type="submit" class="btn-primary btn-primary--block" disabled={loading}>
			{loading ? 'Signing in…' : 'Sign in'}
		</button>
	</form>
</main>

<style>
	.login-main {
		max-width: 360px;
		margin: 10vh auto;
		padding: var(--space-6);
	}
	.login-title {
		font-family: var(--font-mono);
		font-size: var(--text-base);
		font-weight: 500;
		letter-spacing: 0.04em;
		margin: 0 0 var(--space-6);
		text-align: center;
		color: var(--text-secondary);
	}
	.form-group {
		margin-bottom: var(--space-3);
	}
	input {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		font-family: inherit;
		font-size: var(--text-base);
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
	}
	input:focus { outline: none; border-color: var(--text-muted); }
	input:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	.btn-primary--block {
		width: 100%;
		padding: var(--space-3);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		font-family: inherit;
		font-size: var(--text-base);
		cursor: pointer;
		margin-top: var(--space-2);
	}
	.btn-primary--block:hover:not(:disabled) { opacity: var(--opacity-hover-btn); }
	.btn-primary--block:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	.error-message {
		padding: var(--space-3);
		background: rgba(192, 0, 0, 0.08);
		color: var(--color-danger);
		border-radius: var(--radius-input);
		margin-bottom: var(--space-4);
		font-size: var(--text-sm);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
