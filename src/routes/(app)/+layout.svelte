<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import MeetingFeedbackModal from '$lib/components/MeetingFeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const SIDEBAR_KEY = 'dyad_sidebar_expanded';
	// Default collapsed — reads localStorage only after mount to avoid SSR mismatch
	let sidebarExpanded = $state(false);

	import { onMount } from 'svelte';
	onMount(() => {
		sidebarExpanded = localStorage.getItem(SIDEBAR_KEY) === 'true';
	});

	function toggleSidebar() {
		sidebarExpanded = !sidebarExpanded;
		localStorage.setItem(SIDEBAR_KEY, String(sidebarExpanded));
	}

	// Utility nav items shown at the top of the strip
	const utilNav = [
		{ icon: 'search',    label: 'Search',    href: null },
		{ icon: 'inbox',     label: 'Inbox',     href: null },
		{ icon: 'bookmarks', label: 'Bookmarks', href: null },
		{ icon: 'discover',  label: 'Discover',  href: '/discover' },
	];

	type RoomItem = { href: string; label: string; type: string; badge: string | null; };
	type RoomGroup = { id: string; label: string; items: RoomItem[]; };

	// Communities with Geneva-style grouped rooms
	const communities = [
		{
			id: 'dyad-berlin',
			name: 'dyad Berlin',
			initial: 'D',
			image: 'https://picsum.photos/seed/dyad-berlin-city/64/64',
			type: 'public',
			online: 12,
			groups: [
				{
					id: 'gather', label: 'GATHER',
					items: [
						{ href: '/discover',   label: 'Conversations', type: 'conversations', badge: null },
						{ href: '/events',     label: 'Events',        type: 'events',        badge: null },
					]
				},
				{
					id: 'community', label: 'COMMUNITY',
					items: [
						{ href: '/chat',       label: 'Chat',          type: 'chat',          badge: '3' },
						{ href: '/newsletter', label: 'Blog',          type: 'blog',          badge: null },
						{ href: '/members',    label: 'Members',       type: 'members',       badge: null },
					]
				},
				{
					id: 'governance', label: 'GOVERNANCE',
					items: [
						{ href: '/assembly',   label: 'Assembly',      type: 'assembly',      badge: 'open' },
					]
				},
				{
					id: 'safety', label: 'TRUST & SAFETY',
					items: [
						{ href: '/trust',      label: 'Moderation log',    type: 'safety',    badge: null },
						{ href: '/trust',      label: 'Community standards',type: 'safety',    badge: null },
						{ href: '/trust',      label: 'Report an issue',   type: 'safety',    badge: null },
					]
				},
			] as RoomGroup[]
		},
		{
			id: 'publicspaces',
			name: 'PublicSpaces',
			initial: 'PS',
			image: 'https://picsum.photos/seed/publicspaces-conf/64/64',
			type: 'public',
			online: 34,
			groups: [
				{
					id: 'gather', label: 'GATHER',
					items: [
						{ href: '/discover',   label: 'Conversations', type: 'conversations', badge: null },
						{ href: '/events',     label: 'Events',        type: 'events',        badge: '1' },
					]
				},
				{
					id: 'community', label: 'COMMUNITY',
					items: [
						{ href: '/chat',       label: 'Chat',          type: 'chat',          badge: '7' },
						{ href: '/newsletter', label: 'Field Notes',   type: 'blog',          badge: null },
						{ href: '/members',    label: 'Members',       type: 'members',       badge: null },
					]
				},
				{
					id: 'governance', label: 'GOVERNANCE',
					items: [
						{ href: '/assembly',   label: 'Assembly',      type: 'assembly',      badge: null },
					]
				},
				{
					id: 'safety', label: 'TRUST & SAFETY',
					items: [
						{ href: '/assembly',   label: 'Moderation log',    type: 'safety',    badge: null },
						{ href: '/assembly',   label: 'Community standards',type: 'safety',    badge: null },
					]
				},
			] as RoomGroup[]
		},
		{
			id: 'rebuild',
			name: 'Rebuild',
			initial: 'R',
			image: 'https://picsum.photos/seed/rebuild-eu-arch/64/64',
			type: 'public',
			online: 8,
			groups: [
				{
					id: 'gather', label: 'GATHER',
					items: [
						{ href: '/discover',   label: 'Conversations', type: 'conversations', badge: null },
					]
				},
				{
					id: 'community', label: 'COMMUNITY',
					items: [
						{ href: '/chat',       label: 'Chat',          type: 'chat',          badge: null },
						{ href: '/newsletter', label: 'Updates',       type: 'blog',          badge: null },
					]
				},
				{
					id: 'governance', label: 'GOVERNANCE',
					items: [
						{ href: '/assembly',   label: 'Assembly',      type: 'assembly',      badge: null },
					]
				},
				{
					id: 'safety', label: 'TRUST & SAFETY',
					items: [
						{ href: '/assembly',   label: 'Moderation log',    type: 'safety',    badge: null },
						{ href: '/assembly',   label: 'Community standards',type: 'safety',    badge: null },
					]
				},
			] as RoomGroup[]
		},
		{
			id: 'kreuzberg-reads',
			name: 'Kreuzberg Reads',
			initial: 'KR',
			image: 'https://picsum.photos/seed/kreuzberg-books/64/64',
			type: 'public',
			online: 5,
			groups: [
				{
					id: 'gather', label: 'GATHER',
					items: [
						{ href: '/discover',   label: 'Conversations', type: 'conversations', badge: null },
						{ href: '/events',     label: 'Events',        type: 'events',        badge: null },
					]
				},
				{
					id: 'community', label: 'COMMUNITY',
					items: [
						{ href: '/chat',       label: 'Chat',          type: 'chat',          badge: '1' },
						{ href: '/newsletter', label: 'Reading list',  type: 'blog',          badge: null },
					]
				},
			] as RoomGroup[]
		},
		{
			id: 'private-1',
			name: 'Digital Sovereignty',
			initial: '🔒',
			image: null,
			type: 'private',
			online: 6,
			groups: [
				{
					id: 'gather', label: 'GATHER',
					items: [
						{ href: '/discover',   label: 'Conversations', type: 'conversations', badge: null },
					]
				},
				{
					id: 'community', label: 'COMMUNITY',
					items: [
						{ href: '/chat',       label: 'Secure chat',   type: 'chat',          badge: null },
						{ href: '/newsletter', label: 'Documents',     type: 'blog',          badge: null },
					]
				},
				{
					id: 'governance', label: 'GOVERNANCE',
					items: [
						{ href: '/assembly',   label: 'Decisions',     type: 'assembly',      badge: null },
					]
				},
			] as RoomGroup[]
		},
		{
			id: 'private-2',
			name: 'Invite only',
			initial: '🔒',
			image: null,
			type: 'private',
			online: 3,
			groups: [
				{
					id: 'gather', label: 'GATHER',
					items: [
						{ href: '/discover',   label: 'Conversations', type: 'conversations', badge: null },
					]
				},
				{
					id: 'community', label: 'COMMUNITY',
					items: [
						{ href: '/chat',       label: 'Chat',          type: 'chat',          badge: null },
					]
				},
			] as RoomGroup[]
		},
	];

	// Collapsed state per group per community
	let collapsedGroups = $state<Record<string, boolean>>({});

	let activeCommunityId = $state('dyad-berlin');
	const activeCommunity = $derived(communities.find(c => c.id === activeCommunityId) ?? communities[0]);

	// Mobile community drawer
	let mobileDrawerOpen = $state(false);

	// Discover / application modal
	let discoverOpen = $state(false);
	let applyingTo = $state<{ name: string; description: string; questions: string[] } | null>(null);
	let applicationSubmitted = $state(false);

	const discoverableSpaces = [
		// ── Open: anyone can join ─────────────────────────────────────────
		{
			id: 'cassette-heads',
			name: 'Cassette Heads Sessions',
			type: 'open',
			label: 'OPEN',
			cover: null,
			accentColor: '#c8a86b',
			description: 'A music collective meeting in Berlin to listen, discuss, and share — from ambient to noise, vinyl to tape. No elitism. Just ears.',
			questions: [],
		},
		{
			id: 'kreuzberg-reads',
			name: 'Kreuzberg Reads',
			type: 'open',
			label: 'OPEN',
			cover: null,
			accentColor: '#7a9e7e',
			description: 'A neighbourhood reading community. Books, essays, ideas — one conversation at a time, usually on a Thursday.',
			questions: [],
		},
		{
			id: 'rebuild-eu',
			name: 'Rebuild',
			type: 'open',
			label: 'OPEN',
			cover: null,
			accentColor: '#6b7fa8',
			description: 'A pan-European sprint to strengthen the social platform ecosystem for digital sovereignty.',
			questions: [],
		},
		// ── Intimate Space: discoverable but curated entry ────────────────
		{
			id: 'yes-we-bleed',
			name: 'Yes We Bleed',
			type: 'intimate',
			label: 'INTIMATE SPACE',
			cover: null,
			accentColor: '#b05060',
			description: "A space for menstrual justice advocates, researchers, and community organisers. We gather in Berlin to share resources, organise campaigns, and support each other's work. Entry is curated — we review each application to keep the space intentional.",
			questions: [
				'How does menstrual justice connect to your work or personal experience?',
				'What would you bring to this community?',
				'Have you been part of a similar collective before? Tell us a little about it.',
			],
		},
		{
			id: 'philosophy-xberg',
			name: 'Philosophy in Xberg',
			type: 'intimate',
			label: 'INTIMATE SPACE',
			cover: null,
			accentColor: '#8a6fa8',
			description: 'Monthly philosophy conversations in Kreuzberg. We read texts together and think out loud. Curated for people who show up consistently.',
			questions: [
				'What philosophical question keeps coming back to you?',
				'What does showing up to a reading group mean to you?',
			],
		},
		// ── Private: closed, undiscoverable — shown as locked ────────────
		{
			id: 'private-1',
			name: '',
			type: 'private',
			label: 'PRIVATE SPACE',
			cover: null,
			accentColor: null,
			description: null,
			questions: [],
		},
		{
			id: 'private-2',
			name: '',
			type: 'private',
			label: 'PRIVATE SPACE',
			cover: null,
			accentColor: null,
			description: null,
			questions: [],
		},
	];

	function isActive(href: string) {
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="app-shell" class:sidebar-expanded={sidebarExpanded}>

	<!-- ── LEFT STRIP ── -->
	<nav class="community-strip" aria-label="Navigation">

		<!-- Avatar at top -->
		<div class="strip-section">
			<a href="/profile" class="strip-avatar" title={data.username} aria-label="Profile">
				<span class="avatar-initial">{(data.username ?? '?')[0].toUpperCase()}</span>
				<span class="online-dot" aria-hidden="true"></span>
			</a>
		</div>

		<div class="strip-divider"></div>

		<!-- Utility nav: search, inbox, bookmarks, discover -->
		<div class="strip-section">
			{#each utilNav as item}
				<button
					class="strip-util-btn"
					title={item.label}
					aria-label={item.label}
					onclick={() => {
						if (item.icon === 'search' || item.icon === 'discover') {
							discoverOpen = true;
						}
					}}
				>
					{#if item.icon === 'search'}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
					{:else if item.icon === 'inbox'}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M2 9h3.5l1.5 2 1.5-2H12" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
					{:else if item.icon === 'bookmarks'}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h8a1 1 0 011 1v10l-5-3-5 3V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
					{:else if item.icon === 'discover'}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 5.5l-2 4-4 2 2-4 4-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
					{/if}
				</button>
			{/each}
		</div>

		<div class="strip-divider"></div>

		<!-- Communities with real images -->
		<div class="strip-section strip-communities">
			{#each communities as c}
				<button
					class="community-icon"
					class:community-icon--active={activeCommunityId === c.id}
					class:community-icon--private={c.type === 'private'}
					title={c.name}
					aria-label={c.name}
					onclick={() => activeCommunityId = c.id}
				>
					{#if c.type === 'private'}
						<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
							<path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
						</svg>
					{:else if c.image}
						<img src={c.image} alt={c.name} />
					{:else}
						<span class="community-initial">{c.initial}</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Bottom: create space + expand -->
		<div class="strip-bottom">
			<button
				class="community-icon community-icon--add"
				title="Create a space"
				aria-label="Create a space"
				onclick={() => discoverOpen = true}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>

			<button
				class="expand-btn"
				class:expand-btn--open={sidebarExpanded}
				onclick={toggleSidebar}
				aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
				title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					{#if sidebarExpanded}
						<path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					{:else}
						<path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					{/if}
				</svg>
			</button>
		</div>
	</nav>

	<!-- ── ROOMS PANEL: only shown when expanded ── -->

	<!-- ── ROOMS PANEL ── -->
	<aside class="rooms-panel" class:rooms-panel--private={activeCommunity.type === 'private'}>

		<!-- Header -->
		<div class="rooms-header">
			<div class="rooms-header-top">
				<span class="rooms-community-name">{activeCommunity.name}</span>
				{#if activeCommunity.type === 'private'}
					<span class="rooms-private-badge">
						<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
						invite only
					</span>
				{/if}
			</div>
			<span class="rooms-online">
				<span class="online-dot online-dot--sm" aria-hidden="true"></span>
				{activeCommunity.online} online
			</span>
		</div>

		<!-- Invite button (public communities only) -->
		{#if activeCommunity.type !== 'private'}
			<div class="rooms-invite">
				<button class="invite-btn">
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M12 10v4M14 12h-4M1 14s1-4 5-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
					Invite people
				</button>
			</div>
		{/if}

		<!-- Grouped rooms (Geneva style) -->
		<nav class="rooms-nav" aria-label="Spaces">
			<div class="rooms-group-label">ROOMS</div>

			{#each activeCommunity.groups as group}
				{@const groupKey = `${activeCommunity.id}-${group.id}`}
				{@const collapsed = collapsedGroups[groupKey] ?? false}

				<button
					class="rooms-group-header"
					onclick={() => collapsedGroups = { ...collapsedGroups, [groupKey]: !collapsed }}
					aria-expanded={!collapsed}
				>
					<svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="group-chevron" class:group-chevron--collapsed={collapsed}>
						<path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					{group.label}
				</button>

				{#if !collapsed}
					{#each group.items as item}
						<a
							href={item.href}
							class="room-item"
							class:room-item--active={isActive(item.href)}
						>
							<span class="room-icon" aria-hidden="true">
								{#if item.type === 'conversations'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 7l6-5 6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
								{:else if item.type === 'events'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
								{:else if item.type === 'chat'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
								{:else if item.type === 'blog'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
								{:else if item.type === 'members'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 10c1.7 0 3 1.3 3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
								{:else if item.type === 'assembly'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
								{:else if item.type === 'poll'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="9" width="3" height="5" rx="0.5" stroke="currentColor" stroke-width="1.3"/><rect x="6.5" y="5" width="3" height="9" rx="0.5" stroke="currentColor" stroke-width="1.3"/><rect x="11" y="2" width="3" height="12" rx="0.5" stroke="currentColor" stroke-width="1.3"/></svg>
								{:else if item.type === 'safety'}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2L2 5v4c0 3.3 2.5 6.1 6 7 3.5-.9 6-3.7 6-7V5L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
								{/if}
							</span>
							<span class="room-label">{item.label}</span>
							{#if item.badge}
								<span class="room-badge" class:room-badge--text={isNaN(Number(item.badge))}>{item.badge}</span>
							{/if}
						</a>
					{/each}
				{/if}
			{/each}
		</nav>

		<div class="rooms-footer">
			{#if activeCommunity.type === 'private'}
				<div class="private-notice">
					<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
					Private · invite only
				</div>
			{:else}
				<a href="/conversations/new" class="new-conversation-btn">
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					New conversation
				</a>
			{/if}
		</div>
	</aside>

	<!-- ── MAIN CONTENT ── -->
	<main class="app-main">
		{@render children()}
	</main>

</div>

<!-- ── MOBILE COMMUNITY DRAWER ── -->
{#if mobileDrawerOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="mobile-drawer-backdrop" onclick={() => mobileDrawerOpen = false}></div>
	<div class="mobile-drawer" role="dialog" aria-label="Communities">
		<div class="mobile-drawer-header">
			<span class="mobile-drawer-title">Communities</span>
			<button class="mobile-drawer-close" onclick={() => mobileDrawerOpen = false} aria-label="Close">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			</button>
		</div>
		<div class="mobile-drawer-communities">
			{#each communities as c}
				<button
					class="mobile-community-row"
					class:mobile-community-row--active={activeCommunityId === c.id}
					onclick={() => { activeCommunityId = c.id; mobileDrawerOpen = false; }}
				>
					<div class="mobile-community-icon" class:mobile-community-icon--private={c.type === 'private'}>
						{#if c.type === 'private'}
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
						{:else if c.image}
							<img src={c.image} alt={c.name} />
						{:else}
							<span>{c.initial}</span>
						{/if}
					</div>
					<div class="mobile-community-info">
						<span class="mobile-community-name">{c.name}</span>
						<span class="mobile-community-type">{c.type}</span>
					</div>
				</button>
			{/each}
		</div>
		<div class="mobile-drawer-footer">
			<button class="mobile-drawer-discover" onclick={() => { mobileDrawerOpen = false; discoverOpen = true; }}>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 5.5l-2 4-4 2 2-4 4-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
				Discover more spaces
			</button>
		</div>
	</div>
{/if}

<!-- ── MOBILE SIDEBAR BACKDROP ── -->
{#if sidebarExpanded}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="mobile-sidebar-backdrop" onclick={toggleSidebar}></div>
{/if}

<!-- ── MOBILE BOTTOM NAV ── -->
<nav class="mobile-nav" aria-label="Mobile navigation">
	<button class="mobile-nav-btn" onclick={toggleSidebar} aria-label="Toggle sidebar">
		<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="1.4" rx="0.7" fill="currentColor"/><rect x="2" y="7.3" width="8" height="1.4" rx="0.7" fill="currentColor"/><rect x="2" y="10.6" width="10" height="1.4" rx="0.7" fill="currentColor"/></svg>
		<span class="mobile-nav-label">Menu</span>
	</button>
	<button class="mobile-nav-btn" onclick={() => discoverOpen = true} aria-label="Discover spaces">
		<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 5.5l-2 4-4 2 2-4 4-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
		<span class="mobile-nav-label">Discover</span>
	</button>
	<a class="mobile-nav-btn" href="/conversations/new" aria-label="New conversation">
		<svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
		<span class="mobile-nav-label">New</span>
	</a>
</nav>

<!-- ── DISCOVER COMMUNITIES MODAL ── -->
{#if discoverOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => { discoverOpen = false; applyingTo = null; }}>
		<div class="discover-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			{#if applicationSubmitted}
				<!-- Membership pending -->
				<div class="pending-screen">
					<div class="pending-card">
						<img src="/images/logo.png" alt="dyad." class="pending-logo" />
						<h2 class="pending-title">Membership pending</h2>
						<p class="pending-desc">Your answer has been submitted. The organiser will review your request and you'll receive a confirmation soon.</p>
						<p class="pending-meantime">In the meantime:</p>
						<a href="/conversations/new" class="pending-btn" onclick={() => { applicationSubmitted = false; discoverOpen = false; }}>Start a conversation</a>
						<button class="pending-link" onclick={() => { applicationSubmitted = false; applyingTo = null; }}>Explore more spaces</button>
					</div>
				</div>
			{:else if applyingTo}
				<!-- Application form -->
				<div class="modal-header">
					<h2 class="modal-title">Apply to join</h2>
					<button class="modal-close" onclick={() => applyingTo = null} aria-label="Back">← back</button>
				</div>
				<div class="apply-form">
					<p class="apply-community-name">{applyingTo.name}</p>
					<p class="apply-description">{applyingTo.description}</p>
					{#each applyingTo.questions as q, i}
						<div class="apply-field">
							<label class="apply-label" for="q{i}">{q}</label>
							<textarea id="q{i}" class="apply-textarea" rows="3" placeholder="Your answer..."></textarea>
						</div>
					{/each}
					<button class="apply-submit" onclick={() => { applyingTo = null; applicationSubmitted = true; }}>
						Submit application
					</button>
				</div>
			{:else}
				<!-- Discover grid -->
				<div class="modal-header">
					<h2 class="modal-title">Discover spaces</h2>
					<button class="modal-close" onclick={() => discoverOpen = false} aria-label="Close">
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					</button>
				</div>
				<div class="discover-search">
					<input type="text" placeholder="Search spaces..." class="search-input" />
				</div>

				<!-- Open spaces -->
				<div class="discover-section-label">Open</div>
				<div class="discover-grid">
					{#each discoverableSpaces.filter(s => s.type === 'open') as space}
						<div class="dfos-discover-card">
							<div class="dfos-discover-cover" style="background: {space.accentColor}30;">
								<div class="dfos-cover-bar" style="background: {space.accentColor};"></div>
							</div>
							<div class="dfos-discover-overlay">
								<span class="dfos-discover-label dfos-label--open">{space.label}</span>
								<span class="dfos-discover-name">{space.name}</span>
							</div>
							<div class="dfos-discover-body">
								<p class="dfos-discover-desc">{space.description}</p>
								<button class="discover-join-btn" onclick={() => { discoverOpen = false; }}>Join</button>
							</div>
						</div>
					{/each}
				</div>

				<!-- Intimate spaces -->
				<div class="discover-section-label">Intimate spaces</div>
				<div class="discover-section-note">Discoverable but curated — organiser reviews each application.</div>
				<div class="discover-grid">
					{#each discoverableSpaces.filter(s => s.type === 'intimate') as space}
						<div class="dfos-discover-card">
							<div class="dfos-discover-cover" style="background: {space.accentColor}20;">
								<div class="dfos-cover-bar" style="background: {space.accentColor}; opacity: 0.7;"></div>
							</div>
							<div class="dfos-discover-overlay">
								<span class="dfos-discover-label dfos-label--intimate">{space.label}</span>
								<span class="dfos-discover-name">{space.name}</span>
							</div>
							<div class="dfos-discover-body">
								<p class="dfos-discover-desc">{space.description}</p>
								<button
									class="discover-apply-btn"
									onclick={() => applyingTo = { name: space.name, description: space.description ?? '', questions: space.questions ?? [] }}
								>Apply to join</button>
							</div>
						</div>
					{/each}
				</div>

				<!-- Private spaces -->
				<div class="discover-section-label">Private</div>
				<div class="discover-section-note">Closed and undiscoverable. Accessible by invitation only.</div>
				<div class="discover-grid">
					{#each discoverableSpaces.filter(s => s.type === 'private') as _space}
						<div class="dfos-discover-card dfos-discover-card--private">
							<div class="dfos-discover-cover dfos-cover--private">
								<svg width="20" height="20" viewBox="0 0 16 16" fill="none" style="color:rgba(255,255,255,0.2)"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
							</div>
							<div class="dfos-discover-body">
								<span class="dfos-discover-label dfos-label--private">PRIVATE SPACE</span>
								<span class="discover-invite-note">Invitation required.</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<FeedbackModal />

{#if data.pendingFeedback}
	<MeetingFeedbackModal
		formId={data.pendingFeedback.formId}
		meetingId={data.pendingFeedback.meetingId}
		initialState={data.pendingFeedback.state}
		vocabulary={data.pendingFeedback.vocabulary}
		meetingContext={data.pendingFeedback.meetingContext}
	/>
{/if}

<style>
	.app-shell {
		display: grid;
		grid-template-columns: 64px 0px 1fr;
		height: 100vh;
		overflow: hidden;
		background: var(--bg-canvas);
		transition: grid-template-columns 0.22s ease;
	}

	.app-shell.sidebar-expanded {
		grid-template-columns: 64px 220px 1fr;
	}

	/* Prevent rooms-panel text from leaking out while animating closed */
	.app-shell:not(.sidebar-expanded) .rooms-panel {
		visibility: hidden;
		pointer-events: none;
	}

	.app-shell.sidebar-expanded .rooms-panel {
		visibility: visible;
		pointer-events: auto;
		transition: visibility 0s 0s;
	}

	/* ── Community strip ── */
	.community-strip {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--bg-canvas);
		border-right: 1px solid var(--border-link);
		padding: 14px 0;
		overflow: hidden;
		gap: 0;
	}

	.strip-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 8px 0;
		width: 100%;
	}

	.strip-communities {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
	}
	.strip-communities::-webkit-scrollbar { display: none; }

	/* Utility nav buttons */
	.strip-util-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		transition: background 0.12s, color 0.12s;
	}
	.strip-util-btn:hover {
		background: var(--bg-control);
		color: var(--text-primary);
	}

	.strip-divider {
		width: 28px;
		height: 1px;
		background: var(--border-link);
		margin: 4px 0;
	}

	.community-icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--bg-control);
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		color: var(--text-muted);
		font-size: 13px;
		font-weight: 500;
		transition: border-radius 0.2s, background 0.15s;
		overflow: hidden;
		position: relative;
		border: 2px solid transparent;
	}

	.community-icon img { width: 100%; height: 100%; object-fit: cover; }

	.community-icon--active {
		border-color: var(--text-primary);
		border-radius: 12px;
	}

	.community-icon:hover { border-radius: 12px; background: var(--bg-control-hover); }

	.community-icon--add {
		border: 1px dashed var(--border-link);
		background: none;
	}
	.community-icon--add:hover { background: var(--bg-control); }

	.community-icon--private {
		opacity: 0.5;
		border: 1px dashed var(--border-link);
		background: none;
	}
	.community-icon--private.community-icon--active {
		opacity: 1;
		border-color: var(--text-primary);
		background: var(--bg-control);
	}
	.community-icon--private:hover { opacity: 0.85; }

	.community-initial {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		color: var(--text-primary);
	}

	.strip-bottom {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 8px 0 4px;
		border-top: 1px solid var(--border-link);
		width: 100%;
		margin-top: auto;
	}

	.strip-avatar {
		position: relative;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--bg-control);
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	.online-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-success);
		border: 2px solid var(--bg-canvas);
	}

	.strip-avatar .online-dot {
		position: absolute;
		bottom: 0;
		right: 0;
	}

	.online-dot--sm { width: 6px; height: 6px; }

	.avatar-initial {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-primary);
		font-weight: 500;
	}

	/* ── Rooms panel ── */
	.rooms-panel {
		border-right: 1px solid var(--border-link);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--bg-canvas);
		/* No explicit width — grid column controls this entirely */
		min-width: 0;
		/* Prevent content from forcing the column open */
		max-width: 220px;
	}

	/* Expand button */
	.expand-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: 1px solid var(--border-link);
		background: var(--bg-control);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		transition: background 0.15s, color 0.15s;
		margin-bottom: 8px;
	}
	.expand-btn:hover {
		background: var(--bg-control-hover);
		color: var(--text-primary);
	}
	.expand-btn--open {
		color: var(--text-primary);
		background: var(--bg-control);
	}

	.rooms-header {
		padding: 18px 16px 14px;
		border-bottom: 1px solid var(--border-link);
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.rooms-header-top {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.rooms-community-name {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 14px;
		font-weight: 400;
		color: var(--text-primary);
	}

	.rooms-private-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-pill);
		padding: 2px 7px;
	}

	.rooms-panel--private .rooms-header {
		background: var(--bg-control);
	}

	/* Invite button */
	.rooms-invite {
		padding: 10px 10px 4px;
	}

	.invite-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 9px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		transition: opacity 0.15s;
	}
	.invite-btn:hover { opacity: 0.82; }

	/* Group headers */
	.rooms-group-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		padding: 12px 12px 4px;
		opacity: 0.6;
	}

	.rooms-group-header {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 5px 12px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
		transition: color 0.12s;
		text-align: left;
		margin-top: 6px;
	}
	.rooms-group-header:hover { color: var(--text-primary); }

	.group-chevron {
		transition: transform 0.15s ease;
		flex-shrink: 0;
	}
	.group-chevron--collapsed { transform: rotate(-90deg); }

	.room-badge--text {
		background: rgba(61,158,90,0.12);
		color: var(--color-success);
		border-color: rgba(61,158,90,0.2);
	}

	.private-notice {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		padding: 8px 10px;
		opacity: 0.6;
	}

	.rooms-online {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.rooms-nav {
		flex: 1;
		overflow-y: auto;
		padding: 12px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.room-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: var(--radius-input);
		text-decoration: none;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.03em;
		transition: background 0.12s, color 0.12s;
		position: relative;
	}

	.room-item:hover {
		background: var(--bg-control);
		color: var(--text-primary);
	}

	.room-item--active {
		background: var(--bg-control);
		color: var(--text-primary);
	}

	.room-icon { flex-shrink: 0; display: flex; }
	.room-label { flex: 1; }

	.room-badge {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.06em;
		background: var(--bg-control);
		color: var(--text-muted);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-pill);
		padding: 1px 6px;
	}

	.rooms-footer {
		padding: 12px 8px 16px;
		border-top: 1px solid var(--border-link);
	}

	.new-conversation-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: var(--radius-input);
		border: 1px dashed var(--border-link);
		text-decoration: none;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		transition: background 0.12s, color 0.12s;
		width: 100%;
		box-sizing: border-box;
	}
	.new-conversation-btn:hover {
		background: var(--bg-control);
		color: var(--text-primary);
		border-style: solid;
	}

	/* ── Main content ── */
	.app-main {
		overflow-y: auto;
		height: 100vh;
		background: var(--bg-canvas);
		position: relative;
	}

	/* ── Discover modal ── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.5);
		z-index: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
	}

	.discover-modal {
		background: var(--bg-canvas);
		border-radius: var(--radius-card);
		width: 680px;
		max-width: calc(100vw - 32px);
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 24px 64px rgba(0,0,0,0.2);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 24px 16px;
		position: sticky;
		top: 0;
		background: var(--bg-canvas);
		border-bottom: 1px solid var(--border-link);
	}

	.modal-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.3rem;
		font-weight: 400;
		margin: 0;
		color: var(--text-primary);
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 4px 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: color 0.15s;
	}
	.modal-close:hover { color: var(--text-primary); }

	.discover-search {
		padding: 12px 24px;
	}

	.search-input {
		width: 100%;
		padding: 10px 14px;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-control);
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-primary);
		outline: none;
	}
	.search-input:focus { border-color: var(--line-color); }

	.discover-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		background: var(--border-link);
		border-top: 1px solid var(--border-link);
	}

	.discover-card {
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
		transition: background 0.15s;
	}
	.discover-card:hover { background: var(--bg-control); }

	.discover-card-cover {
		width: 100%;
		aspect-ratio: 16/9;
		background: var(--bg-control);
		position: relative;
		overflow: hidden;
	}

	.discover-card--private .discover-card-cover {
		background: #111;
	}

	.discover-card--gated .discover-card-cover {
		background: linear-gradient(135deg, var(--bg-control) 0%, rgba(0,0,0,0.08) 100%);
	}

	.discover-private-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255,255,255,0.3);
	}

	.discover-card-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; }

	.discover-card-name-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }

	.discover-card-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.discover-card-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		flex-shrink: 0;
	}

	/* DFOS-style cards inside the modal */
	.dfos-discover-card {
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: background 0.15s;
		position: relative;
	}
	.dfos-discover-card:hover { background: var(--bg-control); }

	.dfos-discover-cover {
		width: 100%;
		aspect-ratio: 16/9;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.dfos-cover-bar {
		position: absolute;
		bottom: 0; left: 0; right: 0;
		height: 3px;
	}

	.dfos-cover--private {
		background: #111 !important;
	}

	.dfos-discover-card--private { opacity: 0.5; cursor: default; }
	.dfos-discover-card--private:hover { background: var(--bg-canvas); }

	.dfos-discover-overlay {
		position: absolute;
		bottom: 44%;
		left: 0; right: 0;
		padding: 0 14px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		pointer-events: none;
	}

	.dfos-discover-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.dfos-discover-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.dfos-label--open { color: var(--color-success); }
	.dfos-label--intimate { color: #a06040; }
	.dfos-label--private { color: var(--text-muted); opacity: 0.5; }

	.dfos-discover-body {
		padding: 12px 14px 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.dfos-discover-desc {
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-muted);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.discover-section-label {
		padding: 16px 24px 4px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		border-top: 1px solid var(--border-link);
	}

	.discover-section-note {
		padding: 0 24px 10px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		opacity: 0.6;
	}

	.discover-card-cover-accent {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
	}

	.discover-card--intimate .discover-card-cover {
		position: relative;
	}

	.discover-card-label--open { color: var(--color-success); background: rgba(61,158,90,0.1); }
	.discover-card-label--intimate { color: #a06040; background: rgba(160,96,64,0.1); border: 1px solid rgba(160,96,64,0.2); }
	.discover-card-label--private { color: var(--text-muted); background: var(--bg-control); border: 1px dashed var(--border-link); opacity: 0.6; }

	/* Membership pending screen */
	.pending-screen {
		min-height: 360px;
		background: linear-gradient(135deg, #1a1040 0%, #0d1a2e 50%, #1a2010 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
	}

	.pending-card {
		background: rgba(10,10,10,0.85);
		border-radius: var(--radius-card);
		padding: 40px 36px;
		max-width: 400px;
		width: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.pending-logo {
		height: 20px;
		width: auto;
		filter: brightness(0) invert(1) opacity(0.6);
		margin-bottom: 4px;
	}

	.pending-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.2rem;
		font-weight: 400;
		color: #fff;
		margin: 0;
	}

	.pending-desc {
		font-size: 13px;
		line-height: 1.6;
		color: rgba(255,255,255,0.65);
		margin: 0;
		max-width: 100%;
	}

	.pending-meantime {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(255,255,255,0.4);
		margin: 8px 0 0;
	}

	.pending-btn {
		display: block;
		width: 100%;
		background: rgba(255,255,255,0.12);
		color: #fff;
		border: 1px solid rgba(255,255,255,0.2);
		border-radius: var(--radius-input);
		padding: 12px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.06em;
		cursor: pointer;
		text-decoration: none;
		text-align: center;
		transition: background 0.15s;
	}
	.pending-btn:hover { background: rgba(255,255,255,0.18); }

	.pending-link {
		background: none;
		border: none;
		color: rgba(255,255,255,0.45);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		cursor: pointer;
		padding: 4px;
		transition: color 0.15s;
	}
	.pending-link:hover { color: rgba(255,255,255,0.75); }

	.discover-card-desc {
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-muted);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.discover-join-btn, .discover-apply-btn {
		align-self: flex-start;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 6px 14px;
		border-radius: var(--radius-input);
		border: none;
		cursor: pointer;
		transition: opacity 0.15s;
		margin-top: 4px;
	}
	.discover-join-btn { background: var(--text-primary); color: var(--bg-canvas); }
	.discover-join-btn:hover { opacity: 0.8; }
	.discover-apply-btn { background: var(--bg-control); color: var(--text-primary); border: 1px solid var(--border-link); }
	.discover-apply-btn:hover { background: var(--bg-control-hover); }

	.discover-invite-note {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		opacity: 0.5;
		margin-top: 4px;
	}

	/* Application form */
	.apply-form { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

	.apply-community-name {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.1rem;
		color: var(--text-primary);
		margin: 0;
	}

	.apply-description {
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-muted);
		margin: 0;
	}

	.apply-field { display: flex; flex-direction: column; gap: 8px; }

	.apply-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-primary);
	}

	.apply-textarea {
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-control);
		padding: 10px 12px;
		font-family: inherit;
		font-size: 13px;
		color: var(--text-primary);
		resize: vertical;
		outline: none;
	}
	.apply-textarea:focus { border-color: var(--line-color); }

	.apply-submit {
		align-self: flex-start;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		padding: 10px 24px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.06em;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.apply-submit:hover { opacity: 0.82; }

	/* ── Mobile bottom nav ── */
	.mobile-nav {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 56px;
		background: var(--bg-canvas);
		border-top: 1px solid var(--border-link);
		align-items: center;
		justify-content: space-around;
		z-index: 950;
		padding: 0 32px;
	}

	.mobile-nav-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		text-decoration: none;
		padding: 4px 16px;
		transition: color 0.15s;
	}
	.mobile-nav-btn:hover { color: var(--text-primary); }

	.mobile-nav-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	/* ── Mobile community drawer ── */
	.mobile-drawer-backdrop {
		display: none;
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.4);
		z-index: 940;
	}

	.mobile-drawer {
		display: none;
		position: fixed;
		left: 0;
		top: 0;
		bottom: 56px;
		width: 280px;
		background: var(--bg-canvas);
		border-right: 1px solid var(--border-link);
		z-index: 945;
		flex-direction: column;
		overflow: hidden;
	}

	.mobile-drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 20px 16px;
		border-bottom: 1px solid var(--border-link);
	}

	.mobile-drawer-title {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.mobile-drawer-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		padding: 4px;
		display: flex;
		align-items: center;
	}

	.mobile-drawer-communities {
		flex: 1;
		overflow-y: auto;
		padding: 8px 0;
	}

	.mobile-community-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 10px 20px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--text-secondary);
		transition: background 0.12s;
	}
	.mobile-community-row:hover { background: var(--bg-control); }
	.mobile-community-row--active { color: var(--text-primary); background: var(--bg-control); }

	.mobile-community-icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--bg-control);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
	}
	.mobile-community-icon img { width: 100%; height: 100%; object-fit: cover; }
	.mobile-community-icon--private { background: var(--bg-control); color: var(--text-muted); }

	.mobile-community-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.mobile-community-name {
		font-size: 14px;
		font-weight: 500;
		color: inherit;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mobile-community-type {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.mobile-drawer-footer {
		padding: 12px 20px;
		border-top: 1px solid var(--border-link);
	}

	.mobile-drawer-discover {
		display: flex;
		align-items: center;
		gap: 8px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 0;
		transition: color 0.15s;
	}
	.mobile-drawer-discover:hover { color: var(--text-primary); }

	.mobile-sidebar-backdrop {
		display: none;
		position: fixed;
		inset: 0;
		bottom: 56px;
		background: rgba(0,0,0,0.5);
		z-index: 910;
	}

	@media (max-width: 900px) {
		.mobile-drawer-backdrop { display: block; }
		.mobile-drawer { display: flex; }
		.mobile-sidebar-backdrop { display: block; }
	}

	/* ── Mobile: collapse sidebar ── */
	@media (max-width: 900px) {
		.app-shell,
		.app-shell.sidebar-expanded {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr;
			width: 100%;
		}

		/* Hidden by default — shown as overlay when expanded */
		.community-strip {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			bottom: 56px;
			z-index: 920;
			width: 64px;
		}

		.rooms-panel {
			display: none;
			position: fixed;
			top: 0;
			left: 64px;
			bottom: 56px;
			z-index: 920;
			width: 240px;
			visibility: visible !important;
			pointer-events: auto !important;
		}

		/* Backdrop handled by real div — see .mobile-sidebar-backdrop below */

		/* Show both panels when expanded */
		.app-shell.sidebar-expanded .community-strip {
			display: flex;
		}

		.app-shell.sidebar-expanded .rooms-panel {
			display: flex;
		}

		.app-main {
			height: calc(100vh - 56px);
			width: 100%;
		}

		.mobile-nav { display: flex; }

		.discover-modal {
			width: 100%;
			max-width: 100%;
			max-height: 92vh;
			border-radius: var(--radius-card) var(--radius-card) 0 0;
			margin-top: auto;
		}

		.modal-backdrop {
			align-items: flex-end;
		}
	}
</style>
