<script lang="ts">
	let name = $state('');
	let email = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let errorMsg = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!email) return;

		status = 'sending';
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined })
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

<div class="join-section">
	<div class="layout">
		<div class="label-col">
			<span class="section-label">Join:</span>
		</div>
		<div class="form-col">
			{#if status === 'sent'}
				<p class="success-text">Thank you. We'll be in touch.</p>
			{:else}
				<p class="description">For all free thinkers who want company.</p>
				<form onsubmit={handleSubmit}>
					<div class="form-row">
						<input
							type="text"
							placeholder="Name"
							bind:value={name}
							disabled={status === 'sending'}
						/>
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

<style>
	.join-section {
		width: 100%;
		padding: 40px 16px;
		box-sizing: border-box;
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
		padding-top: 4px;
	}

	.section-label {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.25rem;
		color: var(--text-primary, #1a1a1a);
		font-weight: normal;
	}

	.description {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		color: var(--text-muted, #666);
		margin: 0 0 20px;
		line-height: 1.5;
		max-width: 480px;
	}

	.form-row {
		display: flex;
		gap: 12px;
		max-width: 560px;
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

	@media (max-width: 768px) {
		.layout {
			grid-template-columns: 1fr;
			gap: 16px;
		}

		.form-row {
			flex-direction: column;
		}
	}
</style>
