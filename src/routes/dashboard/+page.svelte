<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreateModal = $state(false);
	let showDeleteModal = $state<string | null>(null);
	let creating = $state(false);
	let deleting = $state(false);

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(date));
	}
</script>

<svelte:head>
	<title>Dashboard - dyad.berlin</title>
</svelte:head>

<div class="dashboard">
	<header class="header">
		<div class="header-left">
			<h1>Your Canvases</h1>
		</div>
		<div class="header-right">
			<span class="username">{data.user.email}</span>
			<a href="/logout" class="logout-btn">Sign out</a>
		</div>
	</header>

	{#if form?.error}
		<div class="error-message">{form.error}</div>
	{/if}

	<div class="content">
		<button class="create-btn" onclick={() => (showCreateModal = true)}>
			<span class="plus">+</span>
			New Canvas
		</button>

		{#if data.canvases.length === 0}
			<div class="empty-state">
				<p>You don't have any canvases yet.</p>
				<p class="hint">Create your first canvas to start building your spatial reading environment.</p>
			</div>
		{:else}
			<div class="canvas-grid">
				{#each data.canvases as canvas}
					<a href="/canvas/{canvas.id}" class="canvas-card">
						<div class="canvas-header">
							<h2>{canvas.name}</h2>
							{#if canvas.is_published}
								<span class="published-badge">Published</span>
							{/if}
						</div>
						<div class="canvas-meta">
							<span class="slug">/{canvas.slug}</span>
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
							Delete
						</button>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Create Modal -->
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
				<div class="form-group">
					<label for="name">Canvas Name</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						maxlength="100"
						placeholder="Enter a name..."
						disabled={creating}
						autofocus
					/>
				</div>
				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={() => (showCreateModal = false)}>
						Cancel
					</button>
					<button type="submit" class="submit-btn" disabled={creating}>
						{creating ? 'Creating...' : 'Create Canvas'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
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
						Cancel
					</button>
					<button type="submit" class="delete-confirm-btn" disabled={deleting}>
						{deleting ? 'Deleting...' : 'Delete Canvas'}
					</button>
				</div>
			</form>
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

	.plus {
		font-size: 1.25rem;
		line-height: 1;
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

	.canvas-card h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.published-badge {
		background: var(--bg-control);
		color: var(--text-muted);
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
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

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	.form-group input:focus {
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
