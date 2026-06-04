<script lang="ts">
	import { copy } from '$lib/copy';
	import { MIN_CAPACITY, MAX_CAPACITY } from '$lib/domain/types.js';

	interface Props {
		// Conversation size. 'one' = one-on-one (capacity 1); 'group' = the author
		// sets the max number of *others* (MIN..MAX_CAPACITY → up to MAX+1 people
		// total incl. the author). Set at publish; immutable afterwards.
		size?: 'one' | 'group';
		maxOthers?: number;
		disabled?: boolean;
	}

	let { size = $bindable('one'), maxOthers = $bindable(MAX_CAPACITY), disabled = false }: Props = $props();
</script>

<div class="size-picker">
	<span class="size-label">{copy.editor.sizeLabel}</span>
	<div class="size-options">
		<button
			type="button"
			class="size-option"
			class:selected={size === 'one'}
			aria-pressed={size === 'one'}
			onclick={() => (size = 'one')}
			{disabled}
		>{copy.editor.sizeOneOnOne}</button>
		<button
			type="button"
			class="size-option"
			class:selected={size === 'group'}
			aria-pressed={size === 'group'}
			onclick={() => (size = 'group')}
			{disabled}
		>{copy.editor.sizeGroup}</button>
	</div>
	{#if size === 'group'}
		<div class="size-max">
			<button
				type="button"
				class="size-step"
				aria-label={copy.editor.sizeFewer}
				onclick={() => (maxOthers = Math.max(MIN_CAPACITY, maxOthers - 1))}
				disabled={disabled || maxOthers <= MIN_CAPACITY}>&minus;</button>
			<span class="size-max-label">{copy.editor.sizeMaxOthers.replace('{n}', String(maxOthers))}</span>
			<button
				type="button"
				class="size-step"
				aria-label={copy.editor.sizeMore}
				onclick={() => (maxOthers = Math.min(MAX_CAPACITY, maxOthers + 1))}
				disabled={disabled || maxOthers >= MAX_CAPACITY}>+</button>
		</div>
	{/if}
</div>

<style>
	.size-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: var(--space-4) 0 0;
	}
	.size-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.size-options {
		display: flex;
		gap: var(--space-2);
	}
	.size-option {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		font-family: inherit;
		font-size: var(--text-sm);
		color: var(--text-primary);
		background: transparent;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}
	.size-option.selected {
		background: var(--bg-control);
		border-color: var(--text-primary);
	}
	.size-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.size-max {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.size-step {
		width: 32px;
		height: 32px;
		font-size: var(--text-md);
		line-height: 1;
		color: var(--text-primary);
		background: transparent;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		cursor: pointer;
	}
	.size-step:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.size-max-label {
		font-size: var(--text-sm);
		color: var(--text-primary);
		min-width: 96px;
		text-align: center;
	}
</style>
