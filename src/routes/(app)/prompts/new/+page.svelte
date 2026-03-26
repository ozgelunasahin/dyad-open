<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>New prompt - dyad.berlin</title>
</svelte:head>

<div class="content">
	<h1 class="page-title">Start a new prompt</h1>
	<p class="page-desc">What would you like to talk about?</p>

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		<div class="field">
			<label for="title">Title</label>
			<input
				id="title"
				name="title"
				type="text"
				placeholder="Give your prompt a title..."
				required
				maxlength={200}
				disabled={loading}
			/>
		</div>

		<button type="submit" class="submit-btn" disabled={loading}>
			{loading ? 'Creating...' : 'Create prompt'}
		</button>
	</form>
</div>

<style>
	.content {
		width: 100%;
		max-width: 560px;
	}

	.page-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 8px;
	}

	.page-desc {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 0.9rem;
		color: var(--text-muted, #666);
		margin: 0 0 32px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 24px;
	}

	.field label {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
	}

	.field input {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 16px;
		padding: 12px 16px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary);
		width: 100%;
		box-sizing: border-box;
	}

	.field input:focus { outline: none; border-color: var(--text-muted, #666); }
	.field input::placeholder { color: var(--text-muted, #999); }

	.submit-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		padding: 10px 24px;
		border: 1px solid var(--text-primary, #1a1a1a);
		border-radius: 6px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.submit-btn:hover:not(:disabled) { opacity: 0.85; }
	.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.error {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: #c00;
		margin: 0 0 16px;
	}
</style>
