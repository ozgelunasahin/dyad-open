<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let mode = $state<'login' | 'reset' | 'update'>(data.mode === 'update' ? 'update' : 'login');
</script>

<svelte:head>
	<title>{mode === 'login' ? 'login' : mode === 'reset' ? 'reset password' : 'set new password'} - dyad. cultivating a culture of conversation</title>
</svelte:head>

<nav class="login-nav">
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
			<h1>
				{#if mode === 'login'}Welcome back{:else if mode === 'reset'}Reset password{:else}Set new password{/if}
			</h1>
			<p class="subtitle">
				{#if mode === 'login'}Sign in to create and join conversations{:else if mode === 'reset'}Enter your email to receive a reset link{:else}Choose a new password for your account{/if}
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

			<div class="switch-auth">
				{#if mode === 'login'}
					<button type="button" class="link-btn" onclick={() => (mode = 'reset')}>Forgot password?</button>
					<a href="/waitlist" class="link-btn">Join</a>
				{:else if mode === 'reset'}
					<button type="button" class="link-btn" onclick={() => (mode = 'login')}>Sign in</button>
					<a href="/waitlist" class="link-btn">Join</a>
				{:else}
					<a href="/discover" class="link-btn">Go to dashboard</a>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.login-nav {
		position: fixed;
		top: 24px;
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

	/* === Split layout — mirrors landing page === */
	.split-layout {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: row;
		overflow: hidden;
		background: var(--bg-canvas);
	}

	/* Image — left half with grain overlay */
	.image-half {
		width: 50%;
		height: 100%;
		position: relative;
		padding: 16px 0 16px 16px;
		box-sizing: border-box;
	}

	.image-half img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
		border-radius: 8px;
	}

	.image-half::after {
		content: '';
		position: absolute;
		top: 16px;
		right: 0;
		bottom: 16px;
		left: 16px;
		border-radius: 8px;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
		background-size: 128px 128px;
		mix-blend-mode: overlay;
		pointer-events: none;
		z-index: 1;
	}

	/* Form — right half, vertically centered */
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
		max-width: 360px;
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
		display: flex;
		justify-content: space-between;
		align-items: center;
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
		text-decoration: none;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
	}

	.link-btn:hover {
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
			padding: 16px 16px 0 16px;
		}

		.image-half img {
			border-radius: 8px;
		}

		.image-half::after {
			top: 16px;
			right: 16px;
			bottom: 0;
			left: 16px;
			border-radius: 8px;
		}

		.login-nav {
			width: 100%;
		}

		.form-half {
			width: 100%;
			height: auto;
			padding: 2rem 1.5rem;
		}
	}
</style>
