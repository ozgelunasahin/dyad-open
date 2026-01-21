<script lang="ts">
	interface Canvas {
		id: string;
		name: string;
		slug: string;
		included: boolean;
		position: number;
	}

	interface Props {
		canvases: Canvas[];
		onUpdate: (canvases: Canvas[]) => void;
		selectedId?: string | null;
		onSelect?: (id: string) => void;
	}

	let { canvases, onUpdate, selectedId = null, onSelect }: Props = $props();

	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function toggleCanvas(index: number, e: Event) {
		e.stopPropagation();
		const updated = [...canvases];
		updated[index] = { ...updated[index], included: !updated[index].included };
		onUpdate(updated);
	}

	function selectCanvas(id: string) {
		onSelect?.(id);
	}

	function handleDragStart(e: DragEvent, index: number) {
		draggedIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			dragOverIndex = index;
		}
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, targetIndex: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === targetIndex) return;

		const updated = [...canvases];
		const [removed] = updated.splice(draggedIndex, 1);
		updated.splice(targetIndex, 0, removed);

		// Update positions
		updated.forEach((canvas, i) => {
			canvas.position = i + 1;
		});

		onUpdate(updated);
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	// Separate included and excluded canvases
	let includedCanvases = $derived(
		canvases
			.map((c, i) => ({ ...c, originalIndex: i }))
			.filter((c) => c.included)
			.sort((a, b) => a.position - b.position)
	);

	let excludedCanvases = $derived(
		canvases
			.map((c, i) => ({ ...c, originalIndex: i }))
			.filter((c) => !c.included)
	);
</script>

<div class="canvas-selector">
	<div class="section">
		<h3>Included in Site</h3>
		{#if includedCanvases.length === 0}
			<p class="empty-hint">No canvases selected. Check canvases below to include them.</p>
		{:else}
			<ul class="canvas-list included">
				{#each includedCanvases as canvas, i (canvas.id)}
					<li
						class="canvas-item"
						class:dragging={draggedIndex === canvas.originalIndex}
						class:drag-over={dragOverIndex === canvas.originalIndex}
						class:selected={selectedId === canvas.id}
						draggable="true"
						onclick={() => selectCanvas(canvas.id)}
						ondragstart={(e) => handleDragStart(e, canvas.originalIndex)}
						ondragover={(e) => handleDragOver(e, canvas.originalIndex)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, canvas.originalIndex)}
						ondragend={handleDragEnd}
					>
						<span class="drag-handle">⋮⋮</span>
						<input
							type="checkbox"
							checked={canvas.included}
							onchange={(e) => toggleCanvas(canvas.originalIndex, e)}
						/>
						<span class="canvas-name">{canvas.name}</span>
						<span class="canvas-slug">/{canvas.slug}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if excludedCanvases.length > 0}
		<div class="section">
			<h3>Available Canvases</h3>
			<ul class="canvas-list">
				{#each excludedCanvases as canvas (canvas.id)}
					<li class="canvas-item">
						<input
							type="checkbox"
							checked={canvas.included}
							onchange={(e) => toggleCanvas(canvas.originalIndex, e)}
						/>
						<span class="canvas-name">{canvas.name}</span>
						<span class="canvas-slug">/{canvas.slug}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.canvas-selector {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section h3 {
		margin: 0 0 0.75rem 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.empty-hint {
		color: var(--text-muted);
		font-size: 0.9rem;
		font-style: italic;
		margin: 0;
		padding: 1rem;
		background: var(--bg-control);
		border-radius: 4px;
	}

	.canvas-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.canvas-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 4px;
		transition: border-color 0.2s, background 0.2s;
	}

	.canvas-item:hover {
		border-color: var(--border-link-hover);
	}

	.canvas-item.dragging {
		opacity: 0.5;
	}

	.canvas-item.drag-over {
		border-color: var(--text-link);
		background: rgba(139, 115, 85, 0.05);
	}

	.canvas-item.selected {
		border-color: var(--text-link);
		background: rgba(139, 115, 85, 0.1);
	}

	.included .canvas-item {
		cursor: grab;
	}

	.included .canvas-item:active {
		cursor: grabbing;
	}

	.drag-handle {
		color: var(--text-muted);
		font-size: 1rem;
		cursor: grab;
		user-select: none;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	input[type='checkbox'] {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: var(--text-link);
	}

	.canvas-name {
		flex: 1;
		color: var(--text-primary);
		font-size: 0.95rem;
	}

	.canvas-slug {
		color: var(--text-muted);
		font-size: 0.85rem;
		font-family: monospace;
	}
</style>
