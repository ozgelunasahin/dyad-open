<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import { copy } from '$lib/copy';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	// svelte-ignore state_referenced_locally — intentional initial-value capture for form field
	let username = $state(form?.username ?? '');
	let password = $state('');
</script>

<svelte:head>
	<title>{copy.auth.joinPageTitle}</title>
</svelte:head>

<div class="auth-card">
	{#if form?.success}
		<h1>{copy.auth.welcomeToDyad}</h1>
		<p class="subtitle">{form.message}</p>
		<a href="/login" class="submit-btn cta-link">{copy.auth.signIn}</a>
	{:else if data.kind === 'group-authed'}
		<h1>{copy.auth.groupAlreadyMember}</h1>
		<p class="subtitle">{copy.auth.groupAlreadyMemberSubtitle}</p>
		<a href="/discover" class="submit-btn cta-link">{copy.auth.groupGoToDiscover}</a>
	{:else if data.kind === 'group' && data.state !== 'open'}
		{#if data.state === 'full'}
			<h1>{copy.auth.groupLinkFull}</h1>
			<p class="subtitle">{copy.auth.groupLinkFullSubtitle}</p>
		{:else if data.state === 'closed'}
			<h1>{copy.auth.groupLinkClosed}</h1>
			<p class="subtitle">{copy.auth.groupLinkClosedSubtitle}</p>
		{:else if data.state === 'revoked'}
			<h1>{copy.auth.groupLinkRevoked}</h1>
			<p class="subtitle">{copy.auth.groupLinkRevokedSubtitle}</p>
		{:else}
			<h1>{copy.auth.groupLinkUnknown}</h1>
			<p class="subtitle">{copy.auth.groupLinkUnknownSubtitle}</p>
		{/if}
		<a href="/" class="back-link">{copy.auth.backToHome}</a>
	{:else if data.kind === 'group'}
		<h1>{copy.auth.groupJoinTitle.replace('{name}', data.scopeName ?? 'dyad')}</h1>
		<p class="subtitle">{copy.auth.groupJoinSubtitle}</p>

		{#if form?.error}
			<div class="error-message">{form.error}</div>
		{/if}

		<form
			method="POST"
			action="?/groupJoin"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					loading = false;
					if (result.type === 'success') {
						await update({ reset: false });
					} else {
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="glink" value={data.glink} />

			<div class="form-group">
				<label for="email" class="sr-only">{copy.auth.email}</label>
				<input
					type="email"
					id="email"
					name="email"
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
				<p class="hint">{copy.auth.usernameHintLong}<strong>@username</strong></p>
			</div>

			<div class="form-group">
				<label for="password" class="sr-only">{copy.auth.password}</label>
				<input
					type="password"
					id="password"
					name="password"
					bind:value={password}
					required
					autocomplete="new-password"
					placeholder={copy.auth.passwordWithMinPlaceholder}
					disabled={loading}
					minlength={8}
				/>
			</div>

			<button type="submit" class="btn-primary btn-primary--block" disabled={loading}>
				{loading ? copy.auth.creatingAccount : copy.auth.createAccount}
			</button>
		</form>

		<p class="switch-auth">
			{copy.auth.alreadyHaveAccount}
			<a href="/login" class="link-btn">{copy.auth.signIn}</a>
		</p>
	{:else if !data.valid}
		<h1>{copy.auth.invitationExpired}</h1>
		<p class="subtitle">{copy.auth.invitationExpiredSubtitle}</p>
		<a href="/" class="back-link">{copy.auth.backToHome}</a>
	{:else}
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
					if (result.type === 'success') {
						await update({ reset: false });
					} else {
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="token" value={data.token} />

			<div class="form-group">
				<label for="email" class="sr-only">{copy.auth.email}</label>
				<input
					type="email"
					id="email"
					name="email"
					value={data.email}
					readonly
					autocomplete="email"
					placeholder={copy.auth.emailPlaceholder}
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
				<p class="hint">{copy.auth.usernameHintLong}<strong>@username</strong></p>
			</div>

			<div class="form-group">
				<label for="password" class="sr-only">{copy.auth.password}</label>
				<input
					type="password"
					id="password"
					name="password"
					bind:value={password}
					required
					autocomplete="new-password"
					placeholder={copy.auth.passwordWithMinPlaceholder}
					disabled={loading}
					minlength={8}
				/>
			</div>

			<div class="form-group checkbox-group">
				<label class="checkbox-label">
					<input
						type="checkbox"
						name="berlin_based"
						checked
						disabled={loading}
					/>
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

	input:disabled,
	input[readonly] {
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

	/* .btn-primary / .btn-primary--block live in shared.css */

	.cta-link {
		display: inline-block;
		text-align: center;
		text-decoration: none;
	}

	.switch-auth {
		margin: var(--space-6) 0 0 0;
		text-align: center;
		color: var(--text-muted);
		font-size: var(--text-md);
	}

	.link-btn,
	.back-link {
		color: var(--text-link);
		font: inherit;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
		text-decoration: none;
	}

	.link-btn:hover,
	.back-link:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
	}
</style>
