<script lang="ts">
	import CanvasSelector from '$lib/components/CanvasSelector.svelte';
	import SectionList from '$lib/components/SectionList.svelte';
	import type { SiteSection } from '$lib/components/SectionList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let canvases = $state(data.canvases);
	let sitePages = $state(data.sitePages);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let lastSaved = $state<string | null>(null);
	let selectedSectionId = $state<string | null>(null);
	let selectedSectionType = $state<'canvas' | 'hero' | 'contact' | null>(null);

	// Build unified section list from canvases + pages
	let sections = $derived.by(() => {
		const canvasSections: SiteSection[] = canvases
			.filter((c) => c.included)
			.map((c) => ({
				id: c.id,
				type: 'canvas' as const,
				name: c.name,
				slug: c.slug,
				position: c.position
			}));

		const pageSections: SiteSection[] = sitePages.map((p) => ({
			id: p.id,
			type: p.page_type as 'hero' | 'contact',
			name: p.title || defaultPageName(p.page_type),
			position: p.position,
			config: p.config
		}));

		return [...canvasSections, ...pageSections].sort((a, b) => a.position - b.position);
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

	let previewCanvas = $derived(
		selectedSectionType === 'canvas'
			? canvases.find((c) => c.id === selectedSectionId)
			: null
	);

	let previewUrl = $derived(
		previewCanvas ? `/@${data.username}/${previewCanvas.slug}?readonly=true` : null
	);

	let selectedPage = $derived(
		selectedSectionType && selectedSectionType !== 'canvas'
			? sitePages.find((p) => p.id === selectedSectionId)
			: null
	);

	async function saveCanvases() {
		saving = true;
		error = null;

		try {
			const includedIds = canvases
				.filter((c) => c.included)
				.sort((a, b) => a.position - b.position)
				.map((c) => c.id);

			const res = await fetch(`/api/sites/${data.site.id}/canvases`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(includedIds)
			});

			if (!res.ok) {
				const result = await res.json();
				error = result.error || 'Failed to save';
				return;
			}

			lastSaved = new Date().toLocaleTimeString();
		} catch (e) {
			error = 'Failed to save';
		} finally {
			saving = false;
		}
	}

	function handleCanvasUpdate(updated: typeof canvases) {
		canvases = updated;
		saveCanvases();
	}

	async function handleSectionReorder(reordered: SiteSection[]) {
		// Update positions for all sections
		// Canvas positions update via saveCanvases, page positions via pages API
		const canvasUpdates: typeof canvases = [...canvases];
		const pageUpdates: { id: string; position: number }[] = [];

		for (const section of reordered) {
			if (section.type === 'canvas') {
				const idx = canvasUpdates.findIndex((c) => c.id === section.id);
				if (idx !== -1) {
					canvasUpdates[idx] = { ...canvasUpdates[idx], position: section.position };
				}
			} else {
				pageUpdates.push({ id: section.id, position: section.position });
				const idx = sitePages.findIndex((p) => p.id === section.id);
				if (idx !== -1) {
					sitePages[idx] = { ...sitePages[idx], position: section.position };
				}
			}
		}

		canvases = canvasUpdates;
		saveCanvases();

		if (pageUpdates.length > 0) {
			await fetch(`/api/sites/${data.site.id}/pages`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pageUpdates)
			});
		}
	}

	async function handleAddSection(type: 'hero' | 'contact') {
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
			const res = await fetch(`/api/sites/${data.site.id}/pages/${section.id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				error = 'Failed to remove section';
				return;
			}

			sitePages = sitePages.filter((p) => p.id !== section.id);
		} catch {
			error = 'Failed to remove section';
		}
	}

	function handleSectionSelect(section: SiteSection) {
		selectedSectionId = section.id;
		selectedSectionType = section.type;
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
				onAdd={handleAddSection}
				selectedId={selectedSectionId}
				onSelect={handleSectionSelect}
			/>

			<div class="divider"></div>

			<CanvasSelector
				{canvases}
				onUpdate={handleCanvasUpdate}
				selectedId={selectedSectionType === 'canvas' ? selectedSectionId : null}
				onSelect={(id) => { selectedSectionId = id; selectedSectionType = 'canvas'; }}
			/>
		</aside>

		<main class="preview-area">
			{#if selectedSectionType === 'canvas' && previewUrl && previewCanvas}
				<div class="preview-header">
					<span class="preview-label">Canvas: {previewCanvas.name}</span>
					<a href="/@{data.username}/{previewCanvas.slug}" target="_blank" class="open-link">
						Open in new tab &rarr;
					</a>
				</div>
				{#key previewCanvas.id}
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
	}

	.divider {
		height: 1px;
		background: var(--border-link);
		margin: 1.5rem 0;
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

	.open-link {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.85rem;
		transition: color 0.2s;
	}

	.open-link:hover {
		color: var(--text-link-hover);
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
</style>
