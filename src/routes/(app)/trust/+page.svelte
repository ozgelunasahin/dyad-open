<script lang="ts">
	type ActionType = 'removed' | 'warned' | 'muted' | 'restored' | 'reported' | 'dismissed' | 'escalated';
	type ContentType = 'conversation' | 'comment' | 'profile' | 'event';

	type ModAction = {
		id: string;
		timestamp: string;
		moderator: string;
		moderatorInitial: string;
		moderatorRole: 'steward' | 'moderator' | 'system';
		moderatorColor: string;
		action: ActionType;
		contentType: ContentType;
		contentPreview: string;
		author: string;
		reason: string;
		visible: boolean; // whether it's publicly logged
	};

	type Report = {
		id: string;
		submitted: string;
		reporter: string;
		contentType: ContentType;
		contentPreview: string;
		author: string;
		reason: string;
		status: 'pending' | 'in-review' | 'resolved';
	};

	const modLog: ModAction[] = [
		{
			id: 'ml-01',
			timestamp: '2026-06-09T14:22:00',
			moderator: 'Sarell',
			moderatorInitial: 'S',
			moderatorRole: 'steward',
			moderatorColor: '#a06040',
			action: 'warned',
			contentType: 'comment',
			contentPreview: '"You clearly haven\'t thought this through at all..."',
			author: 'anonymous_42',
			reason: 'Dismissive tone violates community standards §2.1. First warning issued.',
			visible: true,
		},
		{
			id: 'ml-02',
			timestamp: '2026-06-09T11:04:00',
			moderator: 'LocalMod',
			moderatorInitial: 'AI',
			moderatorRole: 'system',
			moderatorColor: '#607080',
			action: 'reported',
			contentType: 'comment',
			contentPreview: '"[flagged: potential PII detected]"',
			author: 'new_member_88',
			reason: 'Automated: personal contact details detected in public comment. Queued for human review.',
			visible: true,
		},
		{
			id: 'ml-03',
			timestamp: '2026-06-08T18:51:00',
			moderator: 'Özge',
			moderatorInitial: 'Ö',
			moderatorRole: 'steward',
			moderatorColor: '#7a6ea8',
			action: 'dismissed',
			contentType: 'conversation',
			contentPreview: '"Does open source actually change anything?"',
			author: 'leosv',
			reason: 'Report reviewed. Content is within community standards. Report dismissed.',
			visible: true,
		},
		{
			id: 'ml-04',
			timestamp: '2026-06-08T16:30:00',
			moderator: 'LocalMod',
			moderatorInitial: 'AI',
			moderatorRole: 'system',
			moderatorColor: '#607080',
			action: 'removed',
			contentType: 'comment',
			contentPreview: '"[removed: spam detected — repeated external link]"',
			author: 'unknown_user',
			reason: 'Automated: spam pattern matched. Content removed. No human review needed.',
			visible: true,
		},
		{
			id: 'ml-05',
			timestamp: '2026-06-07T20:14:00',
			moderator: 'Nils',
			moderatorInitial: 'N',
			moderatorRole: 'moderator',
			moderatorColor: '#5a8070',
			action: 'muted',
			contentType: 'profile',
			contentPreview: 'Profile: @disruptive_2',
			author: 'disruptive_2',
			reason: '72-hour mute. Third warning for repeated off-topic posting across multiple conversations.',
			visible: true,
		},
		{
			id: 'ml-06',
			timestamp: '2026-06-07T09:02:00',
			moderator: 'Sarell',
			moderatorInitial: 'S',
			moderatorRole: 'steward',
			moderatorColor: '#a06040',
			action: 'restored',
			contentType: 'comment',
			contentPreview: '"I\'ve been thinking about this for months and I think..."',
			author: 'fatimab',
			reason: 'False positive. Comment restored after appeal. Automated filter updated.',
			visible: true,
		},
		{
			id: 'ml-07',
			timestamp: '2026-06-06T15:44:00',
			moderator: 'Özge',
			moderatorInitial: 'Ö',
			moderatorRole: 'steward',
			moderatorColor: '#7a6ea8',
			action: 'escalated',
			contentType: 'event',
			contentPreview: '"Open meeting — Kreuzberg"',
			author: 'temp_organiser',
			reason: 'Event created by unverified organiser. Escalated to steward review before publication.',
			visible: false,
		},
	];

	const reports: Report[] = [
		{
			id: 'rp-01',
			submitted: '2026-06-09T13:10:00',
			reporter: 'member_44',
			contentType: 'comment',
			contentPreview: '"People like you are the problem with this city..."',
			author: 'anon_visitor',
			reason: 'Personal attack / harassment',
			status: 'in-review',
		},
		{
			id: 'rp-02',
			submitted: '2026-06-09T08:55:00',
			reporter: 'leosv',
			contentType: 'conversation',
			contentPreview: '"Join my online course on..."',
			author: 'new_acct_3',
			reason: 'Spam / commercial promotion',
			status: 'pending',
		},
		{
			id: 'rp-03',
			submitted: '2026-06-08T22:30:00',
			reporter: 'mirak',
			contentType: 'profile',
			contentPreview: 'Profile: @suspicious_99',
			author: 'suspicious_99',
			reason: 'Fake account / impersonation',
			status: 'pending',
		},
	];

	const standards = [
		{
			ref: '§1',
			title: 'Be here with intention',
			body: 'Conversations are an offer of time and presence. Come with genuine curiosity. Surface-level engagement or content marketing is not what this space is for.',
		},
		{
			ref: '§2',
			title: 'Disagree, but don\'t dismiss',
			body: 'You can challenge ideas, hold strong positions, and argue your case. You cannot dismiss, belittle, or make someone feel stupid for their perspective. The line is tone.',
		},
		{
			ref: '§3',
			title: 'Protect privacy',
			body: 'Do not share another person\'s personal details, location, or identifying information. What is said in a conversation stays there — unless both parties agree otherwise.',
		},
		{
			ref: '§4',
			title: 'Moderation is transparent',
			body: 'Every moderation action is logged and visible to members. If an action is taken against your content, you will be notified and can appeal. Moderators are accountable.',
		},
		{
			ref: '§5',
			title: 'No commercial use',
			body: 'This is not an advertising channel. No recruitment, promotion, or affiliate links. Building something and want to share? Ask a steward first.',
		},
	];

	type TabId = 'log' | 'reports' | 'standards';
	let activeTab = $state<TabId>('log');

	const actionLabels: Record<ActionType, string> = {
		removed: 'Removed',
		warned: 'Warning issued',
		muted: 'Muted',
		restored: 'Restored',
		reported: 'Auto-flagged',
		dismissed: 'Report dismissed',
		escalated: 'Escalated',
	};

	const actionColors: Record<ActionType, string> = {
		removed: '#c04040',
		warned: '#b07020',
		muted: '#8060a0',
		restored: '#3d7a5a',
		reported: '#607080',
		dismissed: '#5a7a9a',
		escalated: '#a07040',
	};

	const contentTypeLabels: Record<ContentType, string> = {
		conversation: 'conversation',
		comment: 'comment',
		profile: 'profile',
		event: 'event',
	};

	function formatTime(iso: string) {
		const d = new Date(iso);
		const now = new Date('2026-06-09T19:00:00');
		const diff = now.getTime() - d.getTime();
		const hours = Math.floor(diff / 3600000);
		if (hours < 1) return 'just now';
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	const pending = reports.filter(r => r.status === 'pending').length;
	const inReview = reports.filter(r => r.status === 'in-review').length;
</script>

<svelte:head>
	<title>Trust & Safety — dyad.</title>
</svelte:head>

<div class="page">

	<!-- Header -->
	<div class="page-header">
		<div class="page-header-left">
			<h1 class="page-title">Trust & Safety</h1>
			<p class="page-sub">Moderation is transparent. Every action is logged and visible to members.</p>
		</div>
		<div class="stats-row">
			<div class="stat-card">
				<span class="stat-num">{pending + inReview}</span>
				<span class="stat-label">open reports</span>
			</div>
			<div class="stat-card">
				<span class="stat-num">12</span>
				<span class="stat-label">actions this week</span>
			</div>
			<div class="stat-card">
				<span class="stat-num">98%</span>
				<span class="stat-label">auto-resolved</span>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="tabs">
		<button class="tab" class:tab--active={activeTab === 'log'} onclick={() => activeTab = 'log'}>
			Moderation log
		</button>
		<button class="tab" class:tab--active={activeTab === 'reports'} onclick={() => activeTab = 'reports'}>
			Reports
			{#if pending + inReview > 0}
				<span class="tab-badge">{pending + inReview}</span>
			{/if}
		</button>
		<button class="tab" class:tab--active={activeTab === 'standards'} onclick={() => activeTab = 'standards'}>
			Community standards
		</button>
	</div>

	<!-- ── MODERATION LOG ── -->
	{#if activeTab === 'log'}
		<div class="section">
			<div class="section-note">
				Actions marked <span class="pub-dot"></span> are publicly logged to all members. Actions marked <span class="priv-dot"></span> are visible to moderators only.
			</div>
			<div class="log-list">
				{#each modLog as entry}
					<div class="log-entry">
						<div class="log-left">
							<div class="log-avatar" style="background: {entry.moderatorColor}22; color: {entry.moderatorColor};">
								{entry.moderatorInitial}
							</div>
							<div class="log-line"></div>
						</div>
						<div class="log-body">
							<div class="log-meta">
								<span class="log-actor">
									{entry.moderator}
									<span class="log-role log-role--{entry.moderatorRole}">{entry.moderatorRole}</span>
								</span>
								<span class="log-time">{formatTime(entry.timestamp)}</span>
								<span class="visibility-dot" title={entry.visible ? 'Publicly logged' : 'Moderators only'}>
									{#if entry.visible}
										<span class="pub-dot"></span>
									{:else}
										<span class="priv-dot"></span>
									{/if}
								</span>
							</div>
							<div class="log-action-row">
								<span class="action-pill" style="color: {actionColors[entry.action]}; background: {actionColors[entry.action]}18; border-color: {actionColors[entry.action]}30;">
									{actionLabels[entry.action]}
								</span>
								<span class="log-content-type">{contentTypeLabels[entry.contentType]}</span>
							</div>
							<blockquote class="log-preview">{entry.contentPreview}</blockquote>
							<p class="log-reason">{entry.reason}</p>
							{#if entry.moderatorRole !== 'system'}
								<div class="log-appeal">
									<button class="appeal-link">Appeal this decision</button>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

	<!-- ── REPORTS ── -->
	{:else if activeTab === 'reports'}
		<div class="section">
			<div class="reports-list">
				{#each reports as report}
					<div class="report-card">
						<div class="report-header">
							<span class="report-status report-status--{report.status}">
								{report.status === 'in-review' ? 'In review' : report.status === 'pending' ? 'Pending' : 'Resolved'}
							</span>
							<span class="report-time">{formatTime(report.submitted)}</span>
							<span class="report-type">{contentTypeLabels[report.contentType]}</span>
						</div>
						<blockquote class="report-preview">{report.contentPreview}</blockquote>
						<div class="report-meta-row">
							<span class="report-meta-item">
								<span class="meta-label">Author</span>
								@{report.author}
							</span>
							<span class="report-meta-item">
								<span class="meta-label">Reason</span>
								{report.reason}
							</span>
						</div>
						<div class="report-actions">
							<button class="report-btn report-btn--dismiss">Dismiss</button>
							<button class="report-btn report-btn--warn">Warn author</button>
							<button class="report-btn report-btn--remove">Remove content</button>
						</div>
					</div>
				{/each}
				{#if reports.length === 0}
					<p class="empty">No open reports.</p>
				{/if}
			</div>
		</div>

	<!-- ── COMMUNITY STANDARDS ── -->
	{:else if activeTab === 'standards'}
		<div class="section">
			<div class="standards-intro">
				<p>These are the norms that make dyad possible. They are enforced by stewards and moderators, supported by automated detection, and applied consistently across all communities on the platform.</p>
				<p>Last updated: June 2026 · <a href="/assembly" class="inline-link">Discuss in Assembly →</a></p>
			</div>
			<div class="standards-list">
				{#each standards as s}
					<div class="standard-item">
						<span class="standard-ref">{s.ref}</span>
						<div class="standard-body">
							<h3 class="standard-title">{s.title}</h3>
							<p class="standard-text">{s.body}</p>
						</div>
					</div>
				{/each}
			</div>
			<div class="moderation-stack">
				<div class="stack-label">Moderation stack</div>
				<div class="stack-row">
					<div class="stack-card">
						<span class="stack-layer">Layer 1 · Automated</span>
						<strong class="stack-name">LocalMod</strong>
						<p class="stack-desc">Self-hosted. Toxicity, NSFW, PII, spam — detected before content goes live. No data leaves our servers.</p>
						<span class="stack-tag stack-tag--fork">MIT · forked</span>
					</div>
					<div class="stack-card">
						<span class="stack-layer">Layer 2 · Community</span>
						<strong class="stack-name">SAFEskies pattern</strong>
						<p class="stack-desc">Role-based moderation (steward / moderator), transparent action log, community-controlled decisions. Adapted — not the code, the design pattern.</p>
						<span class="stack-tag stack-tag--borrowed">pattern borrowed</span>
					</div>
					<div class="stack-card">
						<span class="stack-layer">Layer 3 · Governance</span>
						<strong class="stack-name">Assembly</strong>
						<p class="stack-desc">Moderation policy changes go through the community assembly. No steward can unilaterally change the rules.</p>
						<span class="stack-tag stack-tag--internal">internal</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		color: var(--text-primary);
	}

	/* ── Header ── */
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		padding: 28px 32px 20px;
		border-bottom: 1px solid var(--border-link);
	}

	.page-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.5rem;
		font-weight: 300;
		margin: 0 0 4px;
	}

	.page-sub {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0;
	}

	.stats-row {
		display: flex;
		gap: 1px;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		overflow: hidden;
		flex-shrink: 0;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px 20px;
		background: var(--bg-control);
		gap: 2px;
	}

	.stat-num {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.3rem;
		font-weight: 300;
	}

	.stat-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		white-space: nowrap;
	}

	/* ── Tabs ── */
	.tabs {
		display: flex;
		border-bottom: 1px solid var(--border-link);
		padding: 0 32px;
		gap: 0;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 11px 0;
		margin-right: 24px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		transition: color 0.12s;
		margin-bottom: -1px;
	}
	.tab:hover { color: var(--text-primary); }
	.tab--active { color: var(--text-primary); border-bottom-color: var(--text-primary); }

	.tab-badge {
		background: var(--color-danger, #e05858);
		color: #fff;
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 8px;
	}

	/* ── Section wrapper ── */
	.section {
		padding: 24px 32px 64px;
	}

	.section-note {
		font-size: 12px;
		color: var(--text-muted);
		margin-bottom: 20px;
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	/* visibility dots */
	.pub-dot, .priv-dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		vertical-align: middle;
	}
	.pub-dot { background: var(--color-success, #3d9e5a); }
	.priv-dot { background: var(--text-muted); }

	/* ── Log ── */
	.log-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.log-entry {
		display: grid;
		grid-template-columns: 44px 1fr;
		gap: 0 14px;
		padding-bottom: 28px;
	}

	.log-left {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.log-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 11px;
		flex-shrink: 0;
	}

	.log-line {
		flex: 1;
		width: 1px;
		background: var(--border-link);
		margin-top: 6px;
	}

	.log-entry:last-child .log-line { display: none; }

	.log-body {
		padding-top: 4px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-bottom: 8px;
	}

	.log-meta {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.log-actor {
		font-size: 13px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.log-role {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		padding: 2px 6px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-link);
		color: var(--text-muted);
	}
	.log-role--steward { color: #7a6ea8; border-color: #7a6ea828; background: #7a6ea808; }
	.log-role--system  { color: var(--text-muted); }

	.log-time {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	.visibility-dot { display: flex; align-items: center; }

	.log-action-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.action-pill {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.08em;
		padding: 2px 9px;
		border-radius: var(--radius-pill);
		border: 1px solid;
	}

	.log-content-type {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		letter-spacing: 0.06em;
	}

	.log-preview {
		font-size: 13px;
		color: var(--text-muted);
		border-left: 2px solid var(--border-link);
		padding-left: 10px;
		margin: 0;
		font-style: italic;
		line-height: 1.5;
	}

	.log-reason {
		font-size: 13px;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.5;
	}

	.log-appeal { margin-top: 2px; }

	.appeal-link {
		background: none;
		border: none;
		padding: 0;
		font-size: 12px;
		color: var(--text-muted);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.appeal-link:hover { color: var(--text-primary); }

	/* ── Reports ── */
	.reports-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.report-card {
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.report-header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.report-status {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: var(--radius-pill);
		border: 1px solid;
	}
	.report-status--pending   { color: #b07020; border-color: #b0702030; background: #b0702010; }
	.report-status--in-review { color: #5a7aa0; border-color: #5a7aa030; background: #5a7aa010; }
	.report-status--resolved  { color: var(--text-muted); border-color: var(--border-link); }

	.report-time {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
	}

	.report-type {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--text-muted);
		margin-left: auto;
	}

	.report-preview {
		font-size: 13px;
		color: var(--text-muted);
		border-left: 2px solid var(--border-link);
		padding-left: 10px;
		margin: 0;
		font-style: italic;
	}

	.report-meta-row {
		display: flex;
		gap: 20px;
	}

	.report-meta-item {
		font-size: 13px;
		color: var(--text-primary);
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.meta-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.report-actions {
		display: flex;
		gap: 8px;
		padding-top: 4px;
	}

	.report-btn {
		padding: 6px 14px;
		border-radius: var(--radius-input);
		border: 1px solid var(--border-link);
		background: none;
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		transition: border-color 0.12s, color 0.12s;
	}
	.report-btn:hover { color: var(--text-primary); border-color: var(--text-muted); }
	.report-btn--remove {
		color: #c04040;
		border-color: #c0404030;
	}
	.report-btn--remove:hover { border-color: #c04040; }
	.report-btn--warn {
		color: #b07020;
		border-color: #b0702030;
	}
	.report-btn--warn:hover { border-color: #b07020; }

	.empty {
		font-size: 13px;
		color: var(--text-muted);
		padding: 24px 0;
	}

	/* ── Community standards ── */
	.standards-intro {
		margin-bottom: 28px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.standards-intro p {
		font-size: 14px;
		color: var(--text-muted);
		line-height: 1.65;
		margin: 0;
	}

	.inline-link {
		color: var(--text-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.standards-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		border-top: 1px solid var(--border-link);
		margin-bottom: 40px;
	}

	.standard-item {
		display: grid;
		grid-template-columns: 40px 1fr;
		gap: 0 16px;
		padding: 20px 0;
		border-bottom: 1px solid var(--border-link);
		align-items: start;
	}

	.standard-ref {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		padding-top: 3px;
	}

	.standard-title {
		font-size: 14px;
		font-weight: 500;
		margin: 0 0 6px;
	}

	.standard-text {
		font-size: 13px;
		color: var(--text-muted);
		line-height: 1.6;
		margin: 0;
	}

	/* ── Moderation stack ── */
	.moderation-stack {
		margin-top: 8px;
	}

	.stack-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 14px;
	}

	.stack-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		overflow: hidden;
	}

	.stack-card {
		background: var(--bg-control);
		padding: 20px 22px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.stack-layer {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.stack-name {
		font-size: 14px;
		font-weight: 500;
	}

	.stack-desc {
		font-size: 12px;
		color: var(--text-muted);
		line-height: 1.55;
		flex: 1;
	}

	.stack-tag {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 3px 8px;
		border: 1px solid;
		border-radius: 2px;
		align-self: flex-start;
		margin-top: 4px;
	}
	.stack-tag--fork     { color: #2d6a4f; border-color: #2d6a4f; background: rgba(45,106,79,.06); }
	.stack-tag--borrowed { color: #7a5c00; border-color: #7a5c00; background: rgba(122,92,0,.06); }
	.stack-tag--internal { color: var(--text-muted); border-color: var(--border-link); }

	@media (max-width: 720px) {
		.page-header { flex-direction: column; padding: 20px 16px; }
		.section { padding: 20px 16px 48px; }
		.tabs { padding: 0 16px; }
		.stack-row { grid-template-columns: 1fr; }
	}
</style>
