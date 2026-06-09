<script lang="ts">
	type LocationType = 'in-person' | 'online' | 'hybrid';
	type EventStatus = 'going' | 'interested' | null;

	type CommunityEvent = {
		id: string;
		community: string;
		communityId: string;
		title: string;
		organiser: string;
		organiserInitial: string;
		organiserColor: string;
		date: string; // ISO
		coverColor: string;
		coverLabel: string;
		locationType: LocationType;
		locationName: string;
		attendees: number;
		status: EventStatus;
		description: string;
	};

	const events: CommunityEvent[] = [
		// ── dyad Berlin ──────────────────────────────────────────
		{
			id: 'ev-01',
			community: 'dyad Berlin',
			communityId: 'dyad-berlin',
			title: 'Governance Assembly — June 2026',
			organiser: 'Sarell',
			organiserInitial: 'S',
			organiserColor: '#a06040',
			date: '2026-06-15T18:00:00',
			coverColor: '#3a4a5a',
			coverLabel: 'ASSEMBLY',
			locationType: 'in-person',
			locationName: 'Oyoun, Kreuzberg',
			attendees: 18,
			status: 'going',
			description: 'Monthly open assembly. Proposals, updates, and collective decision-making. All members welcome.',
		},
		{
			id: 'ev-02',
			community: 'dyad Berlin',
			communityId: 'dyad-berlin',
			title: 'New Member Welcome — June Cohort',
			organiser: 'Özge',
			organiserInitial: 'Ö',
			organiserColor: '#7a6ea8',
			date: '2026-06-16T19:00:00',
			coverColor: '#4a3a6a',
			coverLabel: 'ONBOARDING',
			locationType: 'in-person',
			locationName: 'Café Kohi, Neukölln',
			attendees: 11,
			status: null,
			description: 'For everyone who joined in the last four weeks. Orientation, Q&A, and introductions.',
		},
		{
			id: 'ev-03',
			community: 'dyad Berlin',
			communityId: 'dyad-berlin',
			title: 'Face to Face: What Does Safety Feel Like Online?',
			organiser: 'Fatima',
			organiserInitial: 'F',
			organiserColor: '#a05860',
			date: '2026-06-20T18:30:00',
			coverColor: '#2a4a3a',
			coverLabel: 'CONVERSATION',
			locationType: 'in-person',
			locationName: 'Neukölln Kollektiv',
			attendees: 24,
			status: 'interested',
			description: 'A guided face-to-face conversation series. This session on platform safety, who it\'s for, and what it costs.',
		},
		{
			id: 'ev-04',
			community: 'dyad Berlin',
			communityId: 'dyad-berlin',
			title: 'Zine Collective — Issue #3 Planning',
			organiser: 'Mira',
			organiserInitial: 'M',
			organiserColor: '#6b8fa8',
			date: '2026-06-22T17:00:00',
			coverColor: '#4a4a2a',
			coverLabel: 'ZINE',
			locationType: 'in-person',
			locationName: 'Riso-Studio Mitte',
			attendees: 9,
			status: null,
			description: 'Pitch and plan contributions for Issue #3. Theme: infrastructure. Writers, illustrators, designers welcome.',
		},
		{
			id: 'ev-05',
			community: 'dyad Berlin',
			communityId: 'dyad-berlin',
			title: 'Moderation Frameworks — Working Session',
			organiser: 'Theodore',
			organiserInitial: 'T',
			organiserColor: '#5a8a70',
			date: '2026-06-25T19:00:00',
			coverColor: '#3a5a4a',
			coverLabel: 'WORKING GROUP',
			locationType: 'in-person',
			locationName: 'Supermarkt, Wedding',
			attendees: 14,
			status: null,
			description: 'Open working session on community moderation policy. Reviewing draft framework v0.3.',
		},
		// ── PublicSpaces ─────────────────────────────────────────
		{
			id: 'ev-06',
			community: 'PublicSpaces',
			communityId: 'publicspaces',
			title: 'AT Protocol — Private Rooms Technical Briefing',
			organiser: 'Astrid',
			organiserInitial: 'A',
			organiserColor: '#806880',
			date: '2026-06-11T15:00:00',
			coverColor: '#2a3a5a',
			coverLabel: 'TECHNICAL',
			locationType: 'in-person',
			locationName: 'Waag Future Lab, Amsterdam',
			attendees: 38,
			status: 'going',
			description: 'Overview of the private permissioned data layer in AT Protocol. Open to engineers and policy researchers.',
		},
		{
			id: 'ev-07',
			community: 'PublicSpaces',
			communityId: 'publicspaces',
			title: 'Community Safety Summit — Amsterdam',
			organiser: 'Rudy',
			organiserInitial: 'R',
			organiserColor: '#5a7aa8',
			date: '2026-06-17T14:00:00',
			coverColor: '#3a2a5a',
			coverLabel: 'SUMMIT',
			locationType: 'in-person',
			locationName: 'Pakhuis de Zwijger, Amsterdam',
			attendees: 112,
			status: 'interested',
			description: 'Annual gathering for platform safety researchers, community builders, and activists. This year\'s theme: distributed moderation at scale.',
		},
		// ── Rebuild ──────────────────────────────────────────────
		{
			id: 'ev-08',
			community: 'Rebuild',
			communityId: 'rebuild',
			title: 'EuroSky Working Group — Sprint Review',
			organiser: 'Marc',
			organiserInitial: 'M',
			organiserColor: '#7a6060',
			date: '2026-06-18T16:00:00',
			coverColor: '#4a3a2a',
			coverLabel: 'SPRINT',
			locationType: 'in-person',
			locationName: 'Impact Hub Berlin, Kreuzberg',
			attendees: 21,
			status: null,
			description: 'Fortnightly sprint review for EuroSky contributors. Open to members of the Rebuild coalition.',
		},
		{
			id: 'ev-09',
			community: 'Rebuild',
			communityId: 'rebuild',
			title: 'Decidim Hands-On — Introduction for Organisers',
			organiser: 'Nina',
			organiserInitial: 'N',
			organiserColor: '#786888',
			date: '2026-06-24T17:30:00',
			coverColor: '#3a2a4a',
			coverLabel: 'WORKSHOP',
			locationType: 'in-person',
			locationName: 'Betahaus, Kreuzberg',
			attendees: 33,
			status: null,
			description: 'Practical intro to Decidim for community organisers. No prior technical knowledge needed.',
		},
		// ── Kreuzberg Reads ──────────────────────────────────────
		{
			id: 'ev-10',
			community: 'Kreuzberg Reads',
			communityId: 'kreuzberg-reads',
			title: 'June Session — The Ministry for the Future',
			organiser: 'Bea',
			organiserInitial: 'B',
			organiserColor: '#7a8060',
			date: '2026-06-19T19:30:00',
			coverColor: '#2a4a2a',
			coverLabel: 'READING',
			locationType: 'in-person',
			locationName: 'Buchhandlung Oranienstraße',
			attendees: 7,
			status: 'going',
			description: 'Kim Stanley Robinson. Chapters 32–48. No preparation required — first-timers welcome.',
		},
		// ── Past ─────────────────────────────────────────────────
		{
			id: 'ev-p1',
			community: 'dyad Berlin',
			communityId: 'dyad-berlin',
			title: 'Governance Assembly — May 2026',
			organiser: 'Sarell',
			organiserInitial: 'S',
			organiserColor: '#a06040',
			date: '2026-05-18T18:00:00',
			coverColor: '#3a4a5a',
			coverLabel: 'ASSEMBLY',
			locationType: 'in-person',
			locationName: 'Oyoun, Kreuzberg',
			attendees: 15,
			status: 'going',
			description: 'May assembly. Reviewed onboarding policy and approved the moderation framework draft.',
		},
		{
			id: 'ev-p2',
			community: 'PublicSpaces',
			communityId: 'publicspaces',
			title: 'PublicSpaces Conference 2026',
			organiser: 'Hans',
			organiserInitial: 'H',
			organiserColor: '#7a8a60',
			date: '2026-06-03T09:00:00',
			coverColor: '#2a3a4a',
			coverLabel: 'CONFERENCE',
			locationType: 'in-person',
			locationName: 'Amsterdam',
			attendees: 500,
			status: 'going',
			description: '500 organisations from 30 countries. Digital sovereignty, open alternatives, and the future of the social web.',
		},
	];

	const NOW = new Date('2026-06-09T19:00:00');

	let activeCommunityId = $state('all');
	let tab = $state<'upcoming' | 'past'>('upcoming');

	const communities = [
		{ id: 'all', name: 'All communities' },
		{ id: 'dyad-berlin', name: 'dyad Berlin' },
		{ id: 'publicspaces', name: 'PublicSpaces' },
		{ id: 'rebuild', name: 'Rebuild' },
		{ id: 'kreuzberg-reads', name: 'Kreuzberg Reads' },
	];

	const filtered = $derived.by(() => {
		return events
			.filter(e => activeCommunityId === 'all' || e.communityId === activeCommunityId)
			.filter(e => {
				const past = new Date(e.date) < NOW;
				return tab === 'past' ? past : !past;
			})
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	});

	// Group by date label
	type Group = { label: string; dayName: string; events: CommunityEvent[] };
	const grouped = $derived.by((): Group[] => {
		const map = new Map<string, CommunityEvent[]>();
		for (const e of filtered) {
			const d = new Date(e.date);
			const key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(e);
		}
		return [...map.entries()].map(([label, evs]) => ({
			label,
			dayName: new Date(evs[0].date).toLocaleDateString('en-GB', { weekday: 'long' }),
			events: evs,
		}));
	});

	function formatTime(iso: string) {
		return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	}

	const locationIcon: Record<LocationType, string> = {
		'in-person': '📍',
		'online': '🎥',
		'hybrid': '🔀',
	};
