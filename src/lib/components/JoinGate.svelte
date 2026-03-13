<script lang="ts">
	let name = $state('');
	let email = $state('');
	let freewrite = $state('');
	let expressionUrl = $state('');
	let expressionFileUrl = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let errorMsg = $state('');
	let uploading = $state(false);

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: form });
			if (!res.ok) throw new Error('Upload failed');
			const data = await res.json();
			expressionFileUrl = data.url ?? '';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Upload failed';
			status = 'error';
		} finally {
			uploading = false;
		}
	}

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
				body: JSON.stringify({
					email: email.trim(),
					name: name.trim() || undefined,
					freewrite: freewrite.trim(),
					expression_url: expressionUrl.trim() || undefined,
					expression_file_url: expressionFileUrl || undefined
				})
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

<div class="join-gate" id="join">
	{#if status === 'sent'}
		<p class="success-text">Thank you. We'll be in touch.</p>
	{:else}
		<p class="gate-intro">To read in full and continue this conversation in person, request to join.</p>
		<form onsubmit={handleSubmit}>
			<div class="field-group">
				<label for="jg-freewrite" class="field-label">Why do you want to join?</label>
				<textarea
					id="jg-freewrite"
					placeholder="What's in a conversation?"
					bind:value={freewrite}
					disabled={status === 'sending'}
					maxlength={2000}
					rows={4}
					required
				></textarea>
			</div>

			<div class="field-row">
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
			</div>

			<div class="field-group">
				<label for="jg-expression-url" class="field-label">A link to something of yours — website, Instagram, article, anything</label>
				<input
					id="jg-expression-url"
					type="url"
					placeholder="https://"
					bind:value={expressionUrl}
					disabled={status === 'sending'}
				/>
			</div>

			<div class="field-group">
				<label for="jg-expression-file" class="field-label">Or attach something — photo, doc, piece of writing</label>
				<input
					id="jg-expression-file"
					type="file"
					accept="image/*,.pdf,.doc,.docx,.txt"
					onchange={handleFileChange}
					disabled={status === 'sending' || uploading}
					class="file-input"
				/>
				{#if uploading}
					<span class="upload-status">Uploading...</span>
				{/if}
				{#if expressionFileUrl}
					<span class="upload-status upload-ok">Attached.</span>
				{/if}
			</div>

			<button type="submit" disabled={status === 'sending' || uploading}>
				{status === 'sending' ? 'Sending...' : 'Request to join'}
			</button>

			{#if status === 'error'}
				<p class="error-text">{errorMsg}</p>
			{/if}
		</form>
	{/if}
</div>

<style>
	.join-gate {
		padding: 40px 0 0;
	}

	.gate-intro {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		color: var(--text-muted, #666);
		margin: 0 0 24px;
		line-height: 1.6;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}

	.field-label {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		font-style: italic;
	}

	.field-row {
		display: flex;
		gap: 12px;
		margin-bottom: 16px;
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
		resize: vertical;
		line-height: 1.6;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}

	textarea:focus {
		outline: none;
		border-color: var(--text-muted, #666);
	}

	textarea:disabled {
		opacity: 0.6;
	}

	input[type='text'],
	input[type='email'],
	input[type='url'] {
		flex: 1;
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

	input[type='text']:focus,
	input[type='email']:focus,
	input[type='url']:focus {
		outline: none;
		border-color: var(--text-muted, #666);
	}

	input:disabled {
		opacity: 0.6;
	}

	.file-input {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
	}

	.upload-status {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 12px;
		color: var(--text-muted, #999);
	}

	.upload-ok {
		color: var(--text-primary, #1a1a1a);
	}

	button[type='submit'] {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 28px;
		border: 1px solid var(--text-primary, #1a1a1a);
		border-radius: 6px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	button[type='submit']:hover:not(:disabled) {
		opacity: 0.85;
	}

	button[type='submit']:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.success-text {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		color: var(--text-primary, #1a1a1a);
		margin: 0;
	}

	.error-text {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: #c00;
		margin: 8px 0 0;
	}

	textarea::placeholder,
	input::placeholder {
		color: var(--text-muted, #999);
	}

	@media (max-width: 768px) {
		.field-row {
			flex-direction: column;
		}
	}
</style>
