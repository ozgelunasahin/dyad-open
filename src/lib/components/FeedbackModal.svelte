<script lang="ts">
	import { copy } from '$lib/copy';

	let { isAdmin = false }: { isAdmin?: boolean } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let description = $state('');
	let type = $state<'bug' | 'feature' | 'report' | 'other'>('bug');
	let submitting = $state(false);
	let submitted = $state(false);
	let error = $state('');

	function open() {
		description = '';
		type = 'bug';
		submitted = false;
		error = '';
		dialog?.showModal();
	}

	async function submit() {
		if (description.length < 10) {
			error = copy.appFeedback.minLength;
			return;
		}
		submitting = true;
		error = '';
		const context = {
			page_url: window.location.href,
			user_agent: navigator.userAgent
		};
		try {
			const res = await fetch('/api/feedback/app', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, description, context })
			});
			if (res.ok) {
				submitted = true;
				setTimeout(() => dialog?.close(), 1500);
			} else {
				const body = await res.json().catch(() => ({}));
				error = (body as any).error ?? copy.common.submitFailed;
			}
		} catch {
			error = copy.common.networkError;
		} finally {
			submitting = false;
		}
	}
</script>

<div class="trigger-group">
	<button class="feedback-trigger" onclick={open} aria-label="Send feedback">?</button>
</div>

<dialog bind:this={dialog}>
	{#if submitted}
		<div class="feedback-success">
			<p>{copy.appFeedback.thankYou}</p>
		</div>
	{:else}
		<div class="feedback-form">
			<div class="feedback-header">
				<h3>{copy.appFeedback.sendFeedback}</h3>
				<button class="close-btn" onclick={() => dialog?.close()}>×</button>
			</div>

			<div class="type-selector">
				<button class="type-btn" class:active={type === 'bug'} onclick={() => type = 'bug'}>{copy.appFeedback.typeBug}</button>
				<button class="type-btn" class:active={type === 'feature'} onclick={() => type = 'feature'}>{copy.appFeedback.typeFeature}</button>
				<button class="type-btn" class:active={type === 'report'} onclick={() => type = 'report'}>{copy.appFeedback.typeReport}</button>
				<button class="type-btn" class:active={type === 'other'} onclick={() => type = 'other'}>{copy.appFeedback.typeOther}</button>
			</div>

			<textarea
				bind:value={description}
				placeholder={
					type === 'bug' ? copy.appFeedback.placeholderBug
					: type === 'feature' ? copy.appFeedback.placeholderFeature
					: type === 'report' ? copy.appFeedback.placeholderReport
					: copy.appFeedback.placeholderOther
				}
				rows={4}
				disabled={submitting}
			></textarea>

			{#if error}<p class="error">{error}</p>{/if}

			<button class="btn-primary" onclick={submit} disabled={submitting || description.length < 10}>
				{submitting ? copy.conversation.sending : copy.common.send}
			</button>
		</div>
	{/if}
</dialog>

<style>
	.trigger-group {
		position: fixed;
		bottom: calc(var(--space-5) + env(safe-area-inset-bottom, 0px));
		right: calc(var(--space-4) + env(safe-area-inset-right, 0px));
		display: flex;
		flex-direction: row;
		gap: var(--space-2);
		align-items: center;
		z-index: 900;
	}

	.admin-trigger {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--bg-canvas);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		transition: color 0.15s;
		border: 1px solid var(--border-link);
	}
	.admin-trigger:hover { color: var(--text-primary); }

	.feedback-trigger {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--text-primary);
		color: var(--bg-canvas);
		font-size: var(--text-lg);
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: opacity 0.15s;
	}
	.feedback-trigger:hover { opacity: var(--opacity-hover-btn); }

	dialog {
		border: none;
		border-radius: var(--radius-card);
		padding: 0;
		max-width: 420px;
		width: 90vw;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}

	.feedback-form {
		padding: var(--space-6);
	}

	.feedback-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}
	.feedback-header h3 {
		font-size: var(--text-lg);
		font-weight: normal;
		margin: 0;
	}
	.close-btn {
		font-size: var(--text-xl);
		color: var(--text-muted);
	}
	.close-btn:hover { color: var(--text-primary); }

	.type-selector {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}
	.type-btn {
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		color: var(--text-muted);
		transition: all 0.15s;
	}
	.type-btn.active {
		border-color: var(--text-primary);
		color: var(--text-primary);
		font-weight: 500;
	}

	textarea {
		width: 100%;
		font-size: var(--text-base);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		resize: vertical;
		line-height: 1.6;
		box-sizing: border-box;
		margin-bottom: var(--space-3);
	}
	textarea:focus { outline: none; border-color: var(--text-muted); }
	textarea::placeholder { color: var(--text-muted); }

	.error { font-size: var(--text-sm); color: var(--color-danger); margin: 0 0 var(--space-2); }

	.feedback-success {
		padding: var(--space-8) var(--space-6);
		text-align: center;
		font-size: var(--text-md);
		color: var(--text-primary);
	}
</style>
