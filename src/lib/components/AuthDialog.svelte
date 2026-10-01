<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { copy } from '$lib/copy';

	let open = $state(false);
	let dialogBox = $state<HTMLElement | undefined>();
	let loading = $state(false);
	let error = $state('');

	let loginEmail = $state('');
	let loginPassword = $state('');

	export function show() {
		error = '';
		loading = false;
		open = true;
	}

	function hide() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') hide();
	}

	// A plain fixed overlay, NOT <dialog>.showModal(). The native dialog renders
	// in the browser top layer, which sits above the page DOM and occludes the
	// inline popup that extension password managers inject — so they appear not
	// to fire. A normal overlay keeps the login form in the page's stacking
	// context, where password managers behave as they do on any page.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = open ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	});

	// Native <dialog> auto-focused the first control; preserve that.
	$effect(() => {
		if (open && dialogBox) {
			dialogBox.querySelector<HTMLElement>('input')?.focus();
		}
	});

	function handleLoginEnhance() {
		loading = true;
		error = '';
		return async ({ result }: { result: { type: string; location?: string; data?: Record<string, unknown>; error?: Error } }) => {
			loading = false;
			if (result.type === 'redirect') {
				hide();
				await goto(result.location!, { invalidateAll: true });
			} else if (result.type === 'failure') {
				error = (result.data?.error as string) ?? 'Login failed';
			} else if (result.type === 'error') {
				error = result.error?.message ?? copy.auth.somethingWentWrong;
			}
		};
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="auth-overlay" onclick={(e) => { if (e.target === e.currentTarget) hide(); }}>
		<div
			class="auth-dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="auth-dialog-title"
			bind:this={dialogBox}
		>
			<div class="dialog-content">
		<button class="close-btn" onclick={hide} aria-label="Close">&times;</button>

		<h2 id="auth-dialog-title" class="dialog-title">{copy.auth.logIn}</h2>

		<form method="POST" action="/login?/login" use:enhance={handleLoginEnhance}>
			<label class="field">
				<span class="field-label">{copy.auth.email}</span>
				<input
					type="email"
					name="email"
					bind:value={loginEmail}
					required
					autocomplete="username"
					autocapitalize="off"
					autocorrect="off"
					spellcheck="false"
				/>
			</label>

			<label class="field">
				<span class="field-label">{copy.auth.password}</span>
				<input
					type="password"
					name="password"
					bind:value={loginPassword}
					required
					autocomplete="current-password"
				/>
			</label>

			{#if error}
				<p class="error-msg">{error}</p>
			{/if}

			<button class="btn-primary btn-primary--block" type="submit" disabled={loading}>
				{loading ? copy.auth.loggingIn : copy.auth.logIn}
			</button>
		</form>

		<p class="mode-switch">
			<a href="/login?mode=reset" class="link-btn" onclick={hide}>{copy.auth.forgotPassword}</a>
		</p>
		<p class="mode-switch">
			{copy.auth.dontHaveAccount} <a href="/signup" class="link-btn" onclick={hide}>{copy.auth.join}</a>
		</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.auth-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
		box-sizing: border-box;
		background: rgba(0, 0, 0, 0.5);
		overflow-y: auto;
	}

	.auth-dialog {
		max-width: 420px;
		width: 100%;
		background: var(--bg-canvas);
		color: var(--text-primary);
		border-radius: var(--radius-card);
	}

	.dialog-content {
		padding: var(--space-8) var(--space-6);
		position: relative;
	}

	.close-btn {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		background: none;
		border: none;
		font-size: var(--text-2xl);
		color: var(--text-muted);
		cursor: pointer;
		line-height: 1;
		padding: var(--space-1);
	}
	.close-btn:hover { color: var(--text-primary); }

	.dialog-title {
		font-size: var(--text-xl);
		font-weight: 500;
		margin: 0 0 var(--space-6);
	}

	.field {
		display: block;
		margin-bottom: var(--space-4);
	}

	.field-label {
		display: block;
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-bottom: var(--space-1);
	}

	.field input {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.field input:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.error-msg {
		font-size: var(--text-sm);
		color: var(--color-danger);
		margin: 0 0 var(--space-3);
	}

	/* .btn-primary / .btn-primary--block live in shared.css */

	.mode-switch {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-align: center;
		margin: var(--space-4) 0 0;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--text-link);
		cursor: pointer;
		font-size: inherit;
		padding: 0;
		text-decoration: underline;
	}

	a.link-btn { text-decoration: underline; }
</style>
