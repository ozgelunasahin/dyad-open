<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import MeetingsSection from '$lib/components/MeetingsSection.svelte';
	import PlaceSearch from '$lib/components/PlaceSearch.svelte';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let mobileMenuOpen = $state(false);
	let showDeleteModal = $state<string | null>(null);
	let creating = $state(false);
	let deleting = $state(false);

	// Tab state
	let mainTab = $state<'conversations' | 'meetings' | 'bookmarks' | 'archive'>('conversations');
	let activeTab = $state<string>('sites');
	let sidebarView = $state<'profile' | 'dashboard' | 'archive'>('profile');

	// Notification state for meetings tab badge
	let unreadMeetingCount = $state(0);
	let upcomingMeetingCount = $state(0);

	onMount(async () => {
		try {
			const res = await fetch('/api/notifications');
			if (res.ok) {
				const { unreadCount } = await res.json();
				unreadMeetingCount = unreadCount;
			}
		} catch { /* ignore */ }
	});

	async function markNotificationsRead() {
		if (unreadMeetingCount === 0) return;
		unreadMeetingCount = 0;
		try {
			await fetch('/api/notifications', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ all: true })
			});
		} catch { /* ignore */ }
	}

	function switchToMeetings() {
		mainTab = 'meetings';
		markNotificationsRead();
	}

	// Conversations state
	let togglingConversation = $state<string | null>(null);
	let showAvailabilityModal = $state<string | null>(null);
	let isEditingAvailability = $state(false);
	let activating = $state(false);

	// Week calendar helpers
	function getAvailableDates() {
		const today = new Date();
		const todayStr = today.toISOString().split('T')[0];
		// Show 7 days starting from today
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(today);
			d.setDate(today.getDate() + i);
			const dateStr = d.toISOString().split('T')[0];
			return {
				date: dateStr,
				dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
				dayNum: d.getDate(),
				isPast: false
			};
		});
	}

	const weekDates = getAvailableDates();

	const TIME_OPTIONS = (() => {
		const opts: Array<{ value: string; label: string }> = [];
		for (let h = 8; h <= 22; h++) {
			for (const m of ['00', '30']) {
				if (h === 22 && m === '30') continue;
				const value = `${h.toString().padStart(2, '0')}:${m}`;
				const d = new Date(2000, 0, 1, h, parseInt(m));
				const label = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
				opts.push({ value, label });
			}
		}
		return opts;
	})();

	const DURATION_OPTIONS = [
		{ value: 30, label: '30 min' },
		{ value: 60, label: '1 hour' },
		{ value: 90, label: '1.5 hours' },
		{ value: 120, label: '2 hours' },
		{ value: 180, label: '3 hours' },
	];

	// Per-slot availability: each slot = a specific date + time + place
	interface AvailSlot {
		date: string;
		startTime: string;
		duration: number;
		postcode: string;       // e.g. "10969 Kreuzberg" — shown on discover
		exactLocation: string;  // e.g. "betahaus, Rudi-Dutschke-Straße 23" — revealed only on match
		placeQuery: string;     // UI: display text for place search input
	}

	let slots = $state<AvailSlot[]>([]);

	let selectedDatesSet = $derived(new Set(slots.map(s => s.date)));

	// Grouped by date for display
	let slotsByDate = $derived.by(() => {
		const map = new Map<string, number[]>();
		slots.forEach((s, i) => {
			if (!map.has(s.date)) map.set(s.date, []);
			map.get(s.date)!.push(i);
		});
		return map;
	});

	function addSlotForDay(date: string) {
		slots = [...slots, { date, startTime: '', duration: 60, postcode: '', exactLocation: '', placeQuery: '' }];
	}

	function removeSlot(index: number) {
		slots = slots.filter((_, i) => i !== index);
	}

	function toggleDay(date: string) {
		if (selectedDatesSet.has(date)) {
			// Remove all slots for this day
			slots = slots.filter(s => s.date !== date);
		} else {
			addSlotForDay(date);
		}
	}

	function formatDayLabel(dateStr: string): string {
		const d = new Date(dateStr + 'T12:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function openAvailabilityModal(conversationId: string, existingTimes?: string | null, editing = false) {
		showAvailabilityModal = conversationId;
		isEditingAvailability = editing;
		let restored: AvailSlot[] = [];
		try {
			if (existingTimes) {
				const parsed = JSON.parse(existingTimes);
				if (parsed && typeof parsed === 'object' && Array.isArray(parsed.slots)) {
					restored = parsed.slots.map((s: Record<string, unknown>) => ({
						date: (s.date as string) ?? '',
						startTime: (s.startTime as string) ?? '',
						duration: (s.duration as number) ?? 60,
						postcode: (s.postcode as string) ?? '',
						exactLocation: (s.exactLocation as string) ?? '',
						placeQuery: (s.exactLocation as string) ?? ''
					}));
				}
			}
		} catch { /* ignore */ }
		slots = restored;
		activating = false;
	}

	function parseJsonArray(val: string | null | undefined): string[] {
		if (!val) return [];
		try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; }
		catch { return []; }
	}

	interface ParsedAvail {
		dates: string[];
		startTime: string;
		duration: number;
		slots?: Array<{ date: string; startTime: string; duration: number; postcode: string }>;
	}

	function parseAvailability(val: string | null | undefined): ParsedAvail | null {
		if (!val) return null;
		try {
			const parsed = JSON.parse(val);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				if (Array.isArray(parsed.slots)) {
					// New per-slot format
					const dateSet = new Set<string>();
					for (const s of parsed.slots) { if (s.date) dateSet.add(s.date); }
					return {
						dates: [...dateSet],
						startTime: '',
						duration: 0,
						slots: parsed.slots
					};
				}
				return {
					dates: Array.isArray(parsed.dates) ? parsed.dates : [],
					startTime: parsed.startTime ?? '',
					duration: parsed.duration ?? 60
				};
			}
		} catch { /* ignore */ }
		return null;
	}

	function formatTimeRange(st: string, dur: number): string {
		if (!st) return '';
		const [h, m] = st.split(':').map(Number);
		const start = new Date(2000, 0, 1, h, m);
		const end = new Date(start.getTime() + dur * 60000);
		const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
		return `${fmt(start)} – ${fmt(end)}`;
	}

	function formatDateShort(dateStr: string): string {
		const d = new Date(dateStr + 'T12:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
	}

	// Split conversations: active → Conversations section, inactive → Writing section
	let activeConversations = $derived(data.conversations.filter(c => c.active_this_week));
	let inactiveConversations = $derived(data.conversations.filter(c => !c.active_this_week));

	// Waitlist state
	let invitingEmail = $state<string | null>(null);
	let inviteError = $state<string | null>(null);
	let waitlistSearch = $state('');
	let invitedOverrides = $state(new Set<string>());

	let pendingWaitlistFiltered = $derived.by(() => {
		const pending = (data.waitlist ?? []).filter((c) => !c.invited && !invitedOverrides.has(c.email));
		if (!waitlistSearch.trim()) return pending;
		const q = waitlistSearch.toLowerCase();
		return pending.filter(
			(c) =>
				c.email.toLowerCase().includes(q) ||
				(c.name && c.name.toLowerCase().includes(q)) ||
				(c.freewrite && c.freewrite.toLowerCase().includes(q))
		);
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
	<title>dyad.berlin</title>
</svelte:head>

<div class="app-layout">
	<aside class="sidebar">
		<a href="/discover" class="sidebar-logo">
			<img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png" alt="dyad" class="sidebar-logo-img" />
		</a>
		<nav class="sidebar-nav">
			<a href="/discover" class="sidebar-link">Discover</a>
			<a href="/dashboard" class="sidebar-link" class:active={sidebarView === 'profile'} onclick={(e) => { e.preventDefault(); sidebarView = 'profile'; }}>Profile</a>
			<a href="/dashboard" class="sidebar-link" class:active={sidebarView === 'archive'} onclick={(e) => { e.preventDefault(); sidebarView = 'archive'; }}>Archive{#if (data.archived ?? []).length > 0} <span class="sidebar-count">{(data.archived ?? []).length}</span>{/if}</a>
			{#if data.canPublishSites}
				<a href="/dashboard" class="sidebar-link" class:active={sidebarView === 'dashboard'} onclick={(e) => { e.preventDefault(); sidebarView = 'dashboard'; }}>Admin</a>
			{/if}
		</nav>
		<div class="sidebar-bottom">
			<span class="sidebar-username">@{data.username}</span>
			<a href="/logout" class="sidebar-logout">sign out</a>
		</div>
		<button class="mobile-menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Menu">
			{#if mobileMenuOpen}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{/if}
		</button>
	</aside>
	{#if mobileMenuOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="mobile-overlay" onclick={() => mobileMenuOpen = false}></div>
		<aside class="mobile-panel" transition:fly={{ x: 300, duration: 250 }}>
			<nav class="mobile-panel-nav">
				<a href="/discover" onclick={() => mobileMenuOpen = false}>discover</a>
				<a href="/dashboard" onclick={() => mobileMenuOpen = false}>dashboard</a>
			</nav>
			<div class="mobile-panel-bottom">
				<span class="mobile-panel-user">@{data.username}</span>
				<a href="/logout" onclick={() => mobileMenuOpen = false}>sign out</a>
			</div>
		</aside>
	{/if}

	<main class="main-content">
		{#if form?.error}
			<div class="error-message">{form.error}</div>
		{/if}
		{#if siteError}
			<div class="error-message">{siteError}</div>
		{/if}

		<div class="content">
		{#if sidebarView === 'profile'}

		<nav class="main-tabs">
			<button class="main-tab" class:active={mainTab === 'conversations'} onclick={() => (mainTab = 'conversations')}>
				Conversations
				{#if data.conversations.length > 0}<span class="tab-count">{data.conversations.length}</span>{/if}
			</button>
			<button class="main-tab" class:active={mainTab === 'meetings'} onclick={switchToMeetings}>
				Meetings
				{#if upcomingMeetingCount > 0}<span class="tab-count">{upcomingMeetingCount}</span>{/if}
				{#if unreadMeetingCount > 0}<span class="notification-dot"></span>{/if}
			</button>
			<button class="main-tab" class:active={mainTab === 'bookmarks'} onclick={() => (mainTab = 'bookmarks')}>
				Bookmarks
				{#if data.bookmarks.length > 0}<span class="tab-count">{data.bookmarks.length}</span>{/if}
			</button>
		</nav>

		<!-- ============ CONVERSATIONS TAB ============ -->
		{#if mainTab === 'conversations'}
			<section class="section">
				<div class="section-header">
					<form method="POST" action="?/createConversation" use:enhance={() => {
						creating = true;
						return async ({ update }) => {
							creating = false;
							await update();
						};
					}}>
						<button type="submit" class="create-btn" disabled={creating || activeConversations.length >= 3}>
							{creating ? 'creating...' : activeConversations.length >= 3 ? '3/3 conversations this week' : '+ new conversation'}
						</button>
					</form>
				</div>

				{#if data.conversations.length === 0}
					<div class="empty-state">
						<p>No conversations yet.</p>
					</div>
				{:else}
					<div class="canvas-grid">
						{#each data.conversations as conversation}
							<div class="canvas-card conversation-card" class:inactive={!conversation.active_this_week}>
								<a href="/canvas/{conversation.id}" class="conversation-link">
									<div class="canvas-header">
										<h3 class:untitled={conversation.name === 'Untitled'}>{conversation.name === 'Untitled' ? 'Untitled conversation' : conversation.name}</h3>
										<span class="date">{formatDate(conversation.updated_at)}</span>
									</div>
									{#if !conversation.active_this_week}
										<span class="inactive-badge">inactive</span>
									{/if}
								</a>
								<div class="conversation-actions">
									{#if conversation.active_this_week}
										<button
											class="toggle-btn"
											onclick={(e) => { e.preventDefault(); e.stopPropagation(); openAvailabilityModal(conversation.id, conversation.preferred_time_slots, true); }}
										>
											Edit availability
										</button>
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
											<input type="hidden" name="action" value="deactivate" />
											<button
												type="submit"
												class="toggle-btn active"
												disabled={togglingConversation === conversation.id}
											>
												Active this week
											</button>
										</form>
									{:else}
										<button
											class="toggle-btn"
											onclick={(e) => { e.preventDefault(); e.stopPropagation(); openAvailabilityModal(conversation.id, conversation.preferred_time_slots); }}
										>
											publish this week
										</button>
									{/if}
									<form method="POST" action="?/toggleArchive" use:enhance>
										<input type="hidden" name="canvasId" value={conversation.id} />
										<input type="hidden" name="archive" value="true" />
										<button type="submit" class="archive-btn" title="Archive">
											<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="4" rx="1" /><path d="M2 6v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6" /><path d="M6 9h4" /></svg>
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ============ MEETINGS TAB ============ -->
		{#if mainTab === 'meetings'}
			<section class="section">
				<MeetingsSection currentUserId={data.user.id} bind:upcomingCount={upcomingMeetingCount} />
			</section>
		{/if}

		<!-- ============ BOOKMARKS TAB ============ -->
		{#if mainTab === 'bookmarks'}
			<section class="section">
				{#if data.bookmarks.length === 0}
					<div class="empty-state-subtle">
						<p>Save conversations you want to return to.</p>
					</div>
				{:else}
					<div class="canvas-grid">
						{#each data.bookmarks as bookmark}
							<div class="canvas-card">
								<a href="/@{bookmark.username}/{bookmark.slug}" class="conversation-link">
									<div class="canvas-header">
										<h3>{bookmark.name}</h3>
										<span class="date">@{bookmark.username}</span>
									</div>
								</a>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ====== CONNECTIONS TREE ====== -->
		{#if data.referrals && data.referrals.length > 0}
			<div class="connections-tree">
				<div class="connections-root">@{data.username}</div>
				{#each data.referrals as referral}
					<div class="connections-child">└→ @{referral.username}</div>
				{/each}
			</div>
		{/if}

		{/if}

		<!-- ============ ARCHIVE VIEW (sidebar nav) ============ -->
		{#if sidebarView === 'archive'}
			<section class="section">
				<h2 class="section-title" style="margin-bottom: 1.5rem">Archive</h2>
				{#if (data.archived ?? []).length === 0}
					<div class="empty-state-subtle">
						<p>Nothing archived yet.</p>
					</div>
				{:else}
					<div class="canvas-grid">
						{#each data.archived ?? [] as item}
							<div class="canvas-card archived-card">
								<a href="/canvas/{item.id}" class="conversation-link">
									<div class="canvas-header">
										<h3>{item.name}</h3>
										<span class="date">{formatDate(item.updated_at)}</span>
									</div>
								</a>
								<div class="conversation-actions">
									<form method="POST" action="?/toggleArchive" use:enhance>
										<input type="hidden" name="canvasId" value={item.id} />
										<input type="hidden" name="archive" value="false" />
										<button type="submit" class="archive-btn">unarchive</button>
									</form>
									<button
										class="delete-btn-inline"
										onclick={(e) => { e.stopPropagation(); showDeleteModal = item.id; }}
									>
										delete
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ============ DASHBOARD VIEW (admin) ============ -->
		{#if sidebarView === 'dashboard' && data.canPublishSites}
			<nav class="main-tabs">
				<button class="main-tab" class:active={activeTab === 'sites'} onclick={() => (activeTab = 'sites')}>Sites</button>
				<button class="main-tab" class:active={activeTab === 'field-notes'} onclick={() => (activeTab = 'field-notes')}>Field Notes</button>
				<button class="main-tab" class:active={activeTab === 'waitlist'} onclick={() => (activeTab = 'waitlist')}>Waitlist</button>
				<button class="main-tab" class:active={activeTab === 'invited'} onclick={() => (activeTab = 'invited')}>Invited</button>
				<button class="main-tab" class:active={activeTab === 'members'} onclick={() => (activeTab = 'members')}>Members <span class="tab-count">{data.members?.length ?? 0}</span></button>
			</nav>

		<!-- ============ SITES ============ -->
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

		<!-- ============ FIELD NOTES ============ -->
		{#if activeTab === 'field-notes'}
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Field Notes</h2>
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

		<!-- ============ WAITLIST (pending only) ============ -->
		{#if activeTab === 'waitlist'}
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Waitlist</h2>
					<span class="waitlist-count">{pendingWaitlistFiltered.length} pending</span>
				</div>

				{#if inviteError}
					<div class="error-message">{inviteError}</div>
				{/if}

				<div class="waitlist-controls">
					<input
						type="text"
						class="waitlist-search"
						placeholder="Search by name, email, or freewrite..."
						bind:value={waitlistSearch}
					/>
				</div>

				{#if pendingWaitlistFiltered.length === 0}
					<div class="empty-state">
						<p>{waitlistSearch.trim() ? 'No matches.' : 'No one waiting.'}</p>
					</div>
				{:else}
					<div class="waitlist-list">
						{#each pendingWaitlistFiltered as contact}
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
									<button
										class="invite-btn"
										disabled={invitingEmail === contact.email}
										onclick={() => sendInvite(contact.email, contact.name)}
									>
										{invitingEmail === contact.email ? 'Sending...' : 'Invite'}
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ============ INVITED ============ -->
		{#if activeTab === 'invited'}
			{@const invitedWaitlist = (data.waitlist ?? []).filter((c) => c.invited || invitedOverrides.has(c.email))}
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Invited</h2>
					<span class="waitlist-count">{invitedWaitlist.length} invited</span>
				</div>

				{#if invitedWaitlist.length === 0}
					<div class="empty-state">
						<p>No one invited yet.</p>
					</div>
				{:else}
					<div class="waitlist-list">
						{#each invitedWaitlist as contact}
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
									<span class="invited-badge">Invited</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- ============ MEMBERS ============ -->
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
		{/if}
	</div>
	</main>
</div>

<!-- Delete Canvas Modal -->
{#if showDeleteModal}
	{@const canvasToDelete = data.canvases.find((c) => c.id === showDeleteModal) ?? (data.archived ?? []).find((c) => c.id === showDeleteModal) ?? data.conversations.find((c) => c.id === showDeleteModal)}
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

<!-- Availability Modal -->
{#if showAvailabilityModal}
	<div class="modal-overlay" onclick={() => (showAvailabilityModal = null)}>
		<div class="modal modal-wide" onclick={(e) => e.stopPropagation()}>
			<h2>{isEditingAvailability ? 'Edit Availability' : 'Set Availability'}</h2>
			<p>Pick days, then set time and place for each.</p>
			<form
				method="POST"
				action="?/toggleActiveThisWeek"
				use:enhance={() => {
					activating = true;
					return async ({ update }) => {
						activating = false;
						showAvailabilityModal = null;
						await update();
					};
				}}
			>
				<input type="hidden" name="canvasId" value={showAvailabilityModal} />
				<input type="hidden" name="action" value="activate" />
				<input type="hidden" name="slotsJson" value={JSON.stringify(slots.map(s => ({ date: s.date, startTime: s.startTime, duration: s.duration, postcode: s.postcode, exactLocation: s.exactLocation })))} />

				<div class="avail-section">
					<label class="avail-label">Select days</label>
					<div class="week-calendar">
						{#each weekDates as day}
							<button
								type="button"
								class="day-cell"
								class:selected={selectedDatesSet.has(day.date)}
								onclick={() => toggleDay(day.date)}
							>
								<span class="day-name">{day.dayShort}</span>
								<span class="day-num">{day.dayNum}</span>
							</button>
						{/each}
					</div>
				</div>

				{#if slots.length > 0}
					<div class="avail-section slots-section">
						{#each [...slotsByDate.entries()].sort(([a], [b]) => a.localeCompare(b)) as [date, indices]}
							<div class="day-group">
								<div class="day-group-header">
									<span class="day-group-label">{formatDayLabel(date)}</span>
									<button type="button" class="add-time-btn" onclick={() => addSlotForDay(date)}>+ add time</button>
								</div>
								{#each indices as idx}
									<div class="slot-row">
										<div class="slot-time">
											<select
												class="time-select"
												value={slots[idx].startTime}
												onchange={(e) => { slots = slots.map((s, i) => i === idx ? { ...s, startTime: (e.target as HTMLSelectElement).value } : s); }}
											>
												<option value="">Time...</option>
												{#each TIME_OPTIONS as t}
													<option value={t.value}>{t.label}</option>
												{/each}
											</select>
											<span class="range-sep">for</span>
											<select
												class="time-select"
												value={slots[idx].duration}
												onchange={(e) => { slots = slots.map((s, i) => i === idx ? { ...s, duration: parseInt((e.target as HTMLSelectElement).value) } : s); }}
											>
												{#each DURATION_OPTIONS as opt}
													<option value={opt.value}>{opt.label}</option>
												{/each}
											</select>
										</div>
										<div class="slot-location">
										<PlaceSearch
											value={slots[idx].placeQuery}
											placeholder="Search for a place..."
											onSelect={(place) => {
												slots = slots.map((s, i) => i === idx
													? { ...s, postcode: place.postcode, exactLocation: place.exactLocation, placeQuery: place.exactLocation }
													: s);
											}}
										/>
									</div>
										{#if indices.length > 1}
											<button type="button" class="remove-slot-btn" onclick={() => removeSlot(idx)}>&times;</button>
										{/if}
									</div>
								{/each}
							</div>
						{/each}
					</div>
				{/if}

				<div class="modal-actions">
					<button type="button" class="cancel-btn" onclick={() => (showAvailabilityModal = null)}>cancel</button>
					<button type="submit" class="submit-btn" disabled={activating || slots.length === 0 || !slots.every(s => s.startTime && s.postcode)}>
						{activating ? 'saving...' : isEditingAvailability ? 'Save' : 'Activate'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		overflow: auto !important;
	}

	/* === App layout with sidebar === */
	.app-layout {
		display: flex;
		min-height: 100vh;
		background: var(--bg-canvas);
	}

	.sidebar {
		width: 180px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 1.5rem 1.25rem;
		border-right: 1px solid var(--border-link);
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
	}

	.sidebar-logo {
		display: block;
		margin-bottom: 1.25rem;
		padding: 0 0.65rem;
	}

	.sidebar-logo-img {
		width: 22px;
		height: auto;
		object-fit: contain;
		filter: brightness(0) opacity(0.4);
	}

	:global([data-theme='dark']) .sidebar-logo-img {
		filter: brightness(0) invert(1) opacity(0.7);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sidebar-link {
		display: block;
		padding: 0.5rem 0.65rem;
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		border-radius: 4px;
		transition: color 0.15s, background 0.15s;
	}

	.sidebar-link:hover {
		color: var(--text-primary);
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
	}

	.sidebar-link.active {
		color: var(--text-primary);
		font-weight: 500;
	}

	.sidebar-count {
		display: inline-block;
		background: var(--bg-control);
		border-radius: 8px;
		padding: 0 5px;
		font-size: 0.7rem;
		color: var(--text-muted);
		vertical-align: middle;
		margin-left: 2px;
	}

	.inactive-badge {
		font-size: 0.7rem;
		color: var(--text-muted);
		background: var(--bg-control);
		border-radius: 4px;
		padding: 1px 6px;
		margin-top: 4px;
		display: inline-block;
	}

	.sidebar-bottom {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sidebar-username {
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: monospace;
	}

	.sidebar-logout {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.8rem;
		transition: color 0.2s;
	}

	.sidebar-logout:hover {
		color: var(--text-primary);
	}

	.main-content {
		flex: 1;
		min-width: 0;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 2rem;
		max-width: 1200px;
	}

	.page-header h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: normal;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}

	.content {
		max-width: 1200px;
	}

	/* === Connections tree === */
	.connections-tree {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-link);
		font-size: 0.9rem;
		line-height: 2;
	}

	.connections-root {
		color: var(--text-primary);
		font-weight: 500;
	}

	.connections-child {
		color: var(--text-muted);
		padding-left: 0.5rem;
	}

	/* === Profile header (are.na style) === */
	.profile-header {
		border-top: 1px solid var(--border-link);
		border-bottom: 1px solid var(--border-link);
		margin-bottom: 2rem;
	}

	.profile-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--border-link);
	}

	.profile-row:last-child {
		border-bottom: none;
	}

	.profile-label {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.profile-row:first-child .profile-label {
		color: var(--text-primary);
		font-weight: 500;
		font-size: 1rem;
	}

	.profile-value {
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	/* === Main content tabs (Conversations / Writing) === */
	.main-tabs {
		display: flex;
		gap: 0;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-link);
	}

	.main-tab {
		padding: 0.6rem 1.1rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--text-muted);
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s, border-color 0.15s;
	}

	.main-tab:hover {
		color: var(--text-primary);
	}

	.main-tab.active {
		color: var(--text-primary);
		border-bottom-color: var(--text-primary);
	}

	.main-tab .tab-count {
		font-size: 0.8rem;
		opacity: 0.6;
		margin-left: 0.25rem;
	}

	.notification-dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		background: #dc3545;
		border-radius: 50%;
		margin-left: 0.3rem;
		vertical-align: middle;
	}

	/* Mobile: sidebar becomes top bar */
	/* Hamburger — hidden on desktop */
	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-primary, #1a1a1a);
		align-items: center;
		justify-content: center;
	}

	/* Slide-in panel — hidden on desktop */
	.mobile-overlay, .mobile-panel {
		display: none;
	}

	@media (max-width: 430px) {
		.app-layout {
			flex-direction: column;
		}

		.main-tabs {
			width: 100%;
		}

		.main-tab {
			flex: 1;
			padding: 0.6rem 0.25rem;
			font-size: 0.8rem;
			text-align: center;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.sidebar {
			width: 100%;
			height: auto;
			position: static;
			flex-direction: row;
			align-items: center;
			padding: 0.75rem 2rem;
			border-right: none;
			border-bottom: 1px solid var(--border-link);
			gap: 1rem;
		}

		.sidebar-logo {
			margin-bottom: 0;
		}

		.sidebar-nav {
			display: none;
		}

		.sidebar-bottom {
			display: none;
		}

		.mobile-menu-btn {
			display: flex;
			margin-left: auto;
		}

		.mobile-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.15);
			z-index: 200;
		}

		.mobile-panel {
			display: flex;
			flex-direction: column;
			position: fixed;
			top: 0;
			right: 0;
			width: 280px;
			max-width: 80vw;
			height: 100vh;
			background: var(--bg-canvas, #f5f3f0);
			z-index: 300;
			padding: 24px;
			box-sizing: border-box;
			box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
		}

		.mobile-panel-nav {
			display: flex;
			flex-direction: column;
			gap: 0;
			margin-top: 32px;
		}

		.mobile-panel-nav a {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 18px;
			font-weight: 500;
			color: var(--text-primary, #1a1a1a);
			text-decoration: none;
			padding: 14px 0;
			border-bottom: 1px solid var(--border-link, rgba(0, 0, 0, 0.1));
			transition: color 0.15s;
		}

		.mobile-panel-nav a:hover {
			color: var(--text-muted, #666);
		}

		.mobile-panel-bottom {
			margin-top: auto;
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.mobile-panel-user {
			font-family: monospace;
			font-size: 13px;
			color: var(--text-muted, #666);
		}

		.mobile-panel-bottom a {
			font-family: 'SangBleu Sunrise', Georgia, serif;
			font-size: 16px;
			color: var(--text-secondary, #333);
			text-decoration: none;
			transition: color 0.15s;
		}

		.mobile-panel-bottom a:hover {
			color: var(--text-primary, #1a1a1a);
		}
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
		display: flex;
		flex-direction: column;
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
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
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

	.canvas-header .date {
		flex-shrink: 0;
		color: var(--text-muted);
		font-size: 0.8rem;
		white-space: nowrap;
		font-weight: normal;
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

	.berlin-badge {
		padding: 0.15rem 0.45rem;
		background: rgba(0, 123, 255, 0.1);
		color: #007bff;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	/* === Availability tags on conversation cards === */
	.availability-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.5rem;
		padding: 0 0 0.25rem;
	}

	.avail-tag {
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	.avail-time {
		background: rgba(0, 123, 255, 0.1);
		color: #007bff;
	}

	.avail-location {
		background: rgba(40, 167, 69, 0.1);
		color: #28a745;
	}

	/* === Availability modal === */
	.modal-wide {
		max-width: 480px;
	}

	.avail-section {
		margin-bottom: 1.25rem;
	}

	.avail-label {
		display: block;
		font-size: 0.9rem;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.avail-hint {
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.avail-section input[type='text'] {
		width: 100%;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		margin-bottom: 0.4rem;
		box-sizing: border-box;
	}

	.avail-section input[type='text']:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	.add-field-btn {
		background: none;
		border: none;
		color: var(--text-link);
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
		padding: 0.25rem 0;
	}

	.add-field-btn:hover {
		color: var(--text-link-hover);
	}

	/* Week calendar */
	.week-calendar {
		display: flex;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	.day-cell {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		padding: 0.45rem 0.2rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 6px;
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.15s, background 0.15s, color 0.15s;
		color: var(--text-primary);
	}

	.day-cell:hover:not(:disabled) {
		border-color: var(--border-link-hover);
	}

	.day-cell.selected {
		background: var(--text-primary);
		border-color: var(--text-primary);
		color: var(--bg-canvas);
	}

	.day-cell.past {
		opacity: 0.25;
		cursor: not-allowed;
	}

	.day-name {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.day-num {
		font-size: 0.95rem;
		font-weight: 500;
	}

	/* Time range row */
	.time-range-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.range-sep {
		color: var(--text-muted);
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.time-select {
		flex: 1;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		padding-right: 2rem;
	}

	.time-select:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	/* === Archive & section variants === */
	.admin-divider {
		border: none;
		border-top: 1px solid var(--border-link);
		margin: 2rem 0 1.5rem;
		opacity: 0.5;
	}

	.section-muted {
		opacity: 0.7;
	}

	.section-title-muted {
		color: var(--text-muted);
		font-size: 1.25rem;
	}

	.archived-card {
		opacity: 0.65;
		border-style: dashed;
	}

	.archived-card:hover {
		opacity: 0.85;
	}

	.archived-type {
		color: var(--text-muted);
		font-size: 0.75rem;
		padding: 0.15rem 0.45rem;
		background: var(--bg-control);
		border-radius: 3px;
		flex-shrink: 0;
	}

	.empty-state-subtle {
		padding: 1rem 0;
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.empty-state-subtle p {
		margin: 0;
	}

	.archive-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		padding: 0.3rem;
		transition: color 0.2s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.archive-btn:hover {
		color: var(--text-primary);
	}

	.archive-btn svg {
		display: block;
	}

	.delete-btn-inline {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		padding: 0.35rem 0.5rem;
		transition: color 0.2s;
	}

	.delete-btn-inline:hover {
		color: #dc3545;
	}

	.conversation-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		padding-top: 0.75rem;
	}

	.canvas-count {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	/* === Per-slot availability UI === */
	.slots-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.day-group {
		border: 1px solid var(--border-link);
		border-radius: 6px;
		padding: 0.75rem;
	}

	.day-group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.day-group-label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.add-time-btn {
		background: none;
		border: none;
		color: var(--text-link, #007bff);
		font-size: 0.8rem;
		font-family: inherit;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}

	.add-time-btn:hover {
		color: var(--text-link-hover, #0056b3);
	}

	.slot-row {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}

	.slot-row:last-child {
		margin-bottom: 0;
	}

	.slot-time {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.slot-time .time-select {
		width: auto;
		min-width: 100px;
		padding: 0.45rem 1.8rem 0.45rem 0.5rem;
		font-size: 0.85rem;
	}

	.slot-location {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.remove-slot-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 1.1rem;
		cursor: pointer;
		padding: 0.3rem 0.4rem;
		line-height: 1;
		flex-shrink: 0;
		transition: color 0.15s;
	}

	.remove-slot-btn:hover {
		color: #dc3545;
	}

	.untitled {
		color: var(--text-muted);
		font-style: italic;
	}
</style>
