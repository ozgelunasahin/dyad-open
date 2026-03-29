<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	// svelte-ignore state_referenced_locally — intentional initial-value capture for form fields
	let mode = $state<'login' | 'reset' | 'update'>(data.mode === 'update' ? 'update' : 'login');
	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? '');
	let password = $state('');
</script>

<svelte:head>
	<title>{mode === 'login' ? 'login' : mode === 'reset' ? 'reset password' : 'set new password'} - dyad. cultivating a culture of conversation</title>
</svelte:head>

<div class="auth-card">
	<h1>
		{#if mode === 'login'}{copy.auth.welcomeBack}{:else if mode === 'reset'}Reset password{:else}Set new password{/if}
	</h1>
	<p class="subtitle">
		{#if mode === 'login'}{copy.auth.signInSubtitle}{:else if mode === 'reset'}Enter your email to receive a reset link{:else}Choose a new password for your account{/if}
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
					bind:value={email}
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
					bind:value={password}
					required
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					disabled={loading}
					minlength={mode === 'update' ? 8 : undefined}
				/>
				{#if mode === 'update'}
					<p class="hint">{copy.auth.passwordHint}</p>
				{/if}
			</div>
		{/if}

		<button type="submit" class="submit-btn" disabled={loading}>
			{#if loading}
				{#if mode === 'login'}Signing in...{:else if mode === 'reset'}Sending...{:else}Updating...{/if}
			{:else}
				{#if mode === 'login'}{copy.auth.signIn}{:else if mode === 'reset'}Send reset link{:else}Update password{/if}
			{/if}
		</button>
	</form>

	<div class="switch-auth">
		{#if mode === 'login'}
			<button type="button" class="link-btn" onclick={() => (mode = 'reset')}>{copy.auth.forgotPassword}</button>
			<a href="/waitlist" class="link-btn">Join</a>
		{:else if mode === 'reset'}
			<button type="button" class="link-btn" onclick={() => (mode = 'login')}>Sign in</button>
			<a href="/waitlist" class="link-btn">Join</a>
		{:else}
			<a href="/discover" class="link-btn">Go to dashboard</a>
		{/if}
	</div>
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

	.success-message {
		background: color-mix(in srgb, var(--color-success) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
		color: var(--color-success);
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

	.hint {
		margin: var(--space-2) 0 0 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.submit-btn {
		width: 100%;
		padding: var(--space-3);
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		font-size: var(--text-lg);
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
		margin-top: var(--space-2);
	}

	.submit-btn:hover:not(:disabled) {
		opacity: var(--opacity-hover-btn);
	}

	.submit-btn:disabled {
		opacity: var(--opacity-disabled);
		cursor: not-allowed;
	}

	.switch-auth {
		margin: var(--space-6) 0 0 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-muted);
		font-size: var(--text-md);
	}

	.link-btn {
		background: none;
		border: none;
		padding: 0;
		color: var(--text-link);
		font: inherit;
		cursor: pointer;
		text-decoration: none;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
	}

	.link-btn:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
	}
</style>
