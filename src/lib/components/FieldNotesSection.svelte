<script lang="ts">
	interface Highlight {
		id: string;
		title: string;
		subtitle: string | null;
		image_url: string | null;
		link: string | null;
		position: number;
	}

	interface Props {
		highlights: Highlight[];
		isEditMode?: boolean;
	}

	let { highlights, isEditMode = false }: Props = $props();

	let items = $state<Highlight[]>([]);
	let dragOverId = $state<string | null>(null);
	let saving = $state<string | null>(null);

	// Sync from props
	$effect(() => {
		items = [...highlights];
	});

	// Drag-and-drop handlers
	function handleDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
		dragOverId = id;
	}

	function handleDragLeave(id: string) {
		if (dragOverId === id) dragOverId = null;
	}

	async function handleDrop(e: DragEvent, id: string) {
		e.preventDefault();
		dragOverId = null;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		if (!file.type.startsWith('image/')) return;

		saving = id;
		try {
			// Upload to /api/upload
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
			if (!uploadRes.ok) throw new Error('Upload failed');
			const { url } = await uploadRes.json();

			// Update highlight with image URL
			const putRes = await fetch('/api/landing-highlights', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, image_url: url })
			});
			if (!putRes.ok) throw new Error('Save failed');
			const updated = await putRes.json();

			items = items.map(h => h.id === id ? { ...h, ...updated } : h);
		} catch (err) {
			console.error('Image upload failed:', err);
		} finally {
			saving = null;
		}
	}

	async function updateField(id: string, field: string, value: string) {
		saving = id;
		try {
			const res = await fetch('/api/landing-highlights', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, [field]: value })
			});
			if (!res.ok) throw new Error('Save failed');
			const updated = await res.json();
			items = items.map(h => h.id === id ? { ...h, ...updated } : h);
		} catch (err) {
			console.error('Update failed:', err);
		} finally {
			saving = null;
		}
	}

	async function addHighlight() {
		if (items.length >= 3) return;
		saving = 'new';
		try {
			const res = await fetch('/api/landing-highlights', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'New highlight',
					position: items.length
				})
			});
			if (!res.ok) throw new Error('Create failed');
			const created = await res.json();
			items = [...items, created];
		} catch (err) {
			console.error('Create failed:', err);
		} finally {
			saving = null;
		}
	}

	async function removeHighlight(id: string) {
		saving = id;
		try {
			const res = await fetch('/api/landing-highlights', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) throw new Error('Delete failed');
			items = items.filter(h => h.id !== id);
		} catch (err) {
			console.error('Delete failed:', err);
		} finally {
			saving = null;
		}
	}

	let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

	function handleTitleInput(id: string, e: Event) {
		const target = e.target as HTMLElement;
		const value = target.textContent || '';
		items = items.map(h => h.id === id ? { ...h, title: value } : h);

		if (debounceTimers[`${id}-title`]) clearTimeout(debounceTimers[`${id}-title`]);
		debounceTimers[`${id}-title`] = setTimeout(() => updateField(id, 'title', value), 600);
	}

	function handleSubtitleInput(id: string, e: Event) {
		const target = e.target as HTMLElement;
		const value = target.textContent || '';
		items = items.map(h => h.id === id ? { ...h, subtitle: value } : h);

		if (debounceTimers[`${id}-subtitle`]) clearTimeout(debounceTimers[`${id}-subtitle`]);
		debounceTimers[`${id}-subtitle`] = setTimeout(() => updateField(id, 'subtitle', value), 600);
	}

	function handleLinkInput(id: string, e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		items = items.map(h => h.id === id ? { ...h, link: value } : h);

		if (debounceTimers[`${id}-link`]) clearTimeout(debounceTimers[`${id}-link`]);
		debounceTimers[`${id}-link`] = setTimeout(() => updateField(id, 'link', value), 600);
	}
</script>

