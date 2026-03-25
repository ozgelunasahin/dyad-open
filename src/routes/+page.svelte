<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { createBrowserClient } from '@supabase/ssr';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import ConversationCard from '$lib/components/ConversationCard.svelte';
	import RotatingConversationHeadline from '$lib/components/RotatingConversationHeadline.svelte';

	let { data } = $props();

	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

	// ── Join modal ──────────────────────────────────────────────────────────────
	let showJoinForm = $state(false);
	let joinName = $state('');
	let joinEmail = $state('');
	let joinBasedIn = $state('');
	let joinFreewrite = $state('');
	let joinExpressionUrl = $state('');
	let joinStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let joinError = $state('');

	// City typeahead
	const CITIES = ['Berlin', 'London', 'Amsterdam', 'Paris', 'Vienna', 'Zürich', 'Istanbul', 'New York', 'Barcelona', 'Rome', 'Lisbon', 'Stockholm', 'Copenhagen', 'Oslo', 'Helsinki', 'Warsaw', 'Prague', 'Budapest', 'Athens', 'Other'];
	let cityDropdownOpen = $state(false);
	let citySuggestions = $derived.by(() => {
		if (!joinBasedIn.trim()) return CITIES;
		const q = joinBasedIn.toLowerCase();
		return CITIES.filter(c => c.toLowerCase().includes(q));
	});
	function selectCity(city: string) {
		joinBasedIn = city;
		cityDropdownOpen = false;
	}

	function openJoin() { showJoinForm = true; }
	function closeJoin() { if (joinStatus !== 'sending') showJoinForm = false; }

	async function handleJoinSubmit(e: Event) {
		e.preventDefault();
		if (!joinFreewrite.trim()) {
			joinError = 'Please share why you want to join.';
			joinStatus = 'error';
			return;
		}
		joinStatus = 'sending';
		joinError = '';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: joinEmail.trim(),
					name: joinName.trim() || undefined,
					based_in: joinBasedIn.trim() || undefined,
					freewrite: joinFreewrite.trim(),
					expression_url: joinExpressionUrl.trim() || undefined
				})
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error || 'Something went wrong');
			}
			joinStatus = 'sent';
		} catch (err) {
			joinError = err instanceof Error ? err.message : 'Something went wrong';
			joinStatus = 'error';
		}
	}

	// ── Login modal ─────────────────────────────────────────────────────────────
	let showLoginForm = $state(false);
	let loginMode = $state<'login' | 'reset'>('login');
	let loginEmail = $state('');
	let loginPassword = $state('');
	let loginStatus = $state<'idle' | 'loading' | 'reset_sent' | 'error'>('idle');
	let loginError = $state('');

	function openLogin() { showLoginForm = true; loginMode = 'login'; loginError = ''; }
	function closeLogin() { if (loginStatus !== 'loading') showLoginForm = false; }

	async function handleLogin(e: Event) {
		e.preventDefault();
		loginStatus = 'loading';
		loginError = '';
		if (loginMode === 'reset') {
			const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
				redirectTo: `${window.location.origin}/auth/callback?type=recovery`
			});
			if (error) {
				loginError = error.message;
				loginStatus = 'error';
			} else {
				loginStatus = 'reset_sent';
			}
			return;
		}
		const { error } = await supabase.auth.signInWithPassword({
			email: loginEmail.trim(),
			password: loginPassword
		});
		if (error) {
			loginError = error.message;
			loginStatus = 'error';
		} else {
			window.location.href = '/discover';
		}
	}

	// ── City rotation ───────────────────────────────────────────────────────────
	const cities = ['Berlin'];
	let cityIndex = $state(0);
	let cityVisible = $state(true);

	onMount(() => {
		if (cities.length < 2) return;
		const interval = setInterval(() => {
			cityVisible = false;
			setTimeout(() => {
				cityIndex = (cityIndex + 1) % cities.length;
				cityVisible = true;
			}, 250);
		}, 2000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>dyad. cultivating a culture of conversation</title>
	<meta name="description" content="Social civic infrastructure for community bridging in Berlin." />
</svelte:head>

<!-- ═══════════════════════════════════════════════════════ Split layout ══ -->
<div class="landing">

	<!-- Left: fixed hero panel -->
	<div class="left-col">
		<div class="left-top">
			<img
				src="/images/logo.png"
				alt="dyad."
				class="logo"
			/>
			<button class="login-link" onclick={openLogin}>log in</button>
		</div>

		<div class="hero-content">
			<RotatingConversationHeadline />

			<p class="tagline">cultivating a culture<br />of conversation</p>

			<div class="city-row">
				<span class="city-dot" aria-hidden="true"></span>
				<span class="city-name" class:city-hidden={!cityVisible}>
					{cities[cityIndex]}
				</span>
			</div>

			<button class="join-btn" onclick={openJoin}>
				join waitlist <span class="arrow" aria-hidden="true">→</span>
			</button>
		</div>

		<div class="left-footer">
			<button class="theme-toggle" onclick={() => themeStore.toggle()} aria-label="Toggle theme">
				{#if themeStore.current === 'light'}
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
						<path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					</svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
						<path d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				{/if}
			</button>
			<div class="footer-legal">
				<div class="legal-links">
					<a href="/privacy" class="legal-link">privacy policy</a>
					<span class="legal-sep">|</span>
					<a href="/terms" class="legal-link">terms of service</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Right: scrollable conversation cards -->
	<div class="right-col">
		<div class="cards-scroll">
			{#if data.conversations && data.conversations.length > 0}
				{#each data.conversations as conv}
					<ConversationCard conversation={conv} onopen={openJoin} />
				{/each}
			{:else}
				<p class="empty-state">No conversations yet.</p>
			{/if}
		</div>
	</div>
</div>

<!-- ═══════════════════════════════════════════════════════ Login modal ══ -->
{#if showLoginForm}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-backdrop" onclick={closeLogin} transition:fade={{ duration: 200 }}>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			transition:fly={{ y: 20, duration: 260, opacity: 0 }}
			role="dialog"
			aria-modal="true"
			aria-label="Log in"
			tabindex="-1"
		>
			<div class="modal-header">
				<h2 class="modal-title">
					{loginMode === 'login' ? 'Welcome back' : 'Reset password'}
				</h2>
				<button class="modal-close" onclick={closeLogin} aria-label="Close">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</button>
			</div>

			{#if loginStatus === 'reset_sent'}
				<p class="modal-desc">Check your email for a reset link.</p>
				<button class="close-link" onclick={() => { loginMode = 'login'; loginStatus = 'idle'; }}>
					Back to sign in
				</button>
			{:else}
				<form class="modal-form" onsubmit={handleLogin}>
					<div class="field">
						<label for="l-email">Email</label>
						<input
							id="l-email"
							type="email"
							bind:value={loginEmail}
							required
							disabled={loginStatus === 'loading'}
							autocomplete="email"
						/>
					</div>

					{#if loginMode === 'login'}
						<div class="field">
							<label for="l-password">Password</label>
							<input
								id="l-password"
								type="password"
								bind:value={loginPassword}
								required
								disabled={loginStatus === 'loading'}
								autocomplete="current-password"
							/>
						</div>
					{/if}

					{#if loginStatus === 'error'}
						<p class="form-error">{loginError}</p>
					{/if}

					<button type="submit" class="submit-btn" disabled={loginStatus === 'loading'}>
						{#if loginStatus === 'loading'}
							{loginMode === 'login' ? 'Signing in…' : 'Sending…'}
						{:else}
							{loginMode === 'login' ? 'Sign in' : 'Send reset link'}
						{/if}
					</button>

					<div class="auth-links">
						{#if loginMode === 'login'}
							<button type="button" class="text-link" onclick={() => { loginMode = 'reset'; loginError = ''; loginStatus = 'idle'; }}>
								Forgot password?
							</button>
						{:else}
							<button type="button" class="text-link" onclick={() => { loginMode = 'login'; loginError = ''; loginStatus = 'idle'; }}>
								Back to sign in
							</button>
						{/if}
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

<!-- ═══════════════════════════════════════════════════════ Join modal ══ -->
{#if showJoinForm}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-backdrop" onclick={closeJoin} transition:fade={{ duration: 200 }}>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			transition:fly={{ y: 20, duration: 260, opacity: 0 }}
			role="dialog"
			aria-modal="true"
			aria-label="Request to join"
			tabindex="-1"
		>
			{#if joinStatus === 'sent'}
				<div class="modal-sent">
					<p class="sent-msg">Thank you. We'll be in touch.</p>
					<button class="close-link" onclick={() => { showJoinForm = false; joinStatus = 'idle'; }}>
						Close
					</button>
				</div>
			{:else}
				<div class="modal-header">
					<h2 class="modal-title">Request to join</h2>
					<button class="modal-close" onclick={closeJoin} aria-label="Close">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
					</button>
				</div>

				<p class="modal-desc">For those who seek conversation for its own sake.</p>

				<form class="modal-form" onsubmit={handleJoinSubmit}>
					<div class="field-row">
						<input
							type="text"
							placeholder="Name"
							bind:value={joinName}
							disabled={joinStatus === 'sending'}
						/>
						<input
							type="email"
							placeholder="Email"
							bind:value={joinEmail}
							required
							disabled={joinStatus === 'sending'}
						/>
					</div>

					<div class="field">
						<label for="m-freewrite">Why do you want to join?</label>
						<textarea
							id="m-freewrite"
							placeholder="What's in a conversation?"
							bind:value={joinFreewrite}
							rows={4}
							maxlength={2000}
							required
							disabled={joinStatus === 'sending'}
						></textarea>
					</div>

					<div class="field">
						<label for="m-based">Where are you based?</label>
						<div class="city-wrap">
							<input
								id="m-based"
								type="text"
								placeholder="Type a city…"
								bind:value={joinBasedIn}
								disabled={joinStatus === 'sending'}
								onfocus={() => cityDropdownOpen = true}
								oninput={() => cityDropdownOpen = true}
								onblur={() => setTimeout(() => cityDropdownOpen = false, 150)}
								autocomplete="off"
							/>
							{#if cityDropdownOpen && citySuggestions.length > 0}
								<div class="city-dropdown">
									{#each citySuggestions as city}
										<button
											type="button"
											class="city-option"
											onmousedown={(e) => { e.preventDefault(); selectCity(city); }}
										>{city}</button>
									{/each}
								</div>
							{/if}
						</div>
						<span class="field-hint">We're currently running conversations in Berlin.</span>
					</div>

					<div class="field">
						<label for="m-expression">Share one thing about yourself</label>
						<input
							id="m-expression"
							type="url"
							placeholder="A link — website, Instagram, project, article…"
							bind:value={joinExpressionUrl}
							disabled={joinStatus === 'sending'}
						/>
					</div>

					<button type="submit" class="submit-btn" disabled={joinStatus === 'sending'}>
						{joinStatus === 'sending' ? 'Sending…' : 'Request to join'}
					</button>

					{#if joinStatus === 'error'}
						<p class="form-error">{joinError}</p>
					{/if}
				</form>

				<p class="join-login-hint">
					Already a member?
					<button type="button" class="text-link" onclick={() => { closeJoin(); openLogin(); }}>
						Log in
					</button>
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ── Layout ──────────────────────────────────────────────────────────────── */
	.landing {
		display: grid;
		grid-template-columns: 1fr 1fr;
		height: 100vh;
		overflow: hidden;
		background: var(--bg-canvas);
	}

	/* ── Left column ─────────────────────────────────────────────────────────── */
	.left-col {
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding: 24px 40px 28px;
		box-sizing: border-box;
		border-right: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
		overflow: hidden;
	}

	.left-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.logo {
		height: 28px;
		width: auto;
		filter: brightness(0);
		transition: filter 0.2s ease;
	}

	:global([data-theme='dark']) .logo {
		filter: none;
	}

	.login-link {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 11px;
		letter-spacing: 0.06em;
		text-transform: lowercase;
		color: var(--text-muted, #999);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: color 0.15s;
	}

	.login-link:hover { color: var(--text-primary, #1a1a1a); }

	.hero-content {
		margin-top: auto;
		padding-bottom: 8px;
	}

.tagline {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: clamp(0.82rem, 1.1vw, 0.95rem);
		font-weight: normal;
		line-height: 1.55;
		color: var(--text-primary, #1a1a1a);
		margin: 0 0 32px;
		border-left: 2px solid var(--text-primary, #1a1a1a);
		padding-left: 12px;
	}

	.city-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 28px;
	}

	.city-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #3d9e5a;
		flex-shrink: 0;
		animation: pulse 2.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.city-name {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted, #666);
		transition: opacity 0.25s ease;
	}

	.city-hidden { opacity: 0; }

	.join-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: var(--bg-canvas, #f5f3f0);
		background: var(--text-primary, #1a1a1a);
		border: 1px solid var(--text-primary, #1a1a1a);
		border-radius: 6px;
		padding: 10px 20px;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		transition: opacity 0.15s;
	}

	.join-btn:hover { opacity: 0.82; }
	.arrow { font-size: 13px; }

	.left-footer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-top: 24px;
		flex-shrink: 0;
	}

	.footer-legal {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.copyright {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 11px;
		color: var(--text-muted, #999);
		margin: 0;
	}

	.legal-links {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.legal-link {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 11px;
		color: var(--text-muted, #999);
		text-decoration: none;
		transition: color 0.15s;
	}

	.legal-link:hover { color: var(--text-primary, #1a1a1a); }

	.legal-sep {
		font-size: 11px;
		color: var(--text-muted, #bbb);
	}

	.theme-toggle {
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 4px;
		background: var(--bg-control, rgba(0, 0, 0, 0.04));
		cursor: pointer;
		color: var(--text-muted, #8b7355);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		opacity: 0.5;
		flex-shrink: 0;
	}

	.theme-toggle:hover { opacity: 1; color: var(--text-primary, #1a1a1a); }

	@media (max-width: 430px) {
		.theme-toggle { display: none; }
	}

	/* ── Right column ────────────────────────────────────────────────────────── */
	.right-col {
		height: 100vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		padding: 24px 32px;
		box-sizing: border-box;
	}

	.cards-scroll {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* Distribute cards to fill full height with no scroll */
	.cards-scroll :global(.row) {
		flex: 1;
		min-height: 0;
		padding: 0;
		align-items: center;
	}

	.cards-scroll :global(.thumb) {
		width: 96px;
		height: 96px;
		flex-shrink: 0;
	}

	.cards-scroll :global(.snippet) {
		-webkit-line-clamp: 2;
	}

	.cards-scroll :global(.title) {
		font-size: 0.95rem;
		margin: 2px 0 3px;
	}

	.cards-scroll :global(.meta-row) {
		margin-bottom: 2px;
	}

	.empty-state {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: var(--text-muted, #999);
		margin: 0;
	}

	/* ── Shared modal styles ─────────────────────────────────────────────────── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.32);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 400;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.modal {
		background: var(--bg-canvas, #f5f3f0);
		border-radius: 12px;
		padding: 36px 40px;
		width: 100%;
		max-width: 440px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
		box-sizing: border-box;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.modal-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.4rem;
		font-weight: normal;
		color: var(--text-primary, #1a1a1a);
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		padding: 2px;
		cursor: pointer;
		color: var(--text-muted, #999);
		display: flex;
		align-items: center;
		transition: color 0.15s;
		flex-shrink: 0;
		margin-left: 16px;
		margin-top: 4px;
	}

	.modal-close:hover { color: var(--text-primary, #1a1a1a); }

	.modal-desc {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		font-style: italic;
		color: var(--text-muted, #666);
		margin: 0 0 28px;
		line-height: 1.6;
	}

	.modal-form {
		display: flex;
		flex-direction: column;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 7px;
		margin-bottom: 18px;
	}

	.field label {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		font-style: italic;
	}

	.city-wrap {
		position: relative;
	}

	.city-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-canvas, #f5f3f0);
		border: 1px solid var(--border-link, rgba(0,0,0,0.12));
		border-top: none;
		border-radius: 0 0 6px 6px;
		max-height: 180px;
		overflow-y: auto;
		z-index: 10;
		box-shadow: 0 4px 12px rgba(0,0,0,0.08);
	}

	.city-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 9px 14px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link, rgba(0,0,0,0.06));
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		transition: background 0.1s;
	}

	.city-option:last-child { border-bottom: none; }
	.city-option:hover { background: var(--bg-control, rgba(0,0,0,0.03)); }

	.field-hint {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 12px;
		color: var(--text-muted, #999);
	}

	.field-row {
		display: flex;
		gap: 10px;
		margin-bottom: 20px;
	}

	.field-row input { flex: 1; }

	textarea,
	input[type='text'],
	input[type='email'],
	input[type='url'],
	input[type='password'] {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 14px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary, #1a1a1a);
		transition: border-color 0.15s;
		box-sizing: border-box;
		width: 100%;
	}

	textarea { resize: vertical; line-height: 1.6; }

	textarea:focus, input:focus {
		outline: none;
		border-color: var(--text-muted, #666);
	}

	textarea:disabled, input:disabled { opacity: 0.6; }
	textarea::placeholder, input::placeholder { color: var(--text-muted, #999); }

	.submit-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 11px 28px;
		border: 1px solid var(--text-primary, #1a1a1a);
		border-radius: 6px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		cursor: pointer;
		transition: opacity 0.15s;
		align-self: flex-start;
		width: 100%;
	}

	.submit-btn:hover:not(:disabled) { opacity: 0.85; }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.form-error {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: #c00;
		margin: 10px 0 0;
	}

	.auth-links {
		margin-top: 16px;
		display: flex;
		gap: 16px;
	}

	.text-link {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.15));
		padding: 0 0 1px;
		cursor: pointer;
		transition: color 0.15s;
	}

	.text-link:hover { color: var(--text-primary, #1a1a1a); }

	.modal-sent {
		text-align: center;
		padding: 16px 0;
	}

	.sent-msg {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 16px;
		color: var(--text-primary, #1a1a1a);
		margin: 0 0 20px;
	}

	.join-login-hint {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #999);
		margin: 20px 0 0;
		text-align: center;
	}

	.close-link {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: var(--text-muted, #666);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	/* ── Mobile ──────────────────────────────────────────────────────────────── */
	@media (max-width: 430px) {
		:global(body) { overflow: auto; }

		.landing {
			grid-template-columns: 1fr;
			height: auto;
			overflow: auto;
		}

		.left-col {
			height: 100vh;
			min-height: 100vh;
			border-right: none;
			border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
			padding: 20px 20px 28px;
			overflow: hidden;
		}

		/* hero-text font handled in RotatingConversationHeadline */

		.right-col {
			height: 100vh;
			overflow: hidden;
			padding: 0;
			display: flex;
			flex-direction: column;
		}
		.cards-scroll {
			flex: 1;
			min-height: 0;
			overflow-y: auto;
			display: block;
			padding: 24px 16px 48px;
		}
		.cards-scroll :global(.row) {
			flex: unset;
			padding: 14px 0;
			align-items: flex-start;
		}
		.cards-scroll :global(.thumb) {
			width: 72px;
			height: 72px;
		}
		.cards-scroll :global(.snippet) {
			-webkit-line-clamp: 2;
		}
		.cards-scroll :global(.title) {
			font-size: 1rem;
			margin: 4px 0 5px;
		}
		.cards-scroll :global(.meta-row) {
			margin-bottom: 5px;
		}

		.modal { padding: 28px 24px; }
		.field-row { flex-direction: column; }
	}
</style>
