<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreateModal = $state(false);
	let showDeleteModal = $state<string | null>(null);
	let creating = $state(false);
	let deleting = $state(false);

	// Sites state
	let showCreateSiteModal = $state(false);
	let showDeleteSiteModal = $state<string | null>(null);
	let creatingSite = $state(false);
	let deletingSite = $state(false);
	let newSiteName = $state('');
	let siteError = $state<string | null>(null);

	// Highlights state
	let highlightedCanvasIds = $state<Set<string>>(new Set());
	let highlightImages = $state<Record<string, string | null>>({});
	let highlightIdByCanvas = $state<Record<string, string>>({});
	let highlightBusy = $state<string | null>(null);
	let dragOverHighlight = $state<string | null>(null);
	let uploadingImage = $state<string | null>(null);

	// Initialize highlighted canvas IDs and images from server data
	$effect(() => {
		const ids = new Set<string>();
		const images: Record<string, string | null> = {};
		const idMap: Record<string, string> = {};
		for (const h of data.highlights ?? []) {
			if (h.canvas_id) {
				ids.add(h.canvas_id);
				images[h.canvas_id] = h.image_url;
				idMap[h.canvas_id] = h.id;
			}
		}
		highlightedCanvasIds = ids;
		highlightImages = images;
		highlightIdByCanvas = idMap;
	});

	function formatDate(date: Date | string): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(date));
	}

	// Highlight toggle
	async function toggleHighlight(canvasId: string) {
		highlightBusy = canvasId;
		const isHighlighted = highlightedCanvasIds.has(canvasId);

		try {
			if (isHighlighted) {
				// Remove highlight
				const res = await fetch('/api/landing-highlights', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ canvas_id: canvasId })
				});
				if (!res.ok) throw new Error('Failed to remove highlight');
				const next = new Set(highlightedCanvasIds);
				next.delete(canvasId);
				highlightedCanvasIds = next;
			} else {
				// Add highlight
				const currentCount = highlightedCanvasIds.size;
				if (currentCount >= 3) {
					siteError = 'Maximum 3 highlights allowed';
					return;
				}
				const res = await fetch('/api/landing-highlights', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						canvas_id: canvasId,
						position: currentCount
					})
				});
				if (!res.ok) {
					const result = await res.json();
					throw new Error(result.error || 'Failed to add highlight');
				}
				const created = await res.json();
				const next = new Set(highlightedCanvasIds);
				next.add(canvasId);
				highlightedCanvasIds = next;
				// Track the created highlight ID and image
				highlightIdByCanvas = { ...highlightIdByCanvas, [canvasId]: created.id };
				if (created.image_url) {
					highlightImages = { ...highlightImages, [canvasId]: created.image_url };
				}
				// Canvas was auto-published — update local state
				const idx = data.canvases.findIndex(c => c.id === canvasId);
				if (idx >= 0) {
					data.canvases[idx] = { ...data.canvases[idx], is_published: true };
				}
			}
		} catch (err) {
			console.error('Highlight toggle failed:', err);
		} finally {
			highlightBusy = null;
		}
	}

	// Image upload for highlight cards
	async function handleHighlightDrop(e: DragEvent, canvasId: string) {
		e.preventDefault();
		e.stopPropagation();
		dragOverHighlight = null;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;
		const file = files[0];
		if (!file.type.startsWith('image/')) return;

		const highlightId = highlightIdByCanvas[canvasId];
		if (!highlightId) return;

		uploadingImage = canvasId;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
			if (!uploadRes.ok) throw new Error('Upload failed');
			const { url } = await uploadRes.json();

			const putRes = await fetch('/api/landing-highlights', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: highlightId, image_url: url })
			});
			if (!putRes.ok) throw new Error('Save failed');

			highlightImages = { ...highlightImages, [canvasId]: url };
		} catch (err) {
			console.error('Image upload failed:', err);
		} finally {
			uploadingImage = null;
		}
	}

	// Site management
	async function createSite() {
		if (!newSiteName.trim()) return;
		creatingSite = true;
		siteError = null;

		try {
			const res = await fetch('/api/sites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newSiteName.trim() })
			});

			const result = await res.json();

			if (!res.ok) {
				siteError = result.error || 'Failed to create site';
				return;
			}

			window.location.href = `/sites/${result.slug}/edit`;
		} catch {
			siteError = 'Failed to create site';
		} finally {
			creatingSite = false;
		}
	}

	async function deleteSite(siteId: string) {
		deletingSite = true;
		siteError = null;

		try {
			const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });

			if (!res.ok) {
				const result = await res.json();
				siteError = result.error || 'Failed to delete site';
				return;
			}

			window.location.reload();
		} catch {
			siteError = 'Failed to delete site';
		} finally {
			deletingSite = false;
			showDeleteSiteModal = null;
		}
	}

	async function togglePublish(site: { id: string; is_published: boolean }) {
		try {
			const res = await fetch(`/api/sites/${site.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_published: !site.is_published })
			});

			if (!res.ok) {
				const result = await res.json();
				siteError = result.error || 'Failed to update site';
				return;
			}

			window.location.reload();
		} catch {
			siteError = 'Failed to update site';
		}
	}
</script>

<svelte:head>
	<title>Dashboard - dyad.berlin</title>
</svelte:head>

<div class="dashboard">
	<header class="header">
		<div class="header-left">
			<h1>Dashboard</h1>
		</div>
		<div class="header-right">
			<span class="username">{data.user.email}</span>
			<a href="/logout" class="logout-btn">sign out</a>
		</div>
	</header>

	{#if form?.error}
		<div class="error-message">{form.error}</div>
	{/if}
	{#if siteError}
		<div class="error-message">{siteError}</div>
	{/if}

	<div class="content">
		<!-- ============ CANVASES ============ -->
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Canvases</h2>
				<button class="create-btn" onclick={() => (showCreateModal = true)}>
					+ new canvas
				</button>
			</div>

			{#if data.canvases.length === 0}
				<div class="empty-state">
					<p>You don't have any canvases yet.</p>
				</div>
			{:else}
				<div class="canvas-grid">
					{#each data.canvases as canvas}
						<a href="/canvas/{canvas.id}" class="canvas-card">
							<div class="canvas-header">
								<h3>{canvas.name}</h3>
								{#if canvas.is_published}
									<span class="published-badge">Published</span>
								{/if}
							</div>
							<div class="canvas-meta">
								<span class="slug">/@{data.username}/{canvas.slug}</span>
								<span class="date">{formatDate(canvas.updated_at)}</span>
							</div>
							<button
								class="delete-btn"
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									showDeleteModal = canvas.id;
								}}
							>
								delete
							</button>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<!-- ============ SITES (admin only) ============ -->
		{#if data.canPublishSites}
			<hr class="section-divider" />
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Sites</h2>
					<button class="create-btn" onclick={() => (showCreateSiteModal = true)}>
						+ new site
					</button>
				</div>

				{#if data.sites.length === 0}
					<div class="empty-state">
						<p>No sites yet. Create one to group canvases and publish them together.</p>
					</div>
				{:else}
					<div class="canvas-grid">
						{#each data.sites as site}
							<div class="site-card">
								<div class="canvas-header">
									<h3>{site.name}</h3>
									{#if site.is_published}
										<span class="published-badge-green">Published</span>
									{:else}
										<span class="draft-badge">Draft</span>
									{/if}
								</div>
								<div class="canvas-meta">
									<span class="canvas-count">{site.canvas_count} canvas{site.canvas_count !== 1 ? 'es' : ''}</span>
									<span class="date">{formatDate(site.updated_at)}</span>
								</div>
								<div class="site-actions">
									<a href="/sites/{site.slug}/edit" class="action-link">Edit</a>
									<a href="/sites/{site.slug}/preview" class="action-link">Preview</a>
									{#if site.is_published}
										<a href="/sites/@{data.username}/{site.slug}" class="action-link" target="_blank">View</a>
									{/if}
									<button class="action-link" onclick={() => togglePublish(site)}>
										{site.is_published ? 'Unpublish' : 'Publish'}
									</button>
									<button class="action-link action-link-danger" onclick={() => (showDeleteSiteModal = site.id)}>
										Delete
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- ============ LANDING HIGHLIGHTS (admin only) ============ -->
			<hr class="section-divider" />
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Landing Highlights</h2>
					<span class="highlight-count">{highlightedCanvasIds.size}/3</span>
				</div>
				<p class="section-description">Select up to 3 canvases to feature in the field notes section on the landing page.</p>

				{#if data.canvases.length === 0}
					<div class="empty-state">
						<p>Create some canvases first to highlight them.</p>
					</div>
				{:else}
					<div class="highlight-grid">
						{#each data.canvases as canvas}
							{@const isHighlighted = highlightedCanvasIds.has(canvas.id)}
							{@const isBusy = highlightBusy === canvas.id}
							{@const isDisabled = !isHighlighted && highlightedCanvasIds.size >= 3}
							{@const coverImage = highlightImages[canvas.id] || canvas.cover_image_url}
							{@const isUploading = uploadingImage === canvas.id}
							<div class="highlight-card-wrapper">
								<button
									class="highlight-card"
									class:highlighted={isHighlighted}
									class:disabled={isDisabled}
									disabled={isBusy}
									onclick={() => toggleHighlight(canvas.id)}
								>
									<div class="highlight-card-inner">
										<div class="highlight-indicator">
											{#if isBusy}
												<span class="spinner"></span>
											{:else if isHighlighted}
												<span class="check-mark">&#10003;</span>
											{:else}
												<span class="empty-mark"></span>
											{/if}
										</div>
										<div class="highlight-info">
											<h3>{canvas.name}</h3>
											<span class="slug">/@{data.username}/{canvas.slug}</span>
										</div>
										{#if canvas.is_published}
											<span class="published-badge">Published</span>
										{/if}
									</div>
								</button>
								<!-- Drop zone for cover image (only for highlighted canvases) -->
								{#if isHighlighted}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="highlight-image-drop"
										class:drag-over={dragOverHighlight === canvas.id}
										class:has-image={!!coverImage}
										ondragover={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; dragOverHighlight = canvas.id; }}
										ondragleave={() => { if (dragOverHighlight === canvas.id) dragOverHighlight = null; }}
										ondrop={(e) => handleHighlightDrop(e, canvas.id)}
									>
										{#if isUploading}
											<span class="upload-status">uploading...</span>
										{:else if coverImage}
											<img src={coverImage} alt={canvas.name} class="highlight-thumb" />
											<span class="drop-hint">drop to replace</span>
										{:else}
											<span class="drop-hint">drop cover image</span>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ============ DISCOVER ============ -->
		{#if data.canPublishSites && data.publishedCanvases.length > 0}
			<hr class="section-divider" />
			<section class="section">
				<h2 class="section-title">Discover</h2>
				<div class="canvas-grid">
					{#each data.publishedCanvases as canvas}
						<a href="/@{canvas.username}/{canvas.slug}" class="canvas-card">
							<div class="canvas-header">
								<h3>{canvas.name}</h3>
							</div>
							<div class="canvas-meta">
								<span class="slug">/@{canvas.username}/{canvas.slug}</span>
								<span class="date">{formatDate(canvas.updated_at)}</span>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

<!-- Create Canvas Modal -->
{#if showCreateModal}
	<div class="modal-overlay" onclick={() => (showCreateModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Create New Canvas</h2>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						creating = false;
						await update();
						showCreateModal = false;
					};
				}}
			>
				<input
					type="text"
					id="name"
					name="name"
					required
					maxlength="100"
					placeholder="Canvas name"
					disabled={creating}
					autofocus
				/>
				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={() => (showCreateModal = false)}>
						cancel
					</button>
					<button type="submit" class="submit-btn" disabled={creating}>
						{creating ? 'creating...' : 'create canvas'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Canvas Modal -->
{#if showDeleteModal}
	{@const canvasToDelete = data.canvases.find((c) => c.id === showDeleteModal)}
	<div class="modal-overlay" onclick={() => (showDeleteModal = null)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Canvas</h2>
			<p>
				Are you sure you want to delete <strong>{canvasToDelete?.name}</strong>? This action cannot
				be undone.
			</p>
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					deleting = true;
					return async ({ update }) => {
						deleting = false;
						await update();
						showDeleteModal = null;
					};
				}}
			>
				<input type="hidden" name="canvasId" value={showDeleteModal} />
				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={() => (showDeleteModal = null)}>
						cancel
					</button>
					<button type="submit" class="delete-confirm-btn" disabled={deleting}>
						{deleting ? 'deleting...' : 'delete canvas'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Create Site Modal -->
{#if showCreateSiteModal}
	<div class="modal-overlay" onclick={() => (showCreateSiteModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Create New Site</h2>
			<form onsubmit={(e) => { e.preventDefault(); createSite(); }}>
				<input
					type="text"
					bind:value={newSiteName}
					required
					maxlength="200"
					placeholder="Site name"
					disabled={creatingSite}
					autofocus
				/>
				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={() => (showCreateSiteModal = false)}>
						cancel
					</button>
					<button type="submit" class="submit-btn" disabled={creatingSite || !newSiteName.trim()}>
						{creatingSite ? 'creating...' : 'create site'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Site Modal -->
{#if showDeleteSiteModal}
	{@const siteToDelete = data.sites.find((s) => s.id === showDeleteSiteModal)}
	<div class="modal-overlay" onclick={() => (showDeleteSiteModal = null)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Site</h2>
			<p>
				Are you sure you want to delete <strong>{siteToDelete?.name}</strong>? This will not delete
				your canvases, only the site configuration.
			</p>
			<div class="modal-actions">
				<button type="button" class="cancel-btn" onclick={() => (showDeleteSiteModal = null)}>
					cancel
				</button>
				<button
					type="button"
					class="delete-confirm-btn"
					disabled={deletingSite}
					onclick={() => showDeleteSiteModal && deleteSite(showDeleteSiteModal)}
				>
					{deletingSite ? 'deleting...' : 'delete site'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		overflow: auto !important;
	}

	.dashboard {
		min-height: 100vh;
		background: var(--bg-canvas);
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
	}

	.header h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.username {
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.logout-btn {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.95rem;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
	}

	.logout-btn:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
	}

	.content {
		max-width: 1200px;
		margin: 0 auto;
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin-bottom: 1.5rem;
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
		font-size: 0.9rem;
	}

	/* === Section layout === */
	.section {
		margin-bottom: 1rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.section-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.section-description {
		color: var(--text-muted);
		font-size: 0.9rem;
		margin: -0.5rem 0 1.5rem 0;
	}

	.section-divider {
		border: none;
		border-top: 1px solid var(--border-link);
		margin: 2.5rem 0 2rem 0;
	}

	.create-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.create-btn:hover {
		opacity: 0.9;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-muted);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	/* === Canvas grid === */
	.canvas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.canvas-card {
		display: block;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		padding: 1.5rem;
		text-decoration: none;
		transition: border-color 0.2s, transform 0.2s;
		position: relative;
	}

	.canvas-card:hover {
		border-color: var(--border-link-hover);
		transform: translateY(-2px);
	}

	.canvas-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.canvas-card h3,
	.site-card h3 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.published-badge {
		background: var(--bg-control);
		color: var(--text-muted);
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.published-badge-green {
		background: rgba(40, 167, 69, 0.15);
		color: #28a745;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.draft-badge {
		background: var(--bg-control);
		color: var(--text-muted);
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.canvas-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.slug {
		font-family: monospace;
		font-size: 0.8rem;
	}

	.delete-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.8rem;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.2s, color 0.2s;
		font-family: inherit;
	}

	.canvas-card:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		color: #dc3545;
	}

	/* === Site card === */
	.site-card {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.site-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.action-link {
		padding: 0.35rem 0.65rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: border-color 0.2s, color 0.2s;
	}

	.action-link:hover {
		border-color: var(--border-link-hover);
		color: var(--text-primary);
	}

	.action-link-danger:hover {
		border-color: #dc3545;
		color: #dc3545;
	}

	/* === Highlight grid === */
	.highlight-count {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.highlight-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 0.75rem;
	}

	.highlight-card {
		background: var(--bg-canvas);
		border: 2px solid var(--border-link);
		border-radius: 8px;
		padding: 1rem 1.25rem;
		cursor: pointer;
		transition: border-color 0.2s, background 0.15s;
		text-align: left;
		font-family: inherit;
		width: 100%;
	}

	.highlight-card:hover:not(:disabled) {
		border-color: var(--border-link-hover);
	}

	.highlight-card.highlighted {
		border-color: var(--text-primary);
		background: var(--bg-control);
	}

	.highlight-card.disabled:not(.highlighted) {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.highlight-card-inner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.highlight-indicator {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.check-mark {
		font-size: 1.1rem;
		color: var(--text-primary);
		font-weight: bold;
	}

	.empty-mark {
		width: 18px;
		height: 18px;
		border: 2px solid var(--border-link);
		border-radius: 4px;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-link);
		border-top-color: var(--text-primary);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.highlight-info {
		flex: 1;
		min-width: 0;
	}

	.highlight-info h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.highlight-info .slug {
		display: block;
		margin-top: 2px;
	}

	/* Highlight image drop zone */
	.highlight-card-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.highlight-image-drop {
		height: 80px;
		border: 2px dashed var(--border-link);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		transition: border-color 0.2s;
		cursor: default;
	}

	.highlight-image-drop.drag-over {
		border-color: var(--text-primary);
		background: var(--bg-control);
	}

	.highlight-image-drop.has-image {
		border-style: solid;
	}

	.highlight-thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.highlight-image-drop .drop-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-family: inherit;
	}

	.highlight-image-drop.has-image .drop-hint {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.highlight-image-drop.has-image:hover .drop-hint {
		opacity: 1;
	}

	.upload-status {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	/* === Modal styles === */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--bg-canvas);
		border-radius: 8px;
		padding: 2rem;
		width: 100%;
		max-width: 400px;
		margin: 1rem;
	}

	.modal h2 {
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.modal p {
		margin: 0 0 1.5rem 0;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.modal input[type='text'] {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		margin-bottom: 1.5rem;
		box-sizing: border-box;
	}

	.modal input[type='text']:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.cancel-btn {
		padding: 0.65rem 1rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.cancel-btn:hover {
		border-color: var(--border-link-hover);
	}

	.submit-btn {
		padding: 0.65rem 1rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.delete-confirm-btn {
		padding: 0.65rem 1rem;
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.delete-confirm-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.delete-confirm-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
