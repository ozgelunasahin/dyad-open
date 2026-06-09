<script lang="ts">
	type Role = 'steward' | 'organiser' | 'member';
	type Member = {
		handle: string;
		name: string;
		role: Role;
		online: boolean;
		away: boolean;
		joined: string;
		tags: string[];
		bio: string;
		initial: string;
		color: string;
		memberNumber: number;
		avatar: string | null;
	};
	type Community = {
		id: string;
		name: string;
		type: 'public' | 'private';
		members: Member[];
	};

	const communities: Community[] = [
		{
			id: 'dyad-berlin',
			name: 'dyad Berlin',
			type: 'public',
			members: [
				{ handle: 'OZGE', name: 'Özge Sahin', role: 'steward', online: true, away: false, joined: '2025-11', tags: ['product', 'governance'], bio: 'Co-founder.', initial: 'Ö', color: '#7a6ea8', memberNumber: 1, avatar: null },
				{ handle: 'THEODORE', name: 'Theodore', role: 'steward', online: true, away: false, joined: '2025-11', tags: ['engineering', 'open source'], bio: 'Co-founder.', initial: 'T', color: '#5a8a70', memberNumber: 2, avatar: null },
				{ handle: 'SARELL', name: 'Sarell', role: 'organiser', online: true, away: false, joined: '2025-12', tags: ['community practice'], bio: 'Community lead.', initial: 'S', color: '#a06040', memberNumber: 3, avatar: null },
				{ handle: 'MIRAK', name: 'Mira Kessler', role: 'member', online: true, away: false, joined: '2026-01', tags: ['design', 'ecology'], bio: 'Graphic designer.', initial: 'M', color: '#6b8fa8', memberNumber: 4, avatar: null },
				{ handle: 'PASCALD', name: 'Pascal Dietrich', role: 'member', online: false, away: true, joined: '2026-01', tags: ['music', 'radio'], bio: 'Radio producer.', initial: 'P', color: '#8a7050', memberNumber: 5, avatar: null },
				{ handle: 'LENAFW', name: 'Lena Frei-Wolf', role: 'member', online: true, away: false, joined: '2026-02', tags: ['journalism'], bio: 'Freelance journalist.', initial: 'L', color: '#b06070', memberNumber: 6, avatar: null },
				{ handle: 'ARMINT', name: 'Armin Tahir', role: 'member', online: false, away: true, joined: '2026-02', tags: ['photography'], bio: 'Documentary photographer.', initial: 'A', color: '#607090', memberNumber: 7, avatar: null },
				{ handle: 'YUKIM', name: 'Yuki Matsuda', role: 'member', online: true, away: false, joined: '2026-03', tags: ['ux', 'accessibility'], bio: 'UX researcher.', initial: 'Y', color: '#6a9080', memberNumber: 8, avatar: null },
				{ handle: 'FATIMAB', name: 'Fatima Benali', role: 'organiser', online: false, away: true, joined: '2026-01', tags: ['education'], bio: 'Digital literacy workshops.', initial: 'F', color: '#a05860', memberNumber: 9, avatar: null },
				{ handle: 'NILSH', name: 'Nils Hagen', role: 'member', online: false, away: true, joined: '2026-03', tags: ['architecture'], bio: 'Architect.', initial: 'N', color: '#708060', memberNumber: 10, avatar: null },
				{ handle: 'ADAR', name: 'Ada Rosenberg', role: 'member', online: true, away: false, joined: '2026-04', tags: ['theatre'], bio: 'Theatre director.', initial: 'A', color: '#906878', memberNumber: 11, avatar: null },
				{ handle: 'LEOSV', name: 'Leo Svensson', role: 'member', online: false, away: true, joined: '2026-04', tags: ['open source'], bio: 'Software engineer.', initial: 'L', color: '#607888', memberNumber: 12, avatar: null },
			]
		},
		{
			id: 'publicspaces',
			name: 'PublicSpaces',
			type: 'public',
			members: [
				{ handle: 'RUDYF', name: 'Rudy Fraser', role: 'steward', online: true, away: false, joined: '2025-06', tags: ['blacksky', 'moderation'], bio: 'Founder of Blacksky.', initial: 'R', color: '#5a7aa8', memberNumber: 1, avatar: null },
				{ handle: 'HANSDB', name: 'Hans de Bruin', role: 'steward', online: true, away: false, joined: '2025-06', tags: ['governance'], bio: 'PublicSpaces board.', initial: 'H', color: '#7a8a60', memberNumber: 2, avatar: null },
				{ handle: 'ASTRIDV', name: 'Astrid Voss', role: 'organiser', online: false, away: true, joined: '2025-09', tags: ['atproto'], bio: 'AT Protocol engineer.', initial: 'A', color: '#806880', memberNumber: 3, avatar: null },
				{ handle: 'PIERREM', name: 'Pierre Moreau', role: 'organiser', online: true, away: false, joined: '2025-10', tags: ['media'], bio: 'Public broadcaster.', initial: 'P', color: '#8a6050', memberNumber: 4, avatar: null },
				{ handle: 'SELINA', name: 'Selin Aydın', role: 'member', online: true, away: false, joined: '2026-01', tags: ['dsa', 'policy'], bio: 'Policy researcher.', initial: 'S', color: '#6878a0', memberNumber: 5, avatar: null },
				{ handle: 'BENG', name: 'Ben Gorman', role: 'member', online: false, away: true, joined: '2026-01', tags: ['fediverse'], bio: 'Mastodon instance admin.', initial: 'B', color: '#7a8860', memberNumber: 6, avatar: null },
				{ handle: 'MAJAP', name: 'Maja Petrović', role: 'member', online: true, away: false, joined: '2026-02', tags: ['data coops'], bio: 'Data cooperative.', initial: 'M', color: '#a07060', memberNumber: 7, avatar: null },
				{ handle: 'JANW', name: 'Jan Wiese', role: 'member', online: false, away: false, joined: '2026-02', tags: ['matrix'], bio: 'Matrix contributor.', initial: 'J', color: '#608080', memberNumber: 8, avatar: null },
				{ handle: 'ANAL', name: 'Ana Lopes', role: 'member', online: true, away: false, joined: '2026-03', tags: ['commons'], bio: 'Urban commons researcher.', initial: 'A', color: '#9a6878', memberNumber: 9, avatar: null },
				{ handle: 'TOBIASM', name: 'Tobias Müller', role: 'member', online: false, away: true, joined: '2026-03', tags: ['nextcloud'], bio: 'Nextcloud contributor.', initial: 'T', color: '#707878', memberNumber: 10, avatar: null },
				{ handle: 'ZARAN', name: 'Zara Nkosi', role: 'member', online: true, away: false, joined: '2026-04', tags: ['digital rights'], bio: 'Digital rights advocate.', initial: 'Z', color: '#885868', memberNumber: 11, avatar: null },
			]
		},
		{
			id: 'rebuild',
			name: 'Rebuild',
			type: 'public',
			members: [
				{ handle: 'ELISAK', name: 'Elisa König', role: 'steward', online: true, away: false, joined: '2025-08', tags: ['eu', 'platform'], bio: 'Rebuild coalition.', initial: 'E', color: '#6a80a0', memberNumber: 1, avatar: null },
				{ handle: 'MARCJ', name: 'Marc Jacobs', role: 'organiser', online: false, away: true, joined: '2025-10', tags: ['eurosky'], bio: 'EuroSky project.', initial: 'M', color: '#7a6060', memberNumber: 2, avatar: null },
				{ handle: 'IEVAB', name: 'Ieva Bērziņa', role: 'member', online: true, away: false, joined: '2026-01', tags: ['e-governance'], bio: 'Digital governance advisor.', initial: 'I', color: '#60787a', memberNumber: 3, avatar: null },
				{ handle: 'FELIXR', name: 'Felix Roth', role: 'member', online: false, away: true, joined: '2026-02', tags: ['coop'], bio: 'Platform co-op advocate.', initial: 'F', color: '#8a7860', memberNumber: 4, avatar: null },
				{ handle: 'NINAC', name: 'Nina Castillo', role: 'member', online: true, away: false, joined: '2026-03', tags: ['decidim'], bio: 'Civic tech researcher.', initial: 'N', color: '#786888', memberNumber: 5, avatar: null },
				{ handle: 'OLIVERK', name: 'Oliver Kamau', role: 'member', online: false, away: false, joined: '2026-03', tags: ['security'], bio: 'Digital security trainer.', initial: 'O', color: '#607060', memberNumber: 6, avatar: null },
				{ handle: 'VERAS', name: 'Vera Schneider', role: 'member', online: true, away: false, joined: '2026-04', tags: ['regulation'], bio: 'Policy advisor.', initial: 'V', color: '#907070', memberNumber: 7, avatar: null },
			]
		},
		{
			id: 'kreuzberg-reads',
			name: 'Kreuzberg Reads',
			type: 'public',
			members: [
				{ handle: 'BEAH', name: 'Bea Hofmann', role: 'steward', online: true, away: false, joined: '2025-09', tags: ['literature'], bio: 'Started this group.', initial: 'B', color: '#7a8060', memberNumber: 1, avatar: null },
				{ handle: 'ALEXB', name: 'Alex Brenner', role: 'member', online: false, away: true, joined: '2025-11', tags: ['philosophy'], bio: 'PhD student.', initial: 'A', color: '#6070a0', memberNumber: 2, avatar: null },
				{ handle: 'MIAD', name: 'Mia Deschamps', role: 'member', online: true, away: false, joined: '2026-01', tags: ['translation'], bio: 'Translator.', initial: 'M', color: '#a06878', memberNumber: 3, avatar: null },
				{ handle: 'DAVIDO', name: 'David Osei', role: 'member', online: false, away: true, joined: '2026-02', tags: ['afrolit'], bio: 'Brings good books.', initial: 'D', color: '#608868', memberNumber: 4, avatar: null },
				{ handle: 'KLARAW', name: 'Klara Wirth', role: 'organiser', online: true, away: false, joined: '2026-01', tags: ['zines'], bio: 'Runs the programme.', initial: 'K', color: '#907858', memberNumber: 5, avatar: null },
			]
		},
		{
			id: 'private-1',
			name: 'Digital Sovereignty',
			type: 'private',
			members: [
				{ handle: 'MEMBER1', name: 'Member #1', role: 'steward', online: true, away: false, joined: '2025-07', tags: [], bio: '', initial: '?', color: '#607080', memberNumber: 1, avatar: null },
				{ handle: 'MEMBER2', name: 'Member #2', role: 'organiser', online: false, away: true, joined: '2025-09', tags: [], bio: '', initial: '?', color: '#708060', memberNumber: 2, avatar: null },
				{ handle: 'MEMBER3', name: 'Member #3', role: 'member', online: true, away: false, joined: '2026-01', tags: [], bio: '', initial: '?', color: '#806070', memberNumber: 3, avatar: null },
				{ handle: 'MEMBER4', name: 'Member #4', role: 'member', online: false, away: false, joined: '2026-02', tags: [], bio: '', initial: '?', color: '#607060', memberNumber: 4, avatar: null },
				{ handle: 'MEMBER5', name: 'Member #5', role: 'member', online: true, away: false, joined: '2026-03', tags: [], bio: '', initial: '?', color: '#707060', memberNumber: 5, avatar: null },
			]
		},
	];

	let activeCommunityId = $state('dyad-berlin');
	let search = $state('');
	let activeTab = $state<'members' | 'groups'>('members');

	const activeCommunity = $derived(communities.find(c => c.id === activeCommunityId)!);

	const filtered = $derived.by(() => {
		const q = search.toLowerCase();
		if (!q) return activeCommunity.members;
		return activeCommunity.members.filter(m =>
			m.name.toLowerCase().includes(q) ||
			m.handle.toLowerCase().includes(q) ||
			m.tags.some(t => t.includes(q))
		);
	});

	const onlineCount = $derived(activeCommunity.members.filter(m => m.online).length);

	function statusLabel(m: Member) {
		if (m.online && !m.away) return 'ONLINE';
		if (m.away) return 'AWAY';
		return 'OFFLINE';
	}

	const groups = [
		{ label: 'Stewards', role: 'steward' as Role, desc: 'Own and govern the space. Set community policy and hold final moderation authority.' },
		{ label: 'Organisers', role: 'organiser' as Role, desc: 'Run events, onboard new members, and support community life.' },
		{ label: 'Members', role: 'member' as Role, desc: 'Full members of this community.' },
	];

	let selectedMember = $state<Member | null>(null);

	// Other communities this member appears in (mock: stewards/organisers cross-post)
	function otherCommunities(m: Member): string[] {
		return communities
			.filter(c => c.id !== activeCommunityId && c.members.some(cm => cm.handle === m.handle))
			.map(c => c.name);
	}

	function openMember(m: Member) {
		if (activeCommunity.type === 'private') return;
		selectedMember = m;
	}

	function closeMember() { selectedMember = null; }
