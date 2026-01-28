<script lang="ts">
	export interface SiteSection {
		id: string;
		type: 'canvas' | 'hero' | 'contact';
		name: string;
		position: number;
		config?: Record<string, unknown>;
		/** For canvas sections — the underlying canvas id */
		canvasId?: string;
		canvasSlug?: string;
	}

	interface Props {
		sections: SiteSection[];
		onReorder: (sections: SiteSection[]) => void;
		onRemove: (section: SiteSection) => void;
		onAdd: (type: 'canvas' | 'hero' | 'contact') => void;
		selectedId?: string | null;
		onSelect?: (section: SiteSection) => void;
	}

	let { sections, onReorder, onRemove, onAdd, selectedId = null, onSelect }: Props = $props();

	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let showAddMenu = $state(false);

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

		const updated = [...sections];
		const [removed] = updated.splice(draggedIndex, 1);
		updated.splice(targetIndex, 0, removed);

		updated.forEach((s, i) => {
			s.position = i + 1;
		});

		onReorder(updated);
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function getTypeLabel(type: string): string {
		switch (type) {
			case 'canvas': return 'Canvas';
			case 'hero': return 'Hero';
			case 'contact': return 'Contact';
			default: return type;
		}
	}

	function getTypeIcon(type: string): string {
		switch (type) {
			case 'canvas': return '◇';
			case 'hero': return '▲';
			case 'contact': return '✉';
			default: return '•';
		}
	}
</script>

<div class="section-list">
	<div class="section-header">
		<h3>Site Sections</h3>
		<div class="add-wrapper">
			<button class="add-btn" onclick={() => showAddMenu = !showAddMenu}>
				+ Add Section
			</button>
			{#if showAddMenu}
				<div class="add-menu">
					<button onclick={() => { onAdd('canvas'); showAddMenu = false; }}>
						◇ Canvas
					</button>
					<button onclick={() => { onAdd('hero'); showAddMenu = false; }}>
						▲ Hero Section
					</button>
					<button onclick={() => { onAdd('contact'); showAddMenu = false; }}>
						✉ Contact Form
					</button>
				</div>
			{/if}
		</div>
	</div>

	{#if sections.length === 0}
		<p class="empty-hint">No sections yet. Add canvases or custom sections above.</p>
	{:else}
		<ul class="items">
			{#each sections as section, i (section.id)}
				<li
					class="item"
					class:dragging={draggedIndex === i}
					class:drag-over={dragOverIndex === i}
					class:selected={selectedId === section.id}
					draggable="true"
					onclick={() => onSelect?.(section)}
					ondragstart={(e) => handleDragStart(e, i)}
					ondragover={(e) => handleDragOver(e, i)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, i)}
					ondragend={handleDragEnd}
				>
					<span class="drag-handle">⋮⋮</span>
					<span class="type-icon">{getTypeIcon(section.type)}</span>
					<span class="item-name">{section.name}</span>
					<span class="type-badge">{getTypeLabel(section.type)}</span>
					<button
						class="remove-btn"
						onclick={(e) => { e.stopPropagation(); onRemove(section); }}
						aria-label="Remove section"
					>
						×
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.section-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-header h3 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.add-wrapper {
		position: relative;
	}

	.add-btn {
		padding: 0.35rem 0.75rem;
		font-size: 0.85rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.2s;
	}

	.add-btn:hover {
		border-color: var(--border-link-hover);
	}

	.add-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 10;
		min-width: 160px;
	}

	.add-menu button {
		display: block;
		width: 100%;
		padding: 0.6rem 0.75rem;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.9rem;
		color: var(--text-secondary);
		transition: background 0.15s;
	}

	.add-menu button:hover {
		background: var(--bg-control);
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

	.items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0.75rem;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 4px;
		cursor: grab;
		transition: border-color 0.2s, background 0.2s;
	}

	.item:hover {
		border-color: var(--border-link-hover);
	}

	.item.dragging {
		opacity: 0.5;
	}

	.item.drag-over {
		border-color: var(--text-link);
		background: rgba(139, 115, 85, 0.05);
	}

	.item.selected {
		border-color: var(--text-link);
		background: rgba(139, 115, 85, 0.1);
	}

	.item:active {
		cursor: grabbing;
	}

	.drag-handle {
		color: var(--text-muted);
		font-size: 1rem;
		user-select: none;
	}

	.type-icon {
		font-size: 0.85rem;
		color: var(--text-muted);
		width: 1.2em;
		text-align: center;
	}

	.item-name {
		flex: 1;
		color: var(--text-primary);
		font-size: 0.95rem;
	}

	.type-badge {
		font-size: 0.75rem;
		color: var(--text-muted);
		background: var(--bg-control);
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0 0.25rem;
		line-height: 1;
		transition: color 0.15s;
	}

	.remove-btn:hover {
		color: #dc3545;
	}
</style>
