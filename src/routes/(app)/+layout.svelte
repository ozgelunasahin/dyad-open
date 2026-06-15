<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';
	import FeedbackModal from '$lib/components/FeedbackModal.svelte';
	import MeetingFeedbackModal from '$lib/components/MeetingFeedbackModal.svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const SIDEBAR_KEY = 'dyad_sidebar_expanded';
	let sidebarExpanded = $state(false);

	function toggleSidebar() {
		sidebarExpanded = !sidebarExpanded;
	}

	// Utility nav items shown at the top of the strip
	const utilNav = [
		{ icon: 'search',  label: 'Search',    href: null },
		{ icon: 'profile', label: 'Profile',   href: '/profile' },
		{ icon: 'discover',label: 'Browse communities', href: null },
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
					id: 'community', label: 'COMMUNITY',
					items: [
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
					id: 'community', label: 'COMMUNITY',
					items: [
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
					id: 'community', label: 'COMMUNITY',
					items: [
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
					id: 'community', label: 'COMMUNITY',
					items: [
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
					id: 'community', label: 'COMMUNITY',
					items: [
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
			groups: [] as RoomGroup[]
		},
	];

	// Collapsed state per group per community
	let collapsedGroups = $state<Record<string, boolean>>({});

	let activeCommunityId = $state('dyad-berlin');
	const activeCommunity = $derived(communities.find(c => c.id === activeCommunityId) ?? communities[0]);

	$effect(() => {
		// Reset group collapse state whenever community changes
		activeCommunityId;
		collapsedGroups = {};
	});

	// Mobile community drawer
	let mobileDrawerOpen = $state(false);

	// Discover / application modal
	let discoverOpen = $state(false);
	let communityMenuOpen = $state(false);
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

		<!-- Utility nav: search, inbox, profile, discover -->
		<div class="strip-section">
			{#each utilNav as item}
				{#if item.href}
					<a
						href={item.href}
						class="strip-util-btn"
						title={item.label}
						aria-label={item.label}
					>
						{#if item.icon === 'profile'}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.8" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-2.6 2.7-4.8 6-4.8s6 2.2 6 4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
						{:else if item.icon === 'discover'}
							<!-- Binoculars -->
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="10" r="3" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M7 10h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M1 10V7l3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 10V7l-3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
						{/if}
					</a>
				{:else}
					<button
						class="strip-util-btn"
						title={item.label}
						aria-label={item.label}
						onclick={() => {
							if (item.icon === 'search') goto('/discover?search=1');
							else if (item.icon === 'discover') discoverOpen = true;
						}}
					>
						{#if item.icon === 'search'}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
						{:else if item.icon === 'discover'}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="10" r="3" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M7 10h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M1 10V7l3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 10V7l-3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
						{/if}
					</button>
				{/if}
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

			<a href="/logout" class="strip-util-btn" title="Log out" aria-label="Log out">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 11l4-3-4-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
			</a>

		</div>
	</nav>

	<!-- ── ROOMS PANEL: only shown when expanded ── -->
	<aside class="rooms-panel" class:rooms-panel--private={activeCommunity.type === 'private'}>

		<!-- User row -->
		<div class="rooms-user-row">
			<a href="/profile" class="rooms-user-avatar">
				<span class="avatar-initial">{(data.username ?? '?')[0].toUpperCase()}</span>
				<span class="online-dot rooms-user-dot" aria-hidden="true"></span>
			</a>
			<div class="rooms-user-info">
				<span class="rooms-username">{data.username ?? 'member'}</span>
				<span class="rooms-user-status">online</span>
			</div>
		</div>

		<!-- Utility nav with labels -->
		<nav class="rooms-util-nav" aria-label="Navigation">
			{#each utilNav as item}
				{#if item.href}
					<a href={item.href} class="rooms-util-item" class:rooms-util-item--active={$page.url.pathname.startsWith(item.href)}>
						{#if item.icon === 'profile'}
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.8" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-2.6 2.7-4.8 6-4.8s6 2.2 6 4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
						{/if}
						<span>{item.label}</span>
					</a>
				{:else}
					<button class="rooms-util-item" onclick={() => {
						if (item.icon === 'search') goto('/discover?search=1');
						else if (item.icon === 'discover') discoverOpen = true;
					}}>
						{#if item.icon === 'search'}
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
						{:else if item.icon === 'discover'}
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="10" r="3" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M7 10h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M1 10V7l3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 10V7l-3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
						{/if}
						<span>{item.label}</span>
					</button>
				{/if}
			{/each}
		</nav>

		<div class="rooms-section-divider"></div>

		<!-- Communities list with names -->
		<div class="rooms-communities-label">Communities</div>
		<div class="rooms-communities-list">
			{#each communities as c}
				<button
					class="rooms-community-row"
					class:rooms-community-row--active={activeCommunityId === c.id}
					onclick={() => { activeCommunityId = c.id; sidebarExpanded = false; }}
				>
					<div class="rooms-community-icon community-icon" class:community-icon--private={c.type === 'private'}>
						{#if c.type === 'private'}
							<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
						{:else if c.image}
							<img src={c.image} alt={c.name} />
						{:else}
							<span class="community-initial">{c.initial}</span>
						{/if}
					</div>
					<span class="rooms-community-name">{c.name}</span>
				</button>
			{/each}
		</div>

		<!-- Desktop only: group nav (mobile uses community menu sheet via topbar) -->
		<nav class="rooms-nav rooms-nav--desktop" aria-label="Spaces">
			{#each activeCommunity.groups as group}
				{@const groupKey = `${activeCommunity.id}-${group.id}`}
				{@const collapsed = collapsedGroups[groupKey] ?? true}

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
						<a href={item.href} class="room-item" class:room-item--active={isActive(item.href)}>
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
								{:else}
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 7l6-5 6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
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

			<a href="/logout" class="rooms-logout-btn" data-sveltekit-reload>
				<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M10 11l4-3-4-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
				Log out
			</a>
		</div>
	</aside>

	<!-- ── MAIN CONTENT ── -->
	<main class="app-main">
		{@render children()}
	</main>


</div>

<!-- ── MOBILE TOPBAR ── -->
<div class="mobile-topbar" class:mobile-topbar--hidden={sidebarExpanded}>
	<button
		class="mobile-hamburger"
		onclick={toggleSidebar}
		aria-label="Open menu"
	>
		<svg width="18" height="18" viewBox="0 0 16 16" fill="none">
			<rect x="2" y="4" width="12" height="1.4" rx="0.7" fill="currentColor"/>
			<rect x="2" y="7.3" width="8" height="1.4" rx="0.7" fill="currentColor"/>
			<rect x="2" y="10.6" width="10" height="1.4" rx="0.7" fill="currentColor"/>
		</svg>
	</button>

	<button
		class="mobile-community-badge"
		onclick={() => communityMenuOpen = !communityMenuOpen}
		aria-expanded={communityMenuOpen}
		aria-label="Community menu"
	>
		<div class="mobile-community-badge-icon community-icon" class:community-icon--private={activeCommunity.type === 'private'}>
			{#if activeCommunity.type === 'private'}
				<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
			{:else if activeCommunity.image}
				<img src={activeCommunity.image} alt={activeCommunity.name} />
			{:else}
				<span class="community-initial">{activeCommunity.initial}</span>
			{/if}
		</div>
		<span class="mobile-community-badge-name">{activeCommunity.name}</span>
		<svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="mobile-community-chevron" class:mobile-community-chevron--open={communityMenuOpen}>
			<path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</button>
</div>

<!-- ── COMMUNITY MENU SHEET ── -->
{#if communityMenuOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="cmenu-backdrop" onclick={() => communityMenuOpen = false}></div>
	<div class="cmenu-sheet" role="dialog" aria-label="{activeCommunity.name} menu">
		<!-- Header -->
		<div class="cmenu-header">
			<div class="cmenu-icon community-icon" class:community-icon--private={activeCommunity.type === 'private'}>
				{#if activeCommunity.type === 'private'}
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
				{:else if activeCommunity.image}
					<img src={activeCommunity.image} alt={activeCommunity.name} />
				{:else}
					<span class="community-initial" style="font-size:1.1rem">{activeCommunity.initial}</span>
				{/if}
			</div>
			<span class="cmenu-title">{activeCommunity.name}</span>
		</div>

		<!-- Nav sections from this community -->
		{#each activeCommunity.groups as group}
			<div class="cmenu-section">
				{#if group.label}
					<div class="cmenu-section-label">{group.label}</div>
				{/if}
				{#each group.items as item}
					<a href={item.href} class="cmenu-row" onclick={() => communityMenuOpen = false}>
						<span class="cmenu-row-label">{item.label}</span>
						<span class="cmenu-row-icon">
							{#if item.type === 'members'}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 10c1.7 0 3 1.3 3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
							{:else if item.type === 'blog'}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
							{:else if item.type === 'assembly'}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
							{:else if item.type === 'safety'}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L2 5v4c0 3.3 2.5 6.1 6 7 3.5-.9 6-3.7 6-7V5L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
							{:else if item.type === 'events'}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
							{:else}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 7l6-5 6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
							{/if}
						</span>
					</a>
				{/each}
			</div>
			<div class="cmenu-divider"></div>
		{/each}
	</div>
{/if}

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
				<!-- Discover list -->
				<div class="modal-header">
					<h2 class="modal-title">Discover spaces</h2>
					<button class="modal-close" onclick={() => discoverOpen = false} aria-label="Close">
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					</button>
				</div>

				<div class="discover-search">
					<svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
					<input type="text" placeholder="Search spaces..." class="search-input" />
				</div>

				<div class="discover-list">
					<!-- Open spaces -->
					<div class="ds-section-head">
						<span class="ds-section-title">Open</span>
						<span class="ds-section-note">Anyone can join instantly.</span>
					</div>
					{#each discoverableSpaces.filter(s => s.type === 'open') as space}
						<div class="ds-row">
							<div class="ds-avatar" style="background: {space.accentColor}18; border-color: {space.accentColor}30;">
								<span class="ds-avatar-initial" style="color: {space.accentColor};">{space.name[0]}</span>
							</div>
							<div class="ds-info">
								<div class="ds-name-row">
									<span class="ds-name">{space.name}</span>
									<span class="ds-badge ds-badge--open">Open</span>
								</div>
								<p class="ds-desc">{space.description}</p>
							</div>
							<button class="ds-action ds-action--join" onclick={() => { discoverOpen = false; }}>Join</button>
						</div>
					{/each}

					<!-- Intimate spaces -->
					<div class="ds-section-head ds-section-head--spaced">
						<span class="ds-section-title">Intimate spaces</span>
						<span class="ds-section-note">Discoverable but curated — organiser reviews each application.</span>
					</div>
					{#each discoverableSpaces.filter(s => s.type === 'intimate') as space}
						<div class="ds-row">
							<div class="ds-avatar" style="background: {space.accentColor}18; border-color: {space.accentColor}30;">
								<span class="ds-avatar-initial" style="color: {space.accentColor};">{space.name[0]}</span>
							</div>
							<div class="ds-info">
								<div class="ds-name-row">
									<span class="ds-name">{space.name}</span>
									<span class="ds-badge ds-badge--intimate">Curated</span>
								</div>
								<p class="ds-desc">{space.description}</p>
							</div>
							<button
								class="ds-action ds-action--apply"
								onclick={() => applyingTo = { name: space.name, description: space.description ?? '', questions: space.questions ?? [] }}
							>Apply</button>
						</div>
					{/each}

					<!-- Private spaces -->
					<div class="ds-section-head ds-section-head--spaced">
						<span class="ds-section-title">Private</span>
						<span class="ds-section-note">Closed and undiscoverable. Accessible by invitation only.</span>
					</div>
					{#each discoverableSpaces.filter(s => s.type === 'private') as _space}
						<div class="ds-row ds-row--private">
							<div class="ds-avatar ds-avatar--private">
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
							</div>
							<div class="ds-info">
								<div class="ds-name-row">
									<span class="ds-name ds-name--private">Private space</span>
									<span class="ds-badge ds-badge--private">Invite only</span>
								</div>
								<p class="ds-desc ds-desc--private">This space is hidden and accessible by invitation only.</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<FeedbackModal isAdmin={data.isAdmin} />

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
		min-width: 0;
		max-width: 220px;
	}

	/* User row */
	.rooms-user-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 14px 12px;
		border-bottom: 1px solid var(--border-link);
	}

	.rooms-user-avatar {
		position: relative;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--bg-control);
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		flex-shrink: 0;
	}

	.rooms-user-dot {
		position: absolute;
		bottom: 0;
		right: 0;
	}

	.rooms-user-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.rooms-username {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rooms-user-status {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-success);
		letter-spacing: 0.04em;
	}

	/* Util nav in rooms panel */
	.rooms-util-nav {
		display: flex;
		flex-direction: column;
		padding: 8px 6px;
		gap: 1px;
	}

	.rooms-util-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 8px;
		border-radius: var(--radius-input);
		text-decoration: none;
		color: var(--text-muted);
		font-size: 13px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		width: 100%;
		text-align: left;
		transition: background 0.12s, color 0.12s;
	}
	.rooms-util-item:hover, .rooms-util-item--active {
		background: var(--bg-control);
		color: var(--text-primary);
	}

	.rooms-section-divider {
		height: 1px;
		background: var(--border-link);
		margin: 2px 0;
	}

	/* Communities list in rooms panel */
	.rooms-communities-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		padding: 10px 14px 4px;
		opacity: 0.6;
	}

	.rooms-communities-list {
		display: flex;
		flex-direction: column;
		padding: 2px 6px;
		gap: 1px;
	}

	.rooms-community-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 5px 8px;
		border-radius: var(--radius-input);
		background: none;
		border: none;
		cursor: pointer;
		width: 100%;
		text-align: left;
		transition: background 0.12s;
	}
	.rooms-community-row:hover { background: var(--bg-control); }
	.rooms-community-row--active { background: var(--bg-control); }

	.rooms-community-icon {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.rooms-community-name {
		font-size: 13px;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	/* Group nav only shows on desktop — mobile uses the community menu sheet */
	@media (max-width: 900px) {
		.rooms-nav--desktop { display: none; }
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

	.rooms-logout-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
		padding: 8px 10px;
		border-radius: var(--radius-input);
		text-decoration: none;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		transition: background 0.12s, color 0.12s;
		width: 100%;
		box-sizing: border-box;
	}
	.rooms-logout-btn:hover {
		background: var(--bg-control);
		color: var(--text-primary);
	}


	/* ── Main content ── */
	.app-main {
		overflow-y: auto;
		height: 100vh;
		background: var(--bg-canvas);
		position: relative;
		padding: var(--space-6);
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

	/* ── Discover list ── */
	.discover-search {
		padding: 14px 20px;
		border-bottom: 1px solid var(--border-link);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.search-icon { color: var(--text-muted); flex-shrink: 0; }

	.search-input {
		flex: 1;
		border: none;
		background: none;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--text-primary);
		outline: none;
	}
	.search-input::placeholder { color: var(--text-muted); }

	.discover-list {
		padding: 0 0 16px;
	}

	.ds-section-head {
		padding: 20px 20px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.ds-section-head--spaced {
		padding-top: 28px;
		border-top: 1px solid var(--border-link);
		margin-top: 8px;
	}

	.ds-section-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.ds-section-note {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}

	.ds-row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 20px;
		transition: background 0.12s;
	}
	.ds-row:hover { background: var(--bg-control); }
	.ds-row--private { opacity: 0.45; pointer-events: none; }

	.ds-avatar {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		border: 1px solid var(--border-link);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.ds-avatar--private {
		background: var(--bg-control);
		border-color: var(--border-link);
		color: var(--text-muted);
	}

	.ds-avatar-initial {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 16px;
		font-weight: 400;
	}

	.ds-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.ds-name-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.ds-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ds-name--private { color: var(--text-muted); }

	.ds-badge {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		white-space: nowrap;
		flex-shrink: 0;
	}
	.ds-badge--open { background: rgba(61,158,90,0.1); color: var(--color-success); }
	.ds-badge--intimate { background: rgba(160,96,64,0.1); color: #a06040; }
	.ds-badge--private { background: var(--bg-control); color: var(--text-muted); border: 1px dashed var(--border-link); }

	.ds-desc {
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-muted);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ds-desc--private { opacity: 0.6; }

	.ds-action {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 6px 14px;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: opacity 0.15s, background 0.15s;
	}
	.ds-action--join {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
	}
	.ds-action--join:hover { opacity: 0.8; }
	.ds-action--apply {
		background: none;
		color: var(--text-primary);
		border: 1px solid var(--border-link);
	}
	.ds-action--apply:hover { background: var(--bg-control); }

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

	/* ── Mobile topbar ── */
	.mobile-topbar {
		display: none;
		position: fixed;
		top: 10px;
		left: 10px;
		right: 10px;
		z-index: 960;
		align-items: center;
		gap: 8px;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 12px;
		padding: 0 10px 0 4px;
		height: 44px;
		backdrop-filter: blur(12px);
	}

	.mobile-topbar--hidden { display: none !important; }

	.mobile-hamburger {
		display: flex;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-primary);
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background 0.12s;
	}
	.mobile-hamburger:hover { background: var(--bg-control); }

	.mobile-community-badge {
		display: flex;
		align-items: center;
		gap: 7px;
		flex: 1;
		min-width: 0;
	}

	.mobile-community-badge-icon {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.mobile-community-badge-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mobile-community-chevron {
		color: var(--text-muted);
		flex-shrink: 0;
		transition: transform 0.18s ease;
	}
	.mobile-community-chevron--open {
		transform: rotate(180deg);
	}

	/* ── Community menu sheet ── */
	.cmenu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 955;
		background: rgba(0, 0, 0, 0.4);
	}

	.cmenu-sheet {
		position: fixed;
		top: 64px;
		left: 10px;
		right: 10px;
		z-index: 960;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		animation: cmenu-in 0.18s cubic-bezier(0.32, 0.72, 0, 1);
	}

	@keyframes cmenu-in {
		from { opacity: 0; transform: translateY(-8px) scale(0.98); }
		to   { opacity: 1; transform: translateY(0) scale(1); }
	}

	.cmenu-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 24px 20px 20px;
		border-bottom: 1px solid var(--border-link);
	}

	.cmenu-icon {
		width: 56px;
		height: 56px;
		border-radius: 14px;
	}

	.cmenu-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.cmenu-section {
		display: flex;
		flex-direction: column;
	}

	.cmenu-section-label {
		padding: 10px 20px 4px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.cmenu-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 13px 20px;
		text-decoration: none;
		color: var(--text-primary);
		font-size: 14px;
		transition: background 0.1s;
	}
	.cmenu-row:hover { background: var(--bg-control); }

	.cmenu-row-icon {
		color: var(--text-muted);
	}

	.cmenu-divider {
		height: 1px;
		background: var(--border-link);
		margin: 0 20px;
	}
	.cmenu-divider:last-child { display: none; }

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
		bottom: 0;
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
		bottom: 0;
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
		.mobile-topbar { display: flex; }

		.app-shell,
		.app-shell.sidebar-expanded {
			display: flex;
			flex-direction: column;
			min-height: 100vh;
			height: auto;
			overflow: visible;
			width: 100%;
		}

		/* Hidden by default on mobile */
		.community-strip {
			display: none;
		}

		.rooms-panel {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			z-index: 920;
			width: 280px;
			max-width: 85vw;
			visibility: visible !important;
			pointer-events: auto !important;
		}

		/* When expanded: show only the rooms panel (no strip) */
		.app-shell.sidebar-expanded .rooms-panel {
			display: flex;
		}

		.app-main {
			min-height: 100vh;
			height: auto;
			width: 100%;
			overflow-y: auto;
			padding: var(--space-4);
		}

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
