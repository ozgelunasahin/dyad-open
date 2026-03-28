<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
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
						value={form?.username ?? ''}
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

	input[type='text'],
	input[type='email'],
	input[type='password'] {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 1rem;
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
		opacity: 0.6;
		cursor: not-allowed;
	}

	.hint {
		margin: 0.5rem 0 0 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.checkbox-group {
		margin-top: 0.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	.checkbox-label input[type='checkbox'] {
		width: auto;
		margin: 0;
		cursor: pointer;
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
