<script lang="ts">
	import CitySearch from './CitySearch.svelte';

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

<div class="join-section" id="join">
	<div class="join-cover">
		<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/log%20in.jpeg" alt="" />
	</div>
	<div class="layout">
		<div class="label-col">
			<span class="section-label">Join:</span>
		</div>
		<div class="form-col">
			<div class="form-content">
				{#if status === 'sent'}
					<p class="success-text">Thank you. We'll be in touch.</p>
				{:else}
					<p class="description">For those who seek conversation for its own sake and meet others with humility, critical thinking and deep listening.</p>
					<form onsubmit={handleSubmit}>
						<div class="freewrite-group">
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
						<div class="form-row">
							<input
								type="text"
								placeholder="Name"
								bind:value={name}
								disabled={status === 'sending'}
							/>
							<CitySearch bind:value={basedIn} disabled={status === 'sending'} />
							<input
								type="email"
								placeholder="Email"
								bind:value={email}
								required
								disabled={status === 'sending'}
							/>
							<button type="submit" disabled={status === 'sending'}>
								{status === 'sending' ? 'Sending...' : 'Join'}
							</button>
						</div>
						{#if status === 'error'}
							<p class="error-text">{errorMsg}</p>
						{/if}
					</form>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.join-section {
		width: 100%;
		padding: 40px 16px;
		box-sizing: border-box;
	}

	.join-cover {
		display: none;
	}

	.layout {
		display: grid;
		grid-template-columns: 1fr 3fr;
		gap: 32px;
		width: 100%;
		max-width: 1400px;
		align-items: start;
	}

	.label-col {
		padding-top: 0;
	}

	.section-label {
		font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted, #666);
	}

	/* 3-column sub-grid matching Field Notes cards-col */
	.form-col {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
	}

	/* Form content spans first 2 of 3 columns */
	.form-content {
		grid-column: 1 / 3;
	}

	.description {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		color: var(--text-muted, #666);
		margin: 0 0 20px;
		line-height: 1.5;
	}

	.freewrite-group {
		margin-bottom: 20px;
	}

	.freewrite-label {
		display: block;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: var(--text-muted, #666);
		margin-bottom: 8px;
		font-style: italic;
	}

	textarea {
		width: 100%;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 14px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary, #1a1a1a);
		transition: border-color 0.15s;
		resize: vertical;
		line-height: 1.6;
		box-sizing: border-box;
	}

	textarea::placeholder {
		color: var(--text-muted, #999);
	}

	textarea:focus {
		outline: none;
		border-color: var(--text-muted, #666);
	}

	textarea:disabled {
		opacity: 0.6;
	}

	.form-row {
		display: flex;
		gap: 12px;
	}

	input {
		flex: 1;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 14px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary, #1a1a1a);
		transition: border-color 0.15s;
	}

	input::placeholder {
		color: var(--text-muted, #999);
	}

	input:focus {
		outline: none;
		border-color: var(--text-muted, #666);
	}

	input:disabled {
		opacity: 0.6;
	}

	button {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 24px;
		border: 1px solid var(--text-primary, #1a1a1a);
		border-radius: 6px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	button:hover:not(:disabled) {
		opacity: 0.85;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.success-text {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		color: var(--text-primary, #1a1a1a);
		margin: 0;
		line-height: 1.5;
	}

	.error-text {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: #c00;
		margin: 8px 0 0;
	}

	@media (max-width: 430px) {
		.join-section {
			padding: 0 8px;
		}

		.join-cover {
			display: block;
			width: 100%;
			margin-bottom: 12px;
		}

		.join-cover img {
			width: 100%;
			height: 50vh;
			object-fit: cover;
			object-position: center;
			display: block;
			border-radius: 6px;
		}

		.layout {
			grid-template-columns: 1fr;
			gap: 16px;
		}

		.form-col {
			grid-template-columns: 1fr;
		}

		.form-content {
			grid-column: 1;
		}

		.form-row {
			flex-direction: column;
		}
	}
</style>
