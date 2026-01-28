<script lang="ts">
	import SectionList from '$lib/components/SectionList.svelte';
	import type { SiteSection } from '$lib/components/SectionList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let canvasSections = $state(data.canvasSections);
	let sitePages = $state(data.sitePages);
	let canvasNotes = $state(data.canvasNotes as Record<string, Array<{ slug: string; title: string }>>);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let lastSaved = $state<string | null>(null);
	let selectedSectionId = $state<string | null>(null);
	let selectedSectionType = $state<'canvas' | 'hero' | 'contact' | null>(null);
	let showCanvasPicker = $state(false);

	// Build unified section list from canvas sections + pages
	let sections = $derived.by(() => {
		const cSections: SiteSection[] = canvasSections.map((cs) => ({
			id: cs.id,
			type: 'canvas' as const,
			name: cs.navLabel || cs.canvasName,
			canvasId: cs.canvasId,
			canvasSlug: cs.canvasSlug,
			position: cs.position
		}));

		const pageSections: SiteSection[] = sitePages.map((p) => ({
			id: p.id,
			type: p.page_type as 'hero' | 'contact',
			name: p.title || defaultPageName(p.page_type),
			position: p.position,
			config: p.config
		}));

		return [...cSections, ...pageSections].sort((a, b) => a.position - b.position);
	});

	function defaultPageName(type: string): string {
		switch (type) {
			case 'hero': return 'Hero Section';
			case 'contact': return 'Contact Form';
			default: return type;
		}
	}

	// Auto-select first section
	$effect(() => {
		const s = sections;
		if (s.length > 0 && !s.some((sec) => sec.id === selectedSectionId)) {
			selectedSectionId = s[0].id;
			selectedSectionType = s[0].type;
		}
	});

	let selectedCanvasSection = $derived(
		selectedSectionType === 'canvas'
			? canvasSections.find((cs) => cs.id === selectedSectionId)
			: null
	);

	let previewUrl = $derived(
		selectedCanvasSection ? `/@${data.username}/${selectedCanvasSection.canvasSlug}` : null
	);

	let selectedPage = $derived(
		selectedSectionType && selectedSectionType !== 'canvas'
			? sitePages.find((p) => p.id === selectedSectionId)
			: null
	);

	async function handleSectionReorder(reordered: SiteSection[]) {
		const canvasUpdates: { id: string; position: number }[] = [];
		const pageUpdates: { id: string; position: number }[] = [];

		for (const section of reordered) {
			if (section.type === 'canvas') {
				canvasUpdates.push({ id: section.id, position: section.position });
				const idx = canvasSections.findIndex((cs) => cs.id === section.id);
				if (idx !== -1) canvasSections[idx] = { ...canvasSections[idx], position: section.position };
			} else {
				pageUpdates.push({ id: section.id, position: section.position });
				const idx = sitePages.findIndex((p) => p.id === section.id);
				if (idx !== -1) sitePages[idx] = { ...sitePages[idx], position: section.position };
			}
		}

		canvasSections = [...canvasSections];
		sitePages = [...sitePages];

		if (canvasUpdates.length > 0) {
			await fetch(`/api/sites/${data.site.id}/canvases`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(canvasUpdates)
			});
		}

		if (pageUpdates.length > 0) {
			await fetch(`/api/sites/${data.site.id}/pages`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pageUpdates)
			});
		}

		lastSaved = new Date().toLocaleTimeString();
	}

	async function handleAddCanvasSection(canvasId: string) {
		const canvas = data.availableCanvases.find((c) => c.id === canvasId);
		if (!canvas) return;

		try {
			const res = await fetch(`/api/sites/${data.site.id}/canvases`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ canvas_id: canvasId })
			});

			if (!res.ok) {
				error = 'Failed to add canvas section';
				return;
			}

			const inserted = await res.json();
			canvasSections = [...canvasSections, {
				id: inserted.id,
				canvasId: canvas.id,
				canvasName: canvas.name,
				canvasSlug: canvas.slug,
				position: inserted.position,
				navLabel: inserted.nav_label,
				navNoteId: inserted.nav_note_id
			}];
			selectedSectionId = inserted.id;
			selectedSectionType = 'canvas';

			// Load notes for this canvas if not already loaded
			if (!canvasNotes[canvasId]) {
				const notesRes = await fetch(`/api/canvases/${canvasId}/notes`);
				if (notesRes.ok) {
					canvasNotes[canvasId] = await notesRes.json();
				}
			}
		} catch {
			error = 'Failed to add canvas section';
		}

		showCanvasPicker = false;
	}

	async function handleAddPage(type: 'hero' | 'contact') {
		const s = sections;
		const maxPos = s.length > 0 ? Math.max(...s.map((sec) => sec.position)) : 0;

		try {
			const res = await fetch(`/api/sites/${data.site.id}/pages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					page_type: type,
					title: defaultPageName(type),
					position: maxPos + 1
				})
			});

			if (!res.ok) {
				error = 'Failed to add section';
				return;
			}

			const newPage = await res.json();
			sitePages = [...sitePages, newPage];
			selectedSectionId = newPage.id;
			selectedSectionType = type;
		} catch {
			error = 'Failed to add section';
		}
	}

	async function handleRemoveSection(section: SiteSection) {
		try {
			if (section.type === 'canvas') {
				const res = await fetch(`/api/sites/${data.site.id}/canvases`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ section_id: section.id })
				});
				if (!res.ok) { error = 'Failed to remove section'; return; }
				canvasSections = canvasSections.filter((cs) => cs.id !== section.id);
			} else {
				const res = await fetch(`/api/sites/${data.site.id}/pages/${section.id}`, {
					method: 'DELETE'
				});
				if (!res.ok) { error = 'Failed to remove section'; return; }
				sitePages = sitePages.filter((p) => p.id !== section.id);
			}
		} catch {
			error = 'Failed to remove section';
		}
	}

	function handleSectionSelect(section: SiteSection) {
		selectedSectionId = section.id;
		selectedSectionType = section.type;
	}

	async function handleNavNoteSave(sectionId: string, navNoteId: string | null) {
		try {
			await fetch(`/api/sites/${data.site.id}/canvases`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify([{ id: sectionId, nav_note_id: navNoteId }])
			});
			canvasSections = canvasSections.map((cs) =>
				cs.id === sectionId ? { ...cs, navNoteId: navNoteId } : cs
			);
			lastSaved = new Date().toLocaleTimeString();
		} catch {
			error = 'Failed to save nav target';
		}
	}

	async function handleNavLabelSave(sectionId: string, navLabel: string) {
		try {
			await fetch(`/api/sites/${data.site.id}/canvases`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify([{ id: sectionId, nav_label: navLabel || null }])
			});
			canvasSections = canvasSections.map((cs) =>
				cs.id === sectionId ? { ...cs, navLabel: navLabel || null } : cs
			);
			lastSaved = new Date().toLocaleTimeString();
		} catch {
			error = 'Failed to save nav label';
		}
	}

	async function handlePageConfigSave(pageId: string, config: Record<string, unknown>) {
		try {
			const res = await fetch(`/api/sites/${data.site.id}/pages/${pageId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ config })
			});

			if (res.ok) {
				const updated = await res.json();
				sitePages = sitePages.map((p) => (p.id === pageId ? updated : p));
				lastSaved = new Date().toLocaleTimeString();
			}
		} catch {
			error = 'Failed to save page config';
		}
	}

	async function handlePageTitleSave(pageId: string, title: string) {
		try {
			await fetch(`/api/sites/${data.site.id}/pages/${pageId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title })
			});

			sitePages = sitePages.map((p) => (p.id === pageId ? { ...p, title } : p));
			lastSaved = new Date().toLocaleTimeString();
		} catch {
			error = 'Failed to save title';
		}
	}

	async function togglePublish() {
		const newState = !data.site.is_published;

		if (newState && sections.length === 0) {
			error = 'Add at least one section before publishing';
			return;
		}

		try {
			const res = await fetch(`/api/sites/${data.site.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_published: newState })
			});

			if (!res.ok) {
				const result = await res.json();
				error = result.error || 'Failed to update';
				return;
			}

			if (newState) {
				window.location.href = `/sites/@${data.username}/${data.site.slug}`;
			} else {
				window.location.reload();
			}
		} catch (e) {
			error = 'Failed to update';
		}
	}
