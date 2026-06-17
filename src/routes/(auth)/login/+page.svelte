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
	<title>{mode === 'login' ? copy.auth.pageTitleLogin : mode === 'reset' ? copy.auth.pageTitleReset : copy.auth.pageTitleUpdate}</title>
</svelte:head>

<div class="auth-card">
	<h1>
		{#if mode === 'login'}{copy.auth.welcomeBack}{:else if mode === 'reset'}{copy.auth.resetPasswordTitle}{:else}{copy.auth.setNewPasswordTitle}{/if}
	</h1>
	<p class="subtitle">
		{#if mode === 'login'}{copy.auth.signInSubtitle}{:else if mode === 'reset'}{copy.auth.resetSubtitle}{:else}{copy.auth.updateSubtitle}{/if}
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
				<label for="email" class="sr-only">{copy.auth.email}</label>
				<input
					type="email"
					id="email"
					name="email"
					bind:value={email}
					required
					autocomplete="username"
					placeholder={copy.auth.emailPlaceholder}
					disabled={loading}
				/>
			</div>
		{/if}

		{#if mode !== 'reset'}
			<div class="form-group">
				<label for="password" class="sr-only">{mode === 'update' ? copy.auth.newPasswordLabel : copy.auth.password}</label>
				<input
					type="password"
					id="password"
					name="password"
					bind:value={password}
					required
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					placeholder={mode === 'update' ? copy.auth.newPasswordLabel : copy.auth.passwordPlaceholder}
					disabled={loading}
					minlength={mode === 'update' ? 8 : undefined}
				/>
				{#if mode === 'update'}
					<p class="hint">{copy.auth.passwordHint}</p>
				{/if}
			</div>
		{/if}

		<button type="submit" class="btn-primary btn-primary--block" disabled={loading}>
			{#if loading}
				{#if mode === 'login'}{copy.auth.signingIn}{:else if mode === 'reset'}{copy.auth.sending}{:else}{copy.auth.updating}{/if}
			{:else}
				{#if mode === 'login'}{copy.auth.signIn}{:else if mode === 'reset'}{copy.auth.sendResetLink}{:else}{copy.auth.updatePasswordAction}{/if}
			{/if}
		</button>
	</form>

	<div class="switch-auth">
		{#if mode === 'login'}
			<button type="button" class="link-btn" onclick={() => (mode = 'reset')}>{copy.auth.forgotPassword}</button>
			<a href="/waitlist" class="link-btn">{copy.auth.join}</a>
		{:else if mode === 'reset'}
			<button type="button" class="link-btn" onclick={() => (mode = 'login')}>{copy.auth.signIn}</button>
			<a href="/waitlist" class="link-btn">{copy.auth.join}</a>
		{:else}
			<a href="/discover" class="link-btn">{copy.auth.goToDashboard}</a>
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

	/* .btn-primary / .btn-primary--block live in shared.css */

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
