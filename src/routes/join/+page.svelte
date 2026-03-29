<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	// svelte-ignore state_referenced_locally — intentional initial-value capture for form field
	let username = $state(form?.username ?? '');
	let password = $state('');
</script>

<svelte:head>
	<title>Join dyad. - cultivating a culture of conversation</title>
</svelte:head>

<nav class="join-nav">
	<a href="/" class="logo-link" aria-label="Back to home">
		<img src="/images/logo.png" alt="dyad" class="site-logo" />
	</a>
</nav>

<div class="split-layout">
	<div class="image-half">
		<img src="/images/log-in.jpeg" alt="" />
	</div>
	<div class="form-half">
	<div class="auth-card">
		{#if form?.success}
			<h1>Welcome to dyad.</h1>
			<p class="subtitle">{form.message}</p>
			<a href="/login" class="submit-btn" style="display: inline-block; text-align: center; text-decoration: none;">Sign in</a>
		{:else if !data.valid}
			<h1>Invitation expired</h1>
			<p class="subtitle">This invitation link is no longer valid. It may have expired or already been used.</p>
			<a href="/" class="back-link">Back to home</a>
		{:else}
			<h1>You're invited</h1>
			<p class="subtitle">Create your account to join the conversation.</p>

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
					<label for="email">Email</label>
					<input
						type="email"
						id="email"
						name="email"
						value={data.email}
						readonly
						autocomplete="email"
					/>
				</div>

				<div class="form-group">
					<label for="username">Username</label>
					<input
						type="text"
						id="username"
						name="username"
						bind:value={username}
						required
						autocomplete="username"
						disabled={loading}
						minlength={3}
						maxlength={30}
						pattern="[a-z0-9_\-]+"
						title="Lowercase letters, numbers, underscores, and hyphens only"
					/>
					<p class="hint">This will be your public URL: dyad.berlin/<strong>@username</strong></p>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						bind:value={password}
						required
						autocomplete="new-password"
						disabled={loading}
						minlength={8}
					/>
					<p class="hint">At least 8 characters</p>
				</div>

				<div class="form-group checkbox-group">
					<label class="checkbox-label">
						<input
							type="checkbox"
							name="berlin_based"
							checked
							disabled={loading}
						/>
						<span>I'm based in Berlin</span>
					</label>
				</div>

				<button type="submit" class="submit-btn" disabled={loading}>
					{loading ? 'Creating account...' : 'Create account'}
				</button>
			</form>

			<p class="switch-auth">
				Already have an account?
				<a href="/login" class="link-btn">Sign in</a>
			</p>
		{/if}
	</div>
	</div>
</div>

<style>
	.join-nav {
		position: fixed;
		top: var(--space-6);
		right: 0;
		width: 50%;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 48px;
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
		filter: brightness(0) invert(1) opacity(0.7);
	}

	/* === Split layout — mirrors login page === */
	.split-layout {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: row;
		overflow: hidden;
		background: var(--bg-canvas);
	}

	.image-half {
		width: 50%;
		height: 100%;
		position: relative;
		padding: var(--space-4) 0 var(--space-4) var(--space-4);
		box-sizing: border-box;
	}

	.image-half img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
		border-radius: var(--radius-card);
	}

	.image-half::after {
		content: '';
		position: absolute;
		top: var(--space-4);
		right: 0;
		bottom: var(--space-4);
		left: var(--space-4);
		border-radius: var(--radius-card);
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
		background-size: 128px 128px;
		mix-blend-mode: overlay;
		pointer-events: none;
		z-index: 1;
	}

	.form-half {
		width: 50%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		box-sizing: border-box;
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
	}

	h1 {
		margin: 0 0 var(--space-2) 0;
		font-size: var(--text-3xl);
		font-weight: normal;
		color: var(--text-primary);
	}

	.subtitle {
		margin: 0 0 var(--space-6) 0;
		color: var(--text-muted);
		font-size: var(--text-md);
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
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
		border-color: var(--text-link-hover);
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

	/* === Mobile — image on top, form below === */
	@media (max-width: 430px) {
		.split-layout {
			flex-direction: column;
			height: auto;
			min-height: 100vh;
		}

		.image-half {
			width: 100%;
			height: 40vh;
			padding: var(--space-4) var(--space-4) 0 var(--space-4);
		}

		.image-half img {
			border-radius: var(--radius-input);
		}

		.image-half::after {
			top: var(--space-4);
			right: var(--space-4);
			bottom: 0;
			left: var(--space-4);
			border-radius: var(--radius-input);
		}

		.join-nav {
			width: 100%;
		}

		.form-half {
			width: 100%;
			height: auto;
			padding: 2rem 1.5rem;
		}
	}
</style>