</script>

<svelte:head>
	<title>Members — dyad.</title>
</svelte:head>

<div class="page">

	<!-- Community switcher -->
	<div class="community-tabs">
		{#each communities as c}
			<button
				class="ctab"
				class:ctab--active={activeCommunityId === c.id}
				onclick={() => { activeCommunityId = c.id; search = ''; }}
			>
				{#if c.type === 'private'}
					<svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
				{/if}
				{c.name}
			</button>
		{/each}
	</div>

	<!-- Inner nav: Members / Groups -->
	<div class="inner-nav">
		<div class="inner-tabs">
			<button
				class="inner-tab"
				class:inner-tab--active={activeTab === 'members'}
				onclick={() => activeTab = 'members'}
			>
				Members
				<span class="count-pill">{activeCommunity.members.length}</span>
			</button>
			<button
				class="inner-tab"
				class:inner-tab--active={activeTab === 'groups'}
				onclick={() => activeTab = 'groups'}
			>
				Groups
				<span class="count-pill">{groups.filter(g => activeCommunity.members.some(m => m.role === g.role)).length}</span>
			</button>
		</div>

		<div class="nav-actions">
			<div class="search-wrap">
				<svg class="search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
				<input class="search" type="text" placeholder="Search members…" bind:value={search} />
			</div>
			<button class="invite-btn">
				<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M12 10v4M14 12h-4M1 14s1-4 5-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
				Invite
			</button>
		</div>
	</div>

	<!-- Members grid -->
	{#if activeTab === 'members'}
		{#if activeCommunity.type === 'private'}
			<div class="private-notice">
				<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
				Private space — member identities are restricted.
			</div>
		{/if}

		<div class="grid">
			{#each filtered as m}
				<div class="card" onclick={() => openMember(m)} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && openMember(m)}>
					<div class="card-number">
						<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.3"/><path d="M11.5 11.5l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="6" r="1.5" fill="currentColor" opacity=".4"/></svg>
						#{m.memberNumber.toString().padStart(4, '0')}
					</div>

					<div class="avatar-wrap">
						<div class="avatar" style="background: {m.color}22; color: {m.color}; border-color: {m.color}33;">
							{#if activeCommunity.type === 'private'}
								<svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
							{:else}
								{m.initial}
							{/if}
						</div>
						<span
							class="status-dot"
							class:status-dot--online={m.online && !m.away}
							class:status-dot--away={m.away}
						></span>
					</div>

					<div class="card-name">
						{activeCommunity.type === 'private' ? m.name : m.name}
					</div>
					<div class="card-handle">
						@{m.handle}
						<span class="status-label" class:status-label--online={m.online && !m.away} class:status-label--away={m.away}>
							{statusLabel(m)}
						</span>
					</div>

					{#if m.role !== 'member'}
						<div class="role-tag role-tag--{m.role}">{m.role}</div>
					{/if}

					{#if activeCommunity.type !== 'private'}
						<div class="card-actions">
							<button class="action-btn">Follow</button>
							<button class="action-btn">Message</button>
						</div>
					{/if}
				</div>
			{/each}

			{#if filtered.length === 0}
				<p class="empty">No members match "{search}"</p>
			{/if}
		</div>
	{/if}

	<!-- Groups view -->
	{#if activeTab === 'groups'}
		<div class="groups-list">
			{#each groups as g}
				{@const groupMembers = activeCommunity.members.filter(m => m.role === g.role)}
				{#if groupMembers.length > 0}
					<div class="group-row">
						<div class="group-info">
							<span class="group-name">{g.label}</span>
							<span class="group-count">{groupMembers.length}</span>
							<p class="group-desc">{g.desc}</p>
						</div>
						<div class="group-avatars">
							{#each groupMembers.slice(0, 6) as m}
								<div class="mini-avatar" style="background: {m.color}22; color: {m.color}; border-color: {m.color}44;" title={m.name}>
									{m.initial}
								</div>
							{/each}
							{#if groupMembers.length > 6}
								<div class="mini-avatar mini-avatar--more">+{groupMembers.length - 6}</div>
							{/if}
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

</div>

<!-- Member profile modal -->
{#if selectedMember}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeMember}>
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			<button class="modal-close" onclick={closeMember} aria-label="Close">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			</button>

			<div class="modal-avatar-wrap">
				<div class="modal-avatar" style="background: {selectedMember.color}22; color: {selectedMember.color}; border-color: {selectedMember.color}44;">
					{selectedMember.initial}
				</div>
				<span
					class="modal-status-dot"
					class:modal-status-dot--online={selectedMember.online && !selectedMember.away}
					class:modal-status-dot--away={selectedMember.away}
				></span>
			</div>

			<h2 class="modal-name">{selectedMember.name}</h2>

			<div class="modal-community-badge">
				<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="5" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 10c1.7 0 3 1.3 3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
				{activeCommunity.name.toUpperCase()}
			</div>

			<div class="modal-meta">
				MEMBER #{selectedMember.memberNumber.toString().padStart(4, '0')}
				<span class="modal-meta-sep">·</span>
				@{selectedMember.handle}
			</div>

			{#if selectedMember.tags.length > 0}
				<div class="modal-tags">
					{selectedMember.tags.map(t => t.toUpperCase()).join('  ')}
				</div>
			{/if}

			<div class="modal-status-row">
				{statusLabel(selectedMember)}
				<span
					class="modal-status-dot-inline"
					class:modal-status-dot-inline--online={selectedMember.online && !selectedMember.away}
					class:modal-status-dot-inline--away={selectedMember.away}
				></span>
			</div>

			<div class="modal-actions">
				<button class="modal-action-btn modal-action-btn--primary">Follow</button>
				<button class="modal-action-btn">Message</button>
			</div>

			<div class="modal-stats">
				<div class="modal-stat">
					<span class="modal-stat-num">0</span>
					<span class="modal-stat-label">POSTS</span>
				</div>
				<div class="modal-stat-divider"></div>
				<div class="modal-stat">
					<span class="modal-stat-num">0</span>
					<span class="modal-stat-label">COMMENTS</span>
				</div>
			</div>

			<div class="modal-joined">
				JOINED {new Date(selectedMember.joined + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
			</div>

			{#if otherCommunities(selectedMember).length > 0}
				<div class="modal-also-in">
					{#each otherCommunities(selectedMember) as communityName}
						<div class="also-in-row">
							<div class="also-in-icon">{communityName[0]}</div>
							<span>Also in {communityName}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		color: var(--text-primary);
	}

	/* ── Community switcher ── */
	.community-tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--border-link);
		overflow-x: auto;
		scrollbar-width: none;
		flex-shrink: 0;
		background: var(--bg-canvas);
	}
	.community-tabs::-webkit-scrollbar { display: none; }

	.ctab {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 10px 14px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.07em;
		color: var(--text-muted);
		white-space: nowrap;
		transition: color 0.12s;
		margin-bottom: -1px;
	}
	.ctab:hover { color: var(--text-primary); }
	.ctab--active { color: var(--text-primary); border-bottom-color: var(--text-primary); }

	/* ── Inner nav ── */
	.inner-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24px;
		border-bottom: 1px solid var(--border-link);
		gap: 16px;
		flex-shrink: 0;
	}

	.inner-tabs {
		display: flex;
		gap: 0;
	}

	.inner-tab {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 4px;
		margin-right: 24px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-size: 14px;
		color: var(--text-muted);
		font-family: inherit;
		transition: color 0.12s;
		margin-bottom: -1px;
	}
	.inner-tab:hover { color: var(--text-primary); }
	.inner-tab--active { color: var(--text-primary); border-bottom-color: var(--text-primary); }

	.count-pill {
		font-family: var(--font-mono);
		font-size: 10px;
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 0;
	}

	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}
	.search-icon {
		position: absolute;
		left: 10px;
		color: var(--text-muted);
		pointer-events: none;
	}
	.search {
		padding: 8px 12px 8px 30px;
		width: 200px;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-control);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s;
	}
	.search:focus { border-color: var(--text-primary); }
	.search::placeholder { color: var(--text-muted); }

	.invite-btn {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 8px 16px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		transition: opacity 0.15s;
		white-space: nowrap;
	}
	.invite-btn:hover { opacity: 0.82; }

	/* ── Private notice ── */
	.private-notice {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 10px 24px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		background: var(--bg-control);
		border-bottom: 1px solid var(--border-link);
	}

	/* ── Member card grid ── */
	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background: var(--border-link);
		border-top: none;
		flex: 1;
	}

	.card {
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px 20px 20px;
		gap: 0;
		transition: background 0.12s;
		cursor: pointer;
	}
	.card:hover { background: var(--bg-control); }

	.card-number {
		align-self: flex-start;
		display: flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin-bottom: 16px;
		opacity: 0.6;
	}

	.avatar-wrap {
		position: relative;
		margin-bottom: 14px;
	}

	.avatar {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		border: 1px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 24px;
	}

	.status-dot {
		position: absolute;
		bottom: 3px;
		right: 3px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid var(--bg-canvas);
		background: var(--text-muted);
		opacity: 0.4;
	}
	.status-dot--online { background: var(--color-success); opacity: 1; }
	.status-dot--away { background: #f0a040; opacity: 1; }

	.card-name {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 5px;
	}

	.card-handle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin-bottom: 12px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.status-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		opacity: 0.6;
	}
	.status-label--online { color: var(--color-success); opacity: 1; }
	.status-label--away { color: #f0a040; opacity: 1; }

	.role-tag {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		border: 1px solid;
		margin-bottom: 12px;
	}
	.role-tag--steward { color: #7a6ea8; background: rgba(122,110,168,0.08); border-color: rgba(122,110,168,0.25); }
	.role-tag--organiser { color: #5a8a70; background: rgba(90,138,112,0.08); border-color: rgba(90,138,112,0.25); }

	.card-actions {
		display: flex;
		gap: 8px;
		width: 100%;
		margin-top: auto;
	}

	.action-btn {
		flex: 1;
		padding: 8px 0;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-control);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: background 0.12s, border-color 0.12s;
	}
	.action-btn:hover { background: var(--bg-control-hover); border-color: var(--text-muted); }

	.empty {
		padding: 48px 24px;
		color: var(--text-muted);
		font-size: 13px;
		grid-column: 1 / -1;
	}

	/* ── Groups view ── */
	.groups-list {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.group-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 24px;
		border-bottom: 1px solid var(--border-link);
		transition: background 0.12s;
	}
	.group-row:hover { background: var(--bg-control); }

	.group-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.group-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.group-count {
		font-family: var(--font-mono);
		font-size: 10px;
		padding: 1px 7px;
		border-radius: var(--radius-pill);
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		color: var(--text-muted);
	}

	.group-desc {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0;
		max-width: 480px;
		line-height: 1.5;
	}

	.group-avatars {
		display: flex;
		flex-direction: row-reverse;
		flex-shrink: 0;
	}

	.mini-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 2px solid var(--bg-canvas);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 12px;
		margin-left: -8px;
	}

	.mini-avatar--more {
		background: var(--bg-control);
		border-color: var(--border-link);
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.04em;
	}

	/* ── Responsive ── */
	@media (max-width: 1100px) {
		.grid { grid-template-columns: repeat(3, 1fr); }
	}
	@media (max-width: 800px) {
		.grid { grid-template-columns: repeat(2, 1fr); }
		.inner-nav { padding: 0 16px; }
		.search { width: 160px; }
	}
	@media (max-width: 500px) {
		.grid { grid-template-columns: 1fr; }
		.community-tabs { display: none; }
	}

	/* ── Member modal ── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(6px);
		z-index: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.modal {
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 20px;
		width: 100%;
		max-width: 420px;
		max-height: 90vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 40px 32px 32px;
		position: relative;
		gap: 0;
	}

	.modal-close {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		transition: background 0.12s, color 0.12s;
	}
	.modal-close:hover { background: var(--bg-control-hover); color: var(--text-primary); }

	.modal-avatar-wrap {
		position: relative;
		margin-bottom: 20px;
	}

	.modal-avatar {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		border: 1px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 32px;
	}

	.modal-status-dot {
		position: absolute;
		bottom: 4px;
		right: 4px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 3px solid var(--bg-canvas);
		background: var(--text-muted);
		opacity: 0.4;
	}
	.modal-status-dot--online { background: var(--color-success); opacity: 1; }
	.modal-status-dot--away { background: #f0a040; opacity: 1; }

	.modal-name {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 12px;
		text-align: center;
	}

	.modal-community-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 14px;
		border-radius: var(--radius-pill);
		background: rgba(61,158,90,0.1);
		border: 1px solid rgba(61,158,90,0.25);
		color: var(--color-success);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		margin-bottom: 16px;
	}

	.modal-meta {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin-bottom: 14px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.modal-meta-sep { opacity: 0.4; }

	.modal-tags {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
		text-align: center;
		line-height: 1.7;
		margin-bottom: 12px;
		max-width: 320px;
	}

	.modal-status-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin-bottom: 24px;
	}

	.modal-status-dot-inline {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--text-muted);
		opacity: 0.4;
	}
	.modal-status-dot-inline--online { background: var(--color-success); opacity: 1; }
	.modal-status-dot-inline--away { background: #f0a040; opacity: 1; }

	.modal-actions {
		display: flex;
		gap: 10px;
		width: 100%;
		margin-bottom: 28px;
	}

	.modal-action-btn {
		flex: 1;
		padding: 12px 0;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-link);
		background: var(--bg-control);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition: background 0.12s;
	}
	.modal-action-btn:hover { background: var(--bg-control-hover); }
	.modal-action-btn--primary {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-color: var(--text-primary);
	}
	.modal-action-btn--primary:hover { opacity: 0.85; background: var(--text-primary); }

	.modal-stats {
		display: flex;
		align-items: stretch;
		width: 100%;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		overflow: hidden;
		margin-bottom: 14px;
	}

	.modal-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 16px 0;
	}

	.modal-stat-divider {
		width: 1px;
		background: var(--border-link);
	}

	.modal-stat-num {
		font-size: 1.4rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.modal-stat-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		color: var(--text-muted);
	}

	.modal-joined {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin-bottom: 20px;
	}

	.modal-also-in {
		width: 100%;
		border-top: 1px solid var(--border-link);
		padding-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.also-in-row {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.also-in-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 13px;
		color: var(--text-primary);
		flex-shrink: 0;
	}
</style>
