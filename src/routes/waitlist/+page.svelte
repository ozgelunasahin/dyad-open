<script lang="ts">
	import CitySearch from '$lib/components/CitySearch.svelte';

	let name = $state('');
	let email = $state('');
	let basedIn = $state('');
	let freewrite = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let errorMsg = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!email) return;

		if (!freewrite.trim()) {
			errorMsg = 'Please share your thoughts before joining.';
			status = 'error';
			return;
		}

		status = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, based_in: basedIn.trim() || undefined, freewrite: freewrite.trim() || undefined })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Something went wrong');
			}

			status = 'sent';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Something went wrong';
			status = 'error';
		}
	}
</script>

<svelte:head>
	<title>join - dyad. cultivating a culture of conversation</title>
</svelte:head>

<nav class="login-nav">
	<a href="/" class="logo-link" aria-label="Back to home">
		<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt="dyad" class="site-logo" />
	</a>
</nav>

<div class="split-layout">
	<div class="image-half">
		<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/sign%20in.jpeg" alt="" />
	</div>
	<div class="form-half">
		<div class="auth-card">
			<h1>Join</h1>
			<p class="subtitle">For those who seek conversation for its own sake and meet others with humility, critical thinking and deep listening.</p>

			{#if status === 'sent'}
				<div class="success-message">Thank you. We'll be in touch.</div>
			{:else}
				<form onsubmit={handleSubmit}>
					<div class="form-group">
						<label for="freewrite" class="freewrite-label">Why do you want to join?</label>
						<textarea
							id="freewrite"
							placeholder="What's in a conversation?"
							bind:value={freewrite}
							disabled={status === 'sending'}
							maxlength={2000}
							rows={4}
						></textarea>
					</div>
					<div class="form-group">
						<input
							type="text"
							placeholder="Name"
							bind:value={name}
							disabled={status === 'sending'}
						/>
					</div>
					<div class="form-group">
						<CitySearch bind:value={basedIn} disabled={status === 'sending'} />
					</div>
					<div class="form-group">
						<input
							type="email"
							placeholder="Email"
							bind:value={email}
							required
							disabled={status === 'sending'}
						/>
					</div>
					<button type="submit" class="submit-btn" disabled={status === 'sending'}>
						{status === 'sending' ? 'Sending...' : 'Join'}
					</button>
					{#if status === 'error'}
						<p class="error-text">{errorMsg}</p>
					{/if}
				</form>
			{/if}
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
		filter: none;
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
		font-family: 'SangBleu Sunrise', Georgia, serif;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.success-message {
		background: rgba(25, 135, 84, 0.1);
		border: 1px solid rgba(25, 135, 84, 0.3);
		color: #198754;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.freewrite-label {
		display: block;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-bottom: 6px;
		font-style: italic;
	}

	textarea {
		width: 100%;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-canvas);
		color: var(--text-primary);
		resize: vertical;
		line-height: 1.5;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	textarea:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	textarea::placeholder {
		color: var(--text-muted);
	}

	textarea:disabled {
		opacity: 0.6;
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

	.error-text {
		font-size: 0.85rem;
		color: #dc3545;
		margin: 8px 0 0;
	}

	/* === Mobile — image on top, form below === */
	@media (max-width: 768px) {
		.split-layout {
			flex-direction: column;
			height: auto;
			min-height: 100vh;
		}

		.image-half {
			width: 100%;
			height: 40vh;
			padding: 0;
		}

		.image-half img {
			border-radius: 0;
		}

		.image-half::after {
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			border-radius: 0;
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
