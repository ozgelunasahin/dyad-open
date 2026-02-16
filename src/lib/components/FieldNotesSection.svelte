<script lang="ts">
	interface Highlight {
		id: string;
		title: string;
		subtitle: string | null;
		image_url: string | null;
		link: string | null;
		position: number;
		format: string | null;
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

	// Drag-and-drop handlers for edit mode
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
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
			if (!uploadRes.ok) throw new Error('Upload failed');
			const { url } = await uploadRes.json();

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

<!-- Emergence Magazine "Listen" layout: label left, cards right -->
<div class="field-notes">
	<div class="layout">
		<div class="label-col">
			<span class="section-label">Field notes:</span>
		</div>
		<div class="cards-col">
			{#each items as item (item.id)}
				{@const isSaving = saving === item.id}
				<div class="card">
					<!-- Format tag -->
					<span class="format-tag">{item.format || 'essay'}</span>

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
					{:else}
						{@const hasImage = !!item.image_url}
						{#if item.link}
							<a href={item.link} class="image-area" class:placeholder-bg={!hasImage}>
								{#if hasImage}
									<img src={item.image_url} alt={item.title} />
								{:else}
									<div class="placeholder-text">{item.title}</div>
								{/if}
							</a>
						{:else}
							<div class="image-area" class:placeholder-bg={!hasImage}>
								{#if hasImage}
									<img src={item.image_url} alt={item.title} />
								{:else}
									<div class="placeholder-text">{item.title}</div>
								{/if}
							</div>
						{/if}
					{/if}

					<!-- Title (bold) + Author (thin) -->
					{#if isEditMode}
						<h3
							class="card-title"
							contenteditable="true"
							oninput={(e) => handleTitleInput(item.id, e)}
							role="textbox"
						>{item.title}</h3>
						<p
							class="card-author"
							contenteditable="true"
							oninput={(e) => handleSubtitleInput(item.id, e)}
							role="textbox"
						>{item.subtitle || ''}</p>
					{:else}
						{#if item.link}
							<a href={item.link} class="card-title-link">
								<h3 class="card-title">{item.title}</h3>{#if item.subtitle} <span class="card-author">by {item.subtitle}</span>{/if}
							</a>
						{:else}
							<div class="card-meta">
								<h3 class="card-title">{item.title}</h3>{#if item.subtitle} <span class="card-author">by {item.subtitle}</span>{/if}
							</div>
						{/if}
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
		align-items: flex-end;
		padding: 40px 16px;
		box-sizing: border-box;
	}

	/* === Emergence-style layout: 4-col grid === */
	.layout {
		display: grid;
		grid-template-columns: 1fr 3fr;
		gap: 32px;
		width: 100%;
		max-width: 1400px;
		align-items: start;
	}

	/* Left column: label — aligned with format tag baseline */
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

	/* Right column: 3 cards in a row */
	.cards-col {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
	}

	/* === Card === */
	.card {
		display: flex;
		flex-direction: column;
	}

	/* Format tag — monospace uppercase above image */
	.format-tag {
		font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted, #666);
		margin-bottom: 8px;
	}

	/* Image area — tall portrait aspect ratio like Emergence */
	.image-area {
		position: relative;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		background: var(--bg-control, rgba(0, 0, 0, 0.04));
		display: block;
		border-radius: 8px;
	}

	.image-area img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		border-radius: 8px;
	}

	a.image-area {
		text-decoration: none;
	}

	/* When no image, show title as placeholder inside the card area */
	.placeholder-bg {
		background: var(--bg-control, rgba(0, 0, 0, 0.04));
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
	}

	.placeholder-text {
		padding: 20px;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1rem;
		color: var(--text-muted, #666);
		line-height: 1.4;
	}

	/* Drag-drop zone (edit mode) */
	.drop-zone {
		cursor: pointer;
		transition: border-color 0.15s;
		border: 2px dashed var(--border-link, rgba(0, 0, 0, 0.1));
	}

	.drop-zone.drag-over {
		border-color: var(--text-muted, #666);
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

	/* Title — medium */
	.card-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		margin: 12px 0 0;
		line-height: 1.35;
		display: inline;
	}

	.card-title[contenteditable] {
		outline: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		padding-bottom: 2px;
		display: block;
	}

	.card-title-link {
		text-decoration: none;
		color: inherit;
		display: block;
		margin-top: 12px;
		line-height: 1.35;
	}

	.card-title-link .card-title {
		margin-top: 0;
	}

	.card-meta {
		margin-top: 12px;
		line-height: 1.35;
	}

	.card-meta .card-title {
		margin-top: 0;
	}

	/* Author — thin weight, inline after title */
	.card-author {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 15px;
		font-weight: 300;
		color: var(--text-muted, #666);
		line-height: 1.35;
		margin: 0;
		margin-left: 0.3em;
	}

	.card-author[contenteditable] {
		outline: none;
		border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
		padding-bottom: 2px;
		min-height: 1em;
		display: block;
		margin-top: 4px;
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
		.field-notes {
			padding: 40px 8px;
		}

		.layout {
			grid-template-columns: 1fr;
			gap: 16px;
		}

		.cards-col {
			grid-template-columns: 1fr;
			gap: 32px;
		}

		.image-area,
		.image-area img {
			border-radius: 6px;
		}

		/* Horizontal card: image left, text right */
		.card {
			flex-direction: row;
			gap: 16px;
			position: relative;
		}

		/* Format tag overlaid on image top-left */
		.format-tag {
			position: absolute;
			top: 8px;
			left: 8px;
			z-index: 2;
			background: rgba(128, 128, 128, 0.6);
			color: #fff;
			padding: 4px 8px;
			border-radius: 2px;
			font-size: 10px;
			margin-bottom: 0;
		}

		/* Image takes left half */
		.image-area {
			width: 55%;
			flex-shrink: 0;
			aspect-ratio: 3 / 4;
		}

		/* Text block sits to the right of image */
		.card-title-link,
		.card-meta {
			margin-top: 0;
			padding-top: 4px;
		}

		.card-title {
			font-size: 14px;
			display: block;
			margin-top: 0;
		}

		.card-author {
			display: block;
			margin-left: 0;
			margin-top: 4px;
			font-size: 14px;
			font-weight: 400;
		}
	}
</style>
