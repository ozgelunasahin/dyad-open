<script lang="ts">
	interface Props {
		title?: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm: () => void;
	}

	let { title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm }: Props = $props();
	let dialog: HTMLDialogElement | undefined = $state();

	export function open() {
		dialog?.showModal();
	}

	function handleConfirm() {
		dialog?.close();
		onConfirm();
	}
</script>

<dialog bind:this={dialog}>
	<div class="confirm-content">
		<h3 class="confirm-title">{title}</h3>
		<p class="confirm-message">{message}</p>
		<div class="confirm-actions">
			<button class="btn-secondary" onclick={() => dialog?.close()}>{cancelLabel}</button>
			<button class="btn-primary" onclick={handleConfirm}>{confirmLabel}</button>
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		border-radius: var(--radius-card);
		padding: 0;
		max-width: 380px;
		width: 90vw;
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	.btn-secondary {
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-5);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: none;
		color: var(--text-primary);
		cursor: pointer;
	}
	.btn-secondary:hover { border-color: var(--text-primary); }

	.btn-primary {
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-5);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-input);
		background: var(--text-primary);
		color: var(--bg-canvas);
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-primary:hover { opacity: var(--opacity-hover-btn); }

	.confirm-content {
		padding: var(--space-6);
	}

	.confirm-title {
		font-size: var(--text-lg);
		font-weight: 500;
		margin: 0 0 var(--space-2);
	}

	.confirm-message {
		font-size: var(--text-md);
		color: var(--text-secondary);
		line-height: var(--leading-relaxed);
		margin: 0 0 var(--space-6);
	}

	.confirm-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
	}
</style>