</script>

<svelte:head>
	<title>Edit {data.site.name} - dyad.berlin</title>
</svelte:head>

<div class="editor">
	<header class="editor-header">
		<div class="header-left">
			<a href="/sites" class="back-link">&larr; Sites</a>
			<h1>{data.site.name}</h1>
			{#if data.site.is_published}
				<span class="published-badge">Published</span>
			{:else}
				<span class="draft-badge">Draft</span>
			{/if}
		</div>
		<div class="header-right">
			{#if lastSaved}
				<span class="save-status">Saved {lastSaved}</span>
			{/if}
			{#if saving}
				<span class="save-status">Saving...</span>
			{/if}
			<a href="/sites/{data.site.slug}/preview" class="action-btn">Preview</a>
			<button class="action-btn publish-btn" onclick={togglePublish}>
				{data.site.is_published ? 'Unpublish' : 'Publish'}
			</button>
		</div>
	</header>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<div class="editor-content">
		<aside class="sidebar">
			<SectionList
				sections={sections}
				onReorder={handleSectionReorder}
				onRemove={handleRemoveSection}
				onAdd={(type) => {
					if (type === 'canvas') {
						showCanvasPicker = true;
					} else {
						handleAddPage(type);
					}
				}}
				selectedId={selectedSectionId}
				onSelect={handleSectionSelect}
			/>

			{#if showCanvasPicker}
				<div class="canvas-picker-overlay" onclick={() => showCanvasPicker = false}>
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="canvas-picker" onclick={(e) => e.stopPropagation()}>
						<h4>Add Canvas Section</h4>
						{#if data.availableCanvases.length === 0}
							<p class="empty-hint">No canvases yet. Create one first.</p>
						{:else}
							<ul class="canvas-list">
								{#each data.availableCanvases as canvas}
									<li>
										<button onclick={() => handleAddCanvasSection(canvas.id)}>
											{canvas.name}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}
		</aside>

		<main class="preview-area">
			{#if selectedSectionType === 'canvas' && previewUrl && selectedCanvasSection}
				<div class="preview-header">
					<span class="preview-label">Canvas: {selectedCanvasSection.canvasName}</span>
					<div class="header-controls">
						<a href="/@{data.username}/{selectedCanvasSection.canvasSlug}" target="_blank" class="open-link">
							Open in new tab &rarr;
						</a>
					</div>
				</div>
				<div class="canvas-settings">
					<div class="setting-row">
						<label>Nav label:</label>
						<input
							type="text"
							placeholder={selectedCanvasSection.canvasName}
							value={selectedCanvasSection.navLabel ?? ''}
							onchange={(e) => handleNavLabelSave(selectedCanvasSection!.id, e.currentTarget.value)}
						/>
					</div>
					<div class="setting-row">
						<label>Nav links to:</label>
						<select
							value={selectedCanvasSection.navNoteId ?? ''}
							onchange={(e) => handleNavNoteSave(
								selectedCanvasSection!.id,
								e.currentTarget.value || null
							)}
						>
							<option value="">Entry point (default)</option>
							{#each canvasNotes[selectedCanvasSection.canvasId] ?? [] as note}
								<option value={note.slug}>{note.title || note.slug}</option>
							{/each}
						</select>
					</div>
				</div>
				{#key selectedCanvasSection.id}
					<iframe
						src={previewUrl}
						title="Canvas preview"
						class="preview-iframe"
					></iframe>
				{/key}
			{:else if selectedPage}
				<div class="preview-header">
					<span class="preview-label">{defaultPageName(selectedPage.page_type)}</span>
				</div>
				<div class="page-editor">
					<div class="field">
						<label for="page-title">Title</label>
						<input
							id="page-title"
							type="text"
							value={selectedPage.title}
							onchange={(e) => handlePageTitleSave(selectedPage.id, e.currentTarget.value)}
						/>
					</div>

					{#if selectedPage.page_type === 'hero'}
						<div class="field">
							<label for="hero-heading">Heading</label>
							<input
								id="hero-heading"
								type="text"
								value={(selectedPage.config as Record<string, string>)?.heading ?? ''}
								onchange={(e) => handlePageConfigSave(selectedPage.id, {
									...selectedPage.config,
									heading: e.currentTarget.value
								})}
							/>
						</div>
						<div class="field">
							<label for="hero-subtitle">Subtitle</label>
							<textarea
								id="hero-subtitle"
								rows="3"
								value={(selectedPage.config as Record<string, string>)?.subtitle ?? ''}
								onchange={(e) => handlePageConfigSave(selectedPage.id, {
									...selectedPage.config,
									subtitle: e.currentTarget.value
								})}
							></textarea>
						</div>
					{:else if selectedPage.page_type === 'contact'}
						<div class="field">
							<label for="contact-heading">Heading</label>
							<input
								id="contact-heading"
								type="text"
								value={(selectedPage.config as Record<string, string>)?.heading ?? 'Stay in touch'}
								onchange={(e) => handlePageConfigSave(selectedPage.id, {
									...selectedPage.config,
									heading: e.currentTarget.value
								})}
							/>
						</div>
					{/if}

					<div class="page-preview-box">
						<p class="preview-note">Preview will show in the site preview.</p>
					</div>
				</div>
			{:else}
				<div class="no-preview">
					<p>Select a section to preview or edit</p>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.editor {
		min-height: 100vh;
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		border-bottom: 1px solid var(--border-link);
		background: var(--bg-canvas);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-link {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.95rem;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--text-link-hover);
	}

	.editor-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.published-badge {
		background: rgba(40, 167, 69, 0.15);
		color: #28a745;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.draft-badge {
		background: var(--bg-control);
		color: var(--text-muted);
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.save-status {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.action-btn {
		padding: 0.5rem 1rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: border-color 0.2s, color 0.2s;
	}

	.action-btn:hover {
		border-color: var(--border-link-hover);
		color: var(--text-primary);
	}

	.publish-btn {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
	}

	.publish-btn:hover {
		opacity: 0.9;
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin: 0;
	}

	.editor-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		width: 350px;
		flex-shrink: 0;
		padding: 1.5rem;
		border-right: 1px solid var(--border-link);
		overflow-y: auto;
		background: var(--bg-control);
		position: relative;
	}

	.preview-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--bg-control);
		border-bottom: 1px solid var(--border-link);
	}

	.preview-label {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.open-link {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s;
		white-space: nowrap;
	}

	.open-link:hover {
		color: var(--text-link-hover);
	}

	.canvas-settings {
		padding: 0.75rem 1rem;
		background: var(--bg-canvas);
		border-bottom: 1px solid var(--border-link);
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.setting-row input,
	.setting-row select {
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-canvas);
		color: var(--text-primary);
		font-size: 0.85rem;
		font-family: inherit;
	}

	.setting-row input {
		width: 160px;
	}

	.preview-iframe {
		flex: 1;
		border: none;
		background: white;
	}

	.page-editor {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
		max-width: 600px;
	}

	.field {
		margin-bottom: 1.5rem;
	}

	.field label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		font-weight: 500;
	}

	.field input,
	.field textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		background: var(--bg-canvas);
		color: var(--text-primary);
		font-size: 1rem;
		font-family: inherit;
		box-sizing: border-box;
	}

	.field input:focus,
	.field textarea:focus {
		outline: none;
		border-color: var(--text-link);
	}

	.page-preview-box {
		padding: 1rem;
		background: var(--bg-control);
		border-radius: 4px;
		margin-top: 1rem;
	}

	.preview-note {
		color: var(--text-muted);
		font-size: 0.9rem;
		font-style: italic;
		margin: 0;
	}

	.no-preview {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		font-size: 1.1rem;
	}

	/* Canvas picker overlay */
	.canvas-picker-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.canvas-picker {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		padding: 1.5rem;
		min-width: 300px;
		max-width: 400px;
		max-height: 400px;
		overflow-y: auto;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.canvas-picker h4 {
		margin: 0 0 1rem;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.canvas-picker .empty-hint {
		color: var(--text-muted);
		font-size: 0.9rem;
		font-style: italic;
	}

	.canvas-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.canvas-list li {
		margin: 0;
	}

	.canvas-list button {
		display: block;
		width: 100%;
		padding: 0.6rem 0.75rem;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.95rem;
		color: var(--text-primary);
		border-radius: 4px;
		transition: background 0.15s;
	}

	.canvas-list button:hover {
		background: var(--bg-control);
	}
</style>
