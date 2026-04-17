<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { copy } from '$lib/copy';
	import { capture } from '$lib/analytics';

	interface Props {
		mode?: 'waitlist' | 'login';
	}

	let { mode: initialMode = 'waitlist' }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | undefined>();
	let currentMode = $state(initialMode);
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	// Waitlist fields
	let freewrite = $state('');
	let name = $state('');
	let city = $state('');
	let email = $state('');

	// Login fields
	let loginEmail = $state('');
	let loginPassword = $state('');

	export function show(mode: 'waitlist' | 'login' = 'waitlist') {
		currentMode = mode;
		error = '';
		success = false;
		loading = false;
		dialogEl?.showModal();
	}

	function hide() {
		dialogEl?.close();
	}

	function switchMode(mode: 'waitlist' | 'login') {
		currentMode = mode;
		error = '';
		success = false;
	}

	async function submitWaitlist() {
		if (!freewrite.trim() || !email.trim()) return;
		loading = true;
		error = '';

		// Read referral cookie
		const dyadRef = document.cookie.split('; ').find(r => r.startsWith('dyad_ref='))?.split('=')[1];

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					name: name.trim() || undefined,
					based_in: city.trim() || undefined,
					freewrite: freewrite.trim(),
					referred_by_username: dyadRef || undefined
				})
			});

			if (res.ok) {
				success = true;
				capture('waitlist_joined', { referred_by: dyadRef || null });
			} else if (res.status === 409) {
				success = true; // Already on waitlist — show friendly message
				error = 'already';
			} else {
				const data = await res.json().catch(() => ({}));
				error = (data as any).error ?? copy.auth.somethingWentWrong;
			}
		} catch {
			error = copy.common.networkError;
		} finally {
			loading = false;
		}
	}

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

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	class="auth-dialog"
	aria-labelledby="auth-dialog-title"
	onclick={(e) => { if (e.target === dialogEl) hide(); }}
	onkeydown={(e) => { if (e.key === 'Escape') hide(); }}
>
	<div class="dialog-content">
		<button class="close-btn" onclick={hide} aria-label="Close">&times;</button>

		{#if currentMode === 'waitlist'}
			<h2 id="auth-dialog-title" class="dialog-title">{copy.waitlist.joinWaitlist}</h2>

			{#if success}
				<div class="success-message">
					{#if error === 'already'}
						<p>{copy.waitlist.alreadyOnWaitlist}</p>
					{:else}
						<p>{copy.waitlist.thanksForJoining}</p>
					{/if}
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); submitWaitlist(); }}>
					<label class="field">
						<span class="field-label">{copy.waitlist.whatsOnYourMind}</span>
						<textarea
							bind:value={freewrite}
							rows={3}
							required
							maxlength={2000}
							placeholder={copy.waitlist.thoughtPlaceholder}
						></textarea>
					</label>

					<label class="field">
						<span class="field-label">{copy.auth.email} *</span>
						<input
							type="email"
							bind:value={email}
							required
							placeholder="you@example.com"
							autocomplete="email"
							autocapitalize="off"
							autocorrect="off"
							spellcheck="false"
						/>
					</label>

					<label class="field">
						<span class="field-label">{copy.auth.name}</span>
						<input
							type="text"
							bind:value={name}
							maxlength={200}
							placeholder="Optional"
							autocomplete="name"
						/>
					</label>

					<label class="field">
						<span class="field-label">{copy.waitlist.city}</span>
						<select bind:value={city} class="city-select">
							<option value="">{copy.waitlist.selectCity}</option>
							<optgroup label={copy.waitlist.activeNow}>
								<option value="Berlin">Berlin</option>
							</optgroup>
							<optgroup label={copy.waitlist.comingSoon}>
								<option value="Hamburg">Hamburg</option>
								<option value="Munich">Munich</option>
								<option value="Vienna">Vienna</option>
								<option value="Amsterdam">Amsterdam</option>
								<option value="London">London</option>
								<option value="Paris">Paris</option>
								<option value="Barcelona">Barcelona</option>
								<option value="Lisbon">Lisbon</option>
								<option value="Copenhagen">Copenhagen</option>
								<option value="Stockholm">Stockholm</option>
								<option value="New York">New York</option>
								<option value="San Francisco">San Francisco</option>
								<option value="Other">Other</option>
							</optgroup>
						</select>
						<p class="city-note">{copy.waitlist.cityExpansionNote}</p>
					</label>

					{#if error && error !== 'already'}
						<p class="error-msg">{error}</p>
					{/if}

					<button class="btn-primary btn-primary--block" type="submit" disabled={loading || !freewrite.trim() || !email.trim()}>
						{loading ? copy.waitlist.sendingWaitlist : copy.waitlist.joinWaitlistButton}
					</button>
				</form>

				<p class="mode-switch">
					{copy.auth.alreadyHaveAccount} <button class="link-btn" onclick={() => switchMode('login')}>{copy.auth.logIn}</button>
				</p>
			{/if}

		{:else}
			<h2 id="auth-dialog-title" class="dialog-title">{copy.auth.logIn}</h2>

			<form method="POST" action="/login?/login" use:enhance={handleLoginEnhance}>
				<label class="field">
					<span class="field-label">{copy.auth.email}</span>
					<input
						type="email"
						name="email"
						bind:value={loginEmail}
						required
						autocomplete="email"
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
				{copy.auth.dontHaveAccount} <button class="link-btn" onclick={() => switchMode('waitlist')}>{copy.auth.join}</button>
			</p>
		{/if}
	</div>
</dialog>

<style>
	.auth-dialog {
		border: none;
		border-radius: var(--radius-card);
		padding: 0;
		max-width: 420px;
		width: calc(100% - var(--space-8));
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	.auth-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
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

	.field input, .field textarea {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.field input:focus, .field textarea:focus {
		outline: none;
		border-color: var(--text-muted);
	}

	.field textarea { resize: vertical; line-height: var(--leading-relaxed); }

	.city-select {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-sizing: border-box;
		cursor: pointer;
	}
	.city-select:focus { outline: none; border-color: var(--text-muted); }

	.city-note {
		margin: var(--space-2) 0 0;
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: 1.5;
	}

	.error-msg {
		font-size: var(--text-sm);
		color: var(--color-danger);
		margin: 0 0 var(--space-3);
	}

	.success-message {
		font-size: var(--text-md);
		line-height: var(--leading-relaxed);
		padding: var(--space-4) 0;
	}

	.success-message p { margin: 0; }

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