<div class="field-notes" class:has-1={items.length === 1} class:has-2={items.length === 2} class:has-3={items.length >= 3}>
	<div class="grid" class:grid-1={items.length === 1} class:grid-2={items.length === 2} class:grid-3={items.length >= 3}>
		{#each items as item (item.id)}
			{@const isSaving = saving === item.id}
			<div class="card">
				<!-- Image area -->
				{#if isEditMode}
					<div
						class="image-area drop-zone"
						class:drag-over={dragOverId === item.id}
						ondragover={(e) => handleDragOver(e, item.id)}
						ondragleave={() => handleDragLeave(item.id)}
						ondrop={(e) => handleDrop(e, item.id)}
						role="button"
						tabindex="0"
					>
						{#if item.image_url}
							<img src={item.image_url} alt={item.title} />
						{:else}
							<div class="drop-placeholder">
								<span>drop image</span>
							</div>
						{/if}
						{#if isSaving}
							<div class="saving-overlay">saving...</div>
						{/if}
					</div>
				{:else if item.image_url}
					{#if item.link}
						<a href={item.link} class="image-area">
							<img src={item.image_url} alt={item.title} />
						</a>
					{:else}
						<div class="image-area">
							<img src={item.image_url} alt={item.title} />
						</div>
					{/if}
				{/if}

				<!-- Title -->
				{#if isEditMode}
					<h3
						class="card-title"
						contenteditable="true"
						oninput={(e) => handleTitleInput(item.id, e)}
						role="textbox"
					>{item.title}</h3>
				{:else if item.link}
					<a href={item.link} class="card-title-link"><h3 class="card-title">{item.title}</h3></a>
				{:else}
					<h3 class="card-title">{item.title}</h3>
				{/if}

				<!-- Subtitle -->
				{#if isEditMode}
					<p
						class="card-subtitle"
						contenteditable="true"
						oninput={(e) => handleSubtitleInput(item.id, e)}
						role="textbox"
					>{item.subtitle || ''}</p>
				{:else if item.subtitle}
					<p class="card-subtitle">{item.subtitle}</p>
				{/if}

				<!-- Edit mode controls -->
				{#if isEditMode}
					<div class="card-controls">
						<input
							type="text"
							class="link-input"
							placeholder="Link URL"
							value={item.link || ''}
							oninput={(e) => handleLinkInput(item.id, e)}
						/>
						<button class="remove-btn" onclick={() => removeHighlight(item.id)}>remove</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if isEditMode && items.length < 3}
		<button class="add-btn" onclick={addHighlight} disabled={saving === 'new'}>
			{saving === 'new' ? 'adding...' : '+ add highlight'}
		</button>
	{/if}
</div>

<style>
	.field-notes {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 16px;
		box-sizing: border-box;
	}

	/* === Grid layout === */
	.grid {
		display: grid;
		gap: 16px;
		width: 100%;
		max-width: 1200px;
	}

	/* 3 items: full 3-column grid */
	.grid-3 {
		grid-template-columns: repeat(3, 1fr);
	}

	/* 2 items: 3-column grid, items in columns 2 and 3 */
	.grid-2 {
		grid-template-columns: repeat(3, 1fr);
	}

	.grid-2 .card:first-child {
		grid-column: 2;
	}

	.grid-2 .card:nth-child(2) {
		grid-column: 3;
	}

	/* 1 item: 3-column grid, item in column 3 */
	.grid-1 {
		grid-template-columns: repeat(3, 1fr);
	}

	.grid-1 .card {
		grid-column: 3;
	}

	/* === Card === */
	.card {
		display: flex;
		flex-direction: column;
	}

	/* Image area — tall portrait aspect ratio */
	.image-area {
		position: relative;
		aspect-ratio: 3 / 4;
		border-radius: 8px;
		overflow: hidden;
		background: var(--bg-control, rgba(0, 0, 0, 0.04));
	}

	.image-area img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	a.image-area {
		text-decoration: none;
	}

	/* Drag-drop zone */
	.drop-zone {
		cursor: pointer;
		transition: border-color 0.15s;
		border: 2px dashed transparent;
	}

	.drop-zone.drag-over {
		border-color: var(--text-muted, #666);
	}

	.drop-zone:not(.drag-over) {
		border-color: var(--border-link, rgba(0, 0, 0, 0.1));
	}

	.drop-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted, #666);
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
	}

	.saving-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		color: white;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
	}

	/* Title */
	.card-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 16px;
		font-weight: normal;
		color: var(--text-primary, #1a1a1a);
		margin: 10px 0 0;
		line-height: 1.3;
	}

	.card-title[contenteditable] {
		outline: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		padding-bottom: 2px;
	}

	.card-title-link {
		text-decoration: none;
		color: inherit;
	}

	/* Subtitle */
	.card-subtitle {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-muted, #666);
		margin: 4px 0 0;
		line-height: 1.3;
	}

	.card-subtitle[contenteditable] {
		outline: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		padding-bottom: 2px;
		min-height: 1em;
	}

	/* Edit controls */
	.card-controls {
		margin-top: 8px;
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.link-input {
		flex: 1;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 12px;
		padding: 4px 8px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary, #333);
	}

	.link-input::placeholder {
		color: var(--text-muted, #666);
	}

	.remove-btn {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 12px;
		color: var(--text-muted, #666);
		background: none;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		border-radius: 4px;
		padding: 4px 8px;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.remove-btn:hover {
		color: #c00;
		border-color: #c00;
	}

	/* Add button */
	.add-btn {
		margin-top: 16px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: var(--text-muted, #666);
		background: none;
		border: 1px dashed var(--border-link, rgba(0, 0, 0, 0.15));
		border-radius: 8px;
		padding: 12px 24px;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.add-btn:hover {
		color: var(--text-primary, #1a1a1a);
		border-color: var(--text-muted, #666);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* === Mobile === */
	@media (max-width: 768px) {
		.grid {
			grid-template-columns: 1fr !important;
		}

		.grid .card {
			grid-column: auto !important;
		}
	}
</style>