</script>

<svelte:head>
	<title>Events — dyad.</title>
</svelte:head>

<div class="page">

	<!-- Top bar -->
	<div class="topbar">
		<div class="community-tabs">
			{#each communities as c}
				<button
					class="ctab"
					class:ctab--active={activeCommunityId === c.id}
					onclick={() => activeCommunityId = c.id}
				>{c.name}</button>
			{/each}
		</div>
		<button class="create-btn">
			<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			Create Event
		</button>
	</div>

	<!-- Header row -->
	<div class="header">
		<h1 class="title">Events</h1>
		<div class="tab-toggle">
			<button class="toggle-btn" class:toggle-btn--active={tab === 'upcoming'} onclick={() => tab = 'upcoming'}>Upcoming</button>
			<button class="toggle-btn" class:toggle-btn--active={tab === 'past'} onclick={() => tab = 'past'}>Past</button>
		</div>
	</div>

	<!-- Timeline -->
	<div class="timeline">
		{#if grouped.length === 0}
			<p class="empty">No {tab} events{activeCommunityId !== 'all' ? ' in this community' : ''}.</p>
		{/if}

		{#each grouped as group}
			<div class="day-group">
				<div class="day-label">
					<span class="day-date">{group.label}</span>
					<span class="day-name">{group.dayName}</span>
					<div class="day-line"></div>
				</div>

				<div class="day-events">
					{#each group.events as ev}
						<div class="event-card">
							<div class="event-body">
								<div class="event-time">{formatTime(ev.date)}</div>
								<h2 class="event-title">{ev.title}</h2>

								<div class="event-meta">
									<div class="event-organiser">
										<div class="org-avatar" style="background: {ev.organiserColor}22; color: {ev.organiserColor};">{ev.organiserInitial}</div>
										By {ev.organiser}
										<span class="community-pill">{ev.community}</span>
									</div>
									<div class="event-location">
										<span class="loc-icon">
											{#if ev.locationType === 'in-person'}
												<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M8 2C5.24 2 3 4.24 3 7c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" stroke-width="1.3"/></svg>
											{:else if ev.locationType === 'online'}
												<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M11 6l4-2v8l-4-2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
											{:else}
												<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M8 2l4 6-4 6-4-6 4-6z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
											{/if}
										</span>
										{ev.locationName}
									</div>
								</div>

								<div class="event-footer">
									{#if ev.status}
										<span class="status-pill status-pill--{ev.status}">
											{ev.status === 'going' ? 'Going' : 'Interested'}
										</span>
									{/if}
									<div class="attendee-stack">
										{#each Array(Math.min(ev.attendees, 5)) as _, i}
											<div class="attendee-dot" style="z-index: {5 - i}; left: {i * 18}px; background: hsl({(i * 47 + ev.id.charCodeAt(3)) % 360}, 35%, 55%);"></div>
										{/each}
										<span class="attendee-count" style="margin-left: {Math.min(ev.attendees, 5) * 18 + 6}px;">
											{#if ev.attendees > 5}+{ev.attendees - 5}{:else}{ev.attendees}{/if}
										</span>
									</div>
								</div>
							</div>

							<div class="event-cover" style="background: {ev.coverColor};">
								<span class="cover-label">{ev.coverLabel}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		color: var(--text-primary);
	}

	/* ── Top bar ── */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-link);
		padding-right: 24px;
		gap: 16px;
	}

	.community-tabs {
		display: flex;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.community-tabs::-webkit-scrollbar { display: none; }

	.ctab {
		padding: 11px 14px;
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

	.create-btn {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 7px 16px;
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
		flex-shrink: 0;
	}
	.create-btn:hover { opacity: 0.82; }

	/* ── Header ── */
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28px 32px 20px;
	}

	.title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.6rem;
		font-weight: 300;
		margin: 0;
	}

	.tab-toggle {
		display: flex;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		overflow: hidden;
	}

	.toggle-btn {
		padding: 7px 18px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		transition: background 0.12s, color 0.12s;
	}
	.toggle-btn--active {
		background: var(--bg-control);
		color: var(--text-primary);
	}

	/* ── Timeline ── */
	.timeline {
		padding: 0 32px 64px;
		display: flex;
		flex-direction: column;
		gap: 40px;
	}

	.empty {
		color: var(--text-muted);
		font-size: 13px;
		padding: 32px 0;
	}

	.day-group {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 0 24px;
		align-items: start;
	}

	.day-label {
		padding-top: 28px;
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: flex-start;
	}

	.day-date {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.day-name {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.day-line {
		width: 1px;
		height: 100%;
		background: var(--border-link);
		margin-top: 10px;
		align-self: stretch;
		display: none;
	}

	.day-events {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* ── Event card ── */
	.event-card {
		display: flex;
		align-items: stretch;
		gap: 0;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		overflow: hidden;
		transition: border-color 0.15s;
		cursor: pointer;
	}
	.event-card:hover { border-color: var(--text-muted); }

	.event-body {
		flex: 1;
		padding: 20px 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}

	.event-time {
		font-family: var(--font-mono);
		font-size: 13px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.event-title {
		font-size: 18px;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.3;
	}

	.event-meta {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.event-organiser {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.org-avatar {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 10px;
		flex-shrink: 0;
	}

	.community-pill {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		padding: 2px 7px;
		border-radius: var(--radius-pill);
		background: var(--bg-control);
		border: 1px solid var(--border-link);
		color: var(--text-muted);
	}

	.event-location {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.loc-icon {
		display: flex;
		align-items: center;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	/* ── Footer: status + attendees ── */
	.event-footer {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 4px;
	}

	.status-pill {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.08em;
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		border: none;
	}
	.status-pill--going {
		background: rgba(61,158,90,0.15);
		color: var(--color-success);
	}
	.status-pill--interested {
		background: rgba(120,104,136,0.15);
		color: #9878a8;
	}

	.attendee-stack {
		position: relative;
		height: 24px;
		display: flex;
		align-items: center;
	}

	.attendee-dot {
		position: absolute;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid var(--bg-canvas);
	}

	.attendee-count {
		position: relative;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	/* ── Cover ── */
	.event-cover {
		width: 120px;
		flex-shrink: 0;
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		padding: 10px 12px;
	}

	.cover-label {
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(255,255,255,0.35);
		writing-mode: vertical-rl;
		transform: rotate(180deg);
	}

	@media (max-width: 700px) {
		.day-group { grid-template-columns: 80px 1fr; gap: 0 12px; }
		.timeline { padding: 0 16px 48px; }
		.header { padding: 20px 16px 16px; }
		.event-cover { width: 80px; }
		.event-title { font-size: 15px; }
		.topbar { padding-right: 16px; }
	}
</style>
