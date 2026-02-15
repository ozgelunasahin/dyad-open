<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let showCreateModal = $state(false);
	let showDeleteModal = $state<string | null>(null);
	let creating = $state(false);
	let deleting = $state(false);

	// Tab state
	let activeTab = $state<string>('canvases');

	// Conversations state
	let showCreateConversationModal = $state(false);
	let togglingConversation = $state<string | null>(null);

	// Waitlist state
	let invitingEmail = $state<string | null>(null);
	let inviteError = $state<string | null>(null);
	let waitlistSearch = $state('');
	let waitlistFilter = $state<'all' | 'pending' | 'invited'>('all');
	let invitedOverrides = $state(new Set<string>());

	let filteredWaitlist = $derived.by(() => {
		const list = (data.waitlist ?? []).map((c) => ({
			...c,
			invited: c.invited || invitedOverrides.has(c.email)
		}));
		let filtered = list;
		if (waitlistFilter === 'pending') filtered = filtered.filter((c) => !c.invited);
		if (waitlistFilter === 'invited') filtered = filtered.filter((c) => c.invited);
		if (waitlistSearch.trim()) {
			const q = waitlistSearch.toLowerCase();
			filtered = filtered.filter(
				(c) =>
					c.email.toLowerCase().includes(q) ||
					(c.name && c.name.toLowerCase().includes(q)) ||
					(c.freewrite && c.freewrite.toLowerCase().includes(q))
			);
		}
		return filtered;
	});

	async function sendInvite(email: string, name: string | null) {
		invitingEmail = email;
		inviteError = null;
		try {
			const res = await fetch('/api/invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, name })
			});
			const result = await res.json();
			if (!res.ok) {
				inviteError = result.error || 'Failed to send invite';
				return;
			}
			// Mark as invited in local state
			invitedOverrides = new Set([...invitedOverrides, email]);
		} catch {
			inviteError = 'Failed to send invite';
		} finally {
			invitingEmail = null;
		}
	}

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

	<nav class="tabs">
		<button class="tab" class:active={activeTab === 'canvases'} onclick={() => (activeTab = 'canvases')}>Canvases</button>
		<button class="tab" class:active={activeTab === 'conversations'} onclick={() => (activeTab = 'conversations')}>Conversations</button>
		{#if data.canPublishSites}
			<button class="tab" class:active={activeTab === 'sites'} onclick={() => (activeTab = 'sites')}>Sites</button>
			<button class="tab" class:active={activeTab === 'highlights'} onclick={() => (activeTab = 'highlights')}>Highlights</button>
			<button class="tab" class:active={activeTab === 'waitlist'} onclick={() => (activeTab = 'waitlist')}>Waitlist <span class="tab-count">{data.waitlist?.length ?? 0}</span></button>
			<button class="tab" class:active={activeTab === 'members'} onclick={() => (activeTab = 'members')}>Members <span class="tab-count">{data.members?.length ?? 0}</span></button>
		{/if}
	</nav>

	{#if form?.error}
		<div class="error-message">{form.error}</div>
	{/if}
	{#if siteError}
		<div class="error-message">{siteError}</div>
	{/if}

	<div class="content">
		<!-- ============ CANVASES ============ -->
		{#if activeTab === 'canvases'}
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
		{/if}

		<!-- ============ CONVERSATIONS ============ -->
		{#if activeTab === 'conversations'}
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Your Conversations</h2>
					<button class="create-btn" onclick={() => (showCreateConversationModal = true)}>
						+ new conversation
					</button>
				</div>

				{#if data.conversations.length === 0}
					<div class="empty-state">
						<p>Start a conversation topic for the community.</p>
					</div>
				{:else}
					<div class="canvas-grid">
						{#each data.conversations as conversation}
							<div class="canvas-card conversation-card">
								<a href="/canvas/{conversation.id}" class="conversation-link">
									<div class="canvas-header">
										<h3>{conversation.name}</h3>
										{#if conversation.active_this_week}
											<span class="published-badge-green">Active</span>
										{/if}
									</div>
									<div class="canvas-meta">
										<span class="slug">/@{data.username}/{conversation.slug}</span>
										<span class="date">{formatDate(conversation.updated_at)}</span>
									</div>
								</a>
								<div class="conversation-actions">
									<form
										method="POST"
										action="?/toggleActiveThisWeek"
										use:enhance={() => {
											togglingConversation = conversation.id;
											return async ({ update }) => {
												togglingConversation = null;
												await update();
											};
										}}
									>
										<input type="hidden" name="canvasId" value={conversation.id} />
										<button
											type="submit"
											class="toggle-btn"
											class:active={conversation.active_this_week}
											disabled={togglingConversation === conversation.id}
										>
											{conversation.active_this_week ? 'Active this week' : 'Inactive'}
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ============ SITES (admin only) ============ -->
		{#if activeTab === 'sites'}
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
		{/if}

		<!-- ============ LANDING HIGHLIGHTS (admin only) ============ -->
		{#if activeTab === 'highlights'}
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

		<!-- ============ WAITLIST (admin only) ============ -->
		{#if activeTab === 'waitlist'}
			{@const allWaitlist = (data.waitlist ?? []).map((c) => ({ ...c, invited: c.invited || invitedOverrides.has(c.email) }))}
			{@const pendingCount = allWaitlist.filter((c) => !c.invited).length}
			{@const invitedCount = allWaitlist.filter((c) => c.invited).length}
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Waitlist</h2>
					<span class="waitlist-count">{allWaitlist.length} total &middot; {pendingCount} pending &middot; {invitedCount} invited</span>
				</div>

				{#if inviteError}
					<div class="error-message">{inviteError}</div>
				{/if}

				{#if allWaitlist.length > 0}
					<div class="waitlist-controls">
						<input
							type="text"
							class="waitlist-search"
							placeholder="Search by name, email, or freewrite..."
							bind:value={waitlistSearch}
						/>
						<div class="waitlist-filters">
							<button class="filter-btn" class:active={waitlistFilter === 'all'} onclick={() => (waitlistFilter = 'all')}>All</button>
							<button class="filter-btn" class:active={waitlistFilter === 'pending'} onclick={() => (waitlistFilter = 'pending')}>Pending</button>
							<button class="filter-btn" class:active={waitlistFilter === 'invited'} onclick={() => (waitlistFilter = 'invited')}>Invited</button>
						</div>
					</div>
				{/if}

				{#if allWaitlist.length === 0}
					<div class="empty-state">
						<p>No one on the waitlist yet.</p>
					</div>
				{:else if filteredWaitlist.length === 0}
					<div class="empty-state">
						<p>No matches.</p>
					</div>
				{:else}
					<div class="waitlist-list">
						{#each filteredWaitlist as contact}
							<div class="waitlist-item">
								<div class="waitlist-info">
									<div class="waitlist-header-row">
										<span class="waitlist-name">{contact.name || 'Anonymous'}</span>
										<span class="waitlist-email">{contact.email}</span>
										<span class="waitlist-date">{formatDate(contact.created_at)}</span>
									</div>
									{#if contact.freewrite}
										<p class="waitlist-freewrite">{contact.freewrite}</p>
									{/if}
								</div>
								<div class="waitlist-action">
									{#if contact.invited}
										<span class="invited-badge">Invited</span>
									{:else}
										<button
											class="invite-btn"
											disabled={invitingEmail === contact.email}
											onclick={() => sendInvite(contact.email, contact.name)}
										>
											{invitingEmail === contact.email ? 'Sending...' : 'Invite'}
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ============ MEMBERS (admin only) ============ -->
		{#if activeTab === 'members'}
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Members</h2>
					<span class="waitlist-count">{data.members?.length ?? 0} users</span>
				</div>

				{#if !data.members || data.members.length === 0}
					<div class="empty-state">
						<p>No members yet.</p>
					</div>
				{:else}
					<div class="waitlist-list">
						{#each data.members as member}
							<div class="waitlist-item">
								<div class="waitlist-info">
									<div class="waitlist-header-row">
										<span class="waitlist-name">@{member.username}</span>
										{#if member.berlin_based}
											<span class="berlin-badge">Berlin</span>
										{/if}
										<span class="waitlist-date">{formatDate(member.created_at)}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
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

<!-- Create Conversation Modal -->
{#if showCreateConversationModal}
	<div class="modal-overlay" onclick={() => (showCreateConversationModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Start a Conversation</h2>
			<p>Give your conversation a topic. Others in the community will be able to read and engage with it.</p>
			<form
				method="POST"
				action="?/createConversation"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						creating = false;
						await update();
						showCreateConversationModal = false;
					};
				}}
			>
				<input
					type="text"
					id="conversationName"
					name="name"
					required
					maxlength="100"
					placeholder="Conversation topic"
					disabled={creating}
					autofocus
				/>
				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={() => (showCreateConversationModal = false)}>
						cancel
					</button>
					<button type="submit" class="submit-btn" disabled={creating}>
						{creating ? 'creating...' : 'start conversation'}
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

	.tabs {
		display: flex;
		gap: 0;
		max-width: 1200px;
		margin: 0 auto 2rem;
		border-bottom: 1px solid var(--border-link);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.tab {
		padding: 0.6rem 1.1rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--text-muted);
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab:hover {
		color: var(--text-primary);
	}

	.tab.active {
		color: var(--text-primary);
		border-bottom-color: var(--text-primary);
	}

	.tab-count {
		font-size: 0.8rem;
		opacity: 0.6;
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

	/* === Conversation card === */
	.conversation-card {
		display: block;
		position: relative;
	}

	.conversation-link {
		display: block;
		text-decoration: none;
	}

	.conversation-actions {
		margin-top: 0.75rem;
	}

	.toggle-btn {
		padding: 0.35rem 0.65rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s, background 0.2s;
	}

	.toggle-btn:hover {
		border-color: var(--border-link-hover);
		color: var(--text-primary);
	}

	.toggle-btn.active {
		background: rgba(40, 167, 69, 0.1);
		border-color: rgba(40, 167, 69, 0.4);
		color: #28a745;
	}

	.toggle-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

	/* === Waitlist & Members === */
	.waitlist-count {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.waitlist-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.waitlist-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border-link);
	}

	.waitlist-item:last-child {
		border-bottom: none;
	}

	.waitlist-info {
		flex: 1;
		min-width: 0;
	}

	.waitlist-header-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.waitlist-name {
		font-weight: 500;
		color: var(--text-primary);
		font-size: 0.95rem;
	}

	.waitlist-email {
		color: var(--text-muted);
		font-size: 0.85rem;
		font-family: monospace;
	}

	.waitlist-date {
		color: var(--text-muted);
		font-size: 0.8rem;
		margin-left: auto;
	}

	.waitlist-freewrite {
		margin: 0.5rem 0 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
		font-style: italic;
		white-space: pre-wrap;
	}

	.waitlist-action {
		flex-shrink: 0;
		padding-top: 2px;
	}

	.invite-btn {
		padding: 0.4rem 0.85rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.invite-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.invite-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.invited-badge {
		padding: 0.35rem 0.65rem;
		background: rgba(40, 167, 69, 0.1);
		color: #28a745;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.waitlist-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.waitlist-search {
		flex: 1;
		min-width: 200px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
	}

	.waitlist-search:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	.waitlist-search::placeholder {
		color: var(--text-muted);
	}

	.waitlist-filters {
		display: flex;
		gap: 0.25rem;
	}

	.filter-btn {
		padding: 0.4rem 0.7rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.2s, color 0.2s, background 0.2s;
	}

	.filter-btn:hover {
		border-color: var(--border-link-hover);
		color: var(--text-primary);
	}

	.filter-btn.active {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-color: var(--text-primary);
	}

	.berlin-badge {
		padding: 0.15rem 0.45rem;
		background: rgba(0, 123, 255, 0.1);
		color: #007bff;
		border-radius: 3px;
		font-size: 0.75rem;
	}
</style>
