<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let showCreateModal = $state(false);
	let showDeleteModal = $state<string | null>(null);
	let creating = $state(false);
	let deleting = $state(false);
	let newSiteName = $state('');
	let error = $state<string | null>(null);

	function formatDate(date: string): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(date));
	}

	async function createSite() {
		if (!newSiteName.trim()) return;
		creating = true;
		error = null;

		try {
			const res = await fetch('/api/sites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newSiteName.trim() })
			});

			const result = await res.json();

			if (!res.ok) {
				error = result.error || 'Failed to create site';
				return;
			}

			// Redirect to edit the new site
			window.location.href = `/sites/${result.slug}/edit`;
		} catch (e) {
			error = 'Failed to create site';
		} finally {
			creating = false;
		}
	}

	async function deleteSite(siteId: string) {
		deleting = true;
		error = null;

		try {
			const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });

			if (!res.ok) {
				const result = await res.json();
				error = result.error || 'Failed to delete site';
				return;
			}

			// Refresh page
			window.location.reload();
		} catch (e) {
			error = 'Failed to delete site';
		} finally {
			deleting = false;
			showDeleteModal = null;
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
				error = result.error || 'Failed to update site';
				return;
			}

			// Refresh page
			window.location.reload();
		} catch (e) {
			error = 'Failed to update site';
		}
	}
</script>

<svelte:head>
	<title>Sites - dyad.berlin</title>
</svelte:head>

<div class="dashboard">
	<header class="header">
		<div class="header-left">
			<h1>Your Sites</h1>
		</div>
		<div class="header-right">
			<a href="/dashboard" class="nav-link">canvases</a>
			<span class="username">{data.user.email}</span>
			<a href="/logout" class="logout-btn">sign out</a>
		</div>
	</header>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<div class="content">
		<button class="create-btn" onclick={() => (showCreateModal = true)}>
			+ new site
		</button>

		{#if data.sites.length === 0}
			<div class="empty-state">
				<p>You don't have any sites yet.</p>
				<p class="hint">Create a site to group your canvases and publish them together.</p>
			</div>
		{:else}
			<div class="site-grid">
				{#each data.sites as site}
					<div class="site-card">
						<div class="site-header">
							<h2>{site.name}</h2>
							{#if site.is_published}
								<span class="published-badge">Published</span>
							{:else}
								<span class="draft-badge">Draft</span>
							{/if}
						</div>
						<div class="site-meta">
							<span class="canvas-count">{site.canvas_count} canvas{site.canvas_count !== 1 ? 'es' : ''}</span>
							<span class="date">{formatDate(site.updated_at)}</span>
						</div>
						<div class="site-actions">
							<a href="/sites/{site.slug}/edit" class="action-btn">Edit</a>
							<a href="/sites/{site.slug}/preview" class="action-btn">Preview</a>
							{#if site.is_published}
								<a href="/sites/@{data.username}/{site.slug}" class="action-btn" target="_blank">View</a>
							{/if}
							<button
								class="action-btn publish-btn"
								onclick={() => togglePublish(site)}
							>
								{site.is_published ? 'Unpublish' : 'Publish'}
							</button>
							<button
								class="action-btn delete-btn"
								onclick={() => (showDeleteModal = site.id)}
							>
								Delete
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div class="modal-overlay" onclick={() => (showCreateModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Create New Site</h2>
			<form onsubmit={(e) => { e.preventDefault(); createSite(); }}>
				<input
					type="text"
					bind:value={newSiteName}
					required
					maxlength="200"
					placeholder="Site name"
					disabled={creating}
					autofocus
				/>
				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={() => (showCreateModal = false)}>
						cancel
					</button>
					<button type="submit" class="submit-btn" disabled={creating || !newSiteName.trim()}>
						{creating ? 'creating...' : 'create site'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
	{@const siteToDelete = data.sites.find((s) => s.id === showDeleteModal)}
	<div class="modal-overlay" onclick={() => (showDeleteModal = null)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Delete Site</h2>
			<p>
				Are you sure you want to delete <strong>{siteToDelete?.name}</strong>? This will not delete
				your canvases, only the site configuration.
			</p>
			<div class="modal-actions">
				<button type="button" class="cancel-btn" onclick={() => (showDeleteModal = null)}>
					cancel
				</button>
				<button
					type="button"
					class="delete-confirm-btn"
					disabled={deleting}
					onclick={() => showDeleteModal && deleteSite(showDeleteModal)}
				>
					{deleting ? 'deleting...' : 'delete site'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
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

	.nav-link {
		color: var(--text-link);
		text-decoration: none;
		font-size: 0.95rem;
		border-bottom: 1px solid var(--border-link);
		transition: border-color 0.2s, color 0.2s;
	}

	.nav-link:hover {
		color: var(--text-link-hover);
		border-color: var(--border-link-hover);
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

	.create-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
		margin-bottom: 2rem;
	}

	.create-btn:hover {
		opacity: 0.9;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--text-muted);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}

	.empty-state .hint {
		font-size: 0.9rem;
	}

	.site-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.site-card {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.site-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.site-card h2 {
		margin: 0;
		font-size: 1.25rem;
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

	.site-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.site-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.4rem 0.75rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: border-color 0.2s, color 0.2s;
	}

	.action-btn:hover {
		border-color: var(--border-link-hover);
		color: var(--text-primary);
	}

	.delete-btn:hover {
		border-color: #dc3545;
		color: #dc3545;
	}

	.publish-btn:hover {
		border-color: #28a745;
		color: #28a745;
	}

	/* Modal styles */
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
