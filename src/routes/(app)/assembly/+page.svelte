<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'proposals' | 'forum'>('proposals');
	let votes = $state<Record<string, 'agree' | 'disagree' | 'pass' | null>>({});

	function vote(proposalId: string, choice: 'agree' | 'disagree' | 'pass') {
		votes = { ...votes, [proposalId]: votes[proposalId] === choice ? null : choice };
	}

	function agreePercent(p: { agree: number; total: number }) {
		return Math.round((p.agree / p.total) * 100);
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	const CATEGORIES = ['All', 'Governance', 'Product direction', 'Values', 'Community', 'Meta'];
	let activeCategory = $state('All');

	const activeProposals = $derived(data.proposals.filter(p => p.status === 'active'));
	const resolvedProposals = $derived(data.proposals.filter(p => p.status === 'resolved'));
</script>

<svelte:head>
	<title>Assembly — dyad.</title>
</svelte:head>

<div class="assembly">

	<!-- ── Header ── -->
	<header class="assembly-header">
		<div class="header-left">
			<h1 class="assembly-title">Assembly</h1>
			<p class="assembly-sub">Where dyad members make decisions together. Propose, deliberate, vote.</p>
		</div>
		<div class="header-right">
			<div class="tab-bar">
				<button
					class="tab-btn"
					class:tab-btn--active={activeTab === 'proposals'}
					onclick={() => activeTab = 'proposals'}
				>
					Proposals
					<span class="tab-count">{activeProposals.length}</span>
				</button>
				<button
					class="tab-btn"
					class:tab-btn--active={activeTab === 'forum'}
					onclick={() => activeTab = 'forum'}
				>
					Forum
					<span class="tab-count">{data.threads.length}</span>
				</button>
			</div>
		</div>
	</header>

	{#if activeTab === 'proposals'}
	<!-- ── PROPOSALS (Polis-inspired) ── -->
	<div class="proposals-pane">
		<section class="proposals-section">
			<div class="proposals-section-header">
				<span class="section-kicker">Active · {activeProposals.length} open</span>
				<button class="btn-propose">+ Propose</button>
			</div>

			<div class="proposals-list">
				{#each activeProposals as proposal}
					<div class="proposal-card">
						<div class="proposal-top">
							<div class="proposal-tags">
								{#each proposal.tags as tag}
									<span class="proposal-tag">{tag}</span>
								{/each}
							</div>
							<span class="proposal-meta">by @{proposal.author} · {formatDate(proposal.created_at)}</span>
						</div>

						<p class="proposal-statement">"{proposal.statement}"</p>

						<!-- Consensus bar -->
						<div class="consensus-bar">
							<div class="consensus-segment consensus-agree" style="width: {agreePercent(proposal)}%"></div>
							<div class="consensus-segment consensus-pass" style="width: {Math.round((proposal.pass / proposal.total) * 100)}%"></div>
							<div class="consensus-segment consensus-disagree" style="width: {Math.round((proposal.disagree / proposal.total) * 100)}%"></div>
						</div>

						<div class="consensus-labels">
							<span class="consensus-label consensus-label--agree">{agreePercent(proposal)}% agree</span>
							<span class="consensus-label">{proposal.total} votes</span>
							<span class="consensus-label consensus-label--disagree">{Math.round((proposal.disagree / proposal.total) * 100)}% disagree</span>
						</div>

						<!-- Vote buttons -->
						<div class="vote-row">
							<button
								class="vote-btn vote-btn--agree"
								class:vote-btn--selected={votes[proposal.id] === 'agree'}
								onclick={() => vote(proposal.id, 'agree')}
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
								Agree
							</button>
							<button
								class="vote-btn vote-btn--pass"
								class:vote-btn--selected={votes[proposal.id] === 'pass'}
								onclick={() => vote(proposal.id, 'pass')}
							>
								Pass
							</button>
							<button
								class="vote-btn vote-btn--disagree"
								class:vote-btn--selected={votes[proposal.id] === 'disagree'}
								onclick={() => vote(proposal.id, 'disagree')}
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
								Disagree
							</button>
						</div>
					</div>
				{/each}
			</div>
		</section>

		{#if resolvedProposals.length > 0}
		<section class="proposals-section">
			<div class="proposals-section-header">
				<span class="section-kicker">Resolved · {resolvedProposals.length}</span>
			</div>
			<div class="proposals-list">
				{#each resolvedProposals as proposal}
					<div class="proposal-card proposal-card--resolved">
						<div class="proposal-top">
							<div class="proposal-tags">
								{#each proposal.tags as tag}
									<span class="proposal-tag">{tag}</span>
								{/each}
							</div>
							<span class="proposal-meta resolved-badge">resolved</span>
						</div>
						<p class="proposal-statement">"{proposal.statement}"</p>
						<div class="consensus-bar">
							<div class="consensus-segment consensus-agree" style="width: {agreePercent(proposal)}%"></div>
							<div class="consensus-segment consensus-pass" style="width: {Math.round((proposal.pass / proposal.total) * 100)}%"></div>
							<div class="consensus-segment consensus-disagree" style="width: {Math.round((proposal.disagree / proposal.total) * 100)}%"></div>
						</div>
						<div class="consensus-labels">
							<span class="consensus-label consensus-label--agree">{agreePercent(proposal)}% agree</span>
							<span class="consensus-label">{proposal.total} votes</span>
						</div>
					</div>
				{/each}
			</div>
		</section>
		{/if}
	</div>

	{:else}
	<!-- ── FORUM (Discourse-inspired) ── -->
	<div class="forum-pane">
		<div class="forum-categories">
			{#each CATEGORIES as cat}
				<button
					class="category-btn"
					class:category-btn--active={activeCategory === cat}
					onclick={() => activeCategory = cat}
				>{cat}</button>
			{/each}
		</div>

		<div class="forum-list">
			<div class="forum-list-header">
				<span>Topic</span>
				<span>Replies</span>
				<span>Activity</span>
			</div>

			{#each data.threads.filter(t => activeCategory === 'All' || t.category === activeCategory) as thread}
				<div class="forum-row" class:forum-row--pinned={thread.pinned}>
					<div class="forum-row-main">
						{#if thread.pinned}
							<span class="pin-icon" aria-label="Pinned">
								<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M10 2l4 4-7 7H3v-4l7-7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
							</span>
						{/if}
						<div class="forum-row-text">
							<a href="#" class="forum-thread-title">{thread.title}</a>
							<div class="forum-thread-meta">
								<span class="forum-category-tag">{thread.category}</span>
								<span>@{thread.author}</span>
							</div>
						</div>
					</div>
					<span class="forum-replies">{thread.replies}</span>
					<span class="forum-date">{formatDate(thread.last_activity)}</span>
				</div>
			{/each}
		</div>

		<div class="forum-actions">
			<button class="btn-propose">+ New thread</button>
		</div>
	</div>
	{/if}

</div>

<style>
	.assembly {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ── Header ── */
	.assembly-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 40px 48px 32px;
		border-bottom: 1px solid var(--border-link);
		gap: 24px;
	}

	.assembly-title {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 2rem;
		font-weight: 300;
		margin: 0 0 8px;
		color: var(--text-primary);
	}

	.assembly-sub {
		font-size: 13px;
		color: var(--text-muted);
		margin: 0;
		max-width: 420px;
		line-height: 1.5;
	}

	.header-right { flex-shrink: 0; padding-top: 8px; }

	/* ── Tabs ── */
	.tab-bar {
		display: flex;
		gap: 2px;
		background: var(--bg-control);
		border-radius: var(--radius-input);
		padding: 3px;
	}

	.tab-btn {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 7px 16px;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: calc(var(--radius-input) - 1px);
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		transition: background 0.15s, color 0.15s;
	}

	.tab-btn--active {
		background: var(--bg-canvas);
		color: var(--text-primary);
		box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	}

	.tab-count {
		font-size: 10px;
		background: var(--bg-control);
		border-radius: var(--radius-pill);
		padding: 1px 6px;
		color: var(--text-muted);
	}

	.tab-btn--active .tab-count {
		background: var(--bg-control);
	}

	/* ── Proposals pane ── */
	.proposals-pane {
		flex: 1;
		padding: 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 48px;
	}

	.proposals-section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.section-kicker {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.btn-propose {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-input);
		padding: 7px 16px;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-propose:hover { opacity: 0.8; }

	.proposals-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
		gap: 16px;
	}

	.proposal-card {
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		padding: 24px;
		background: var(--bg-canvas);
		display: flex;
		flex-direction: column;
		gap: 16px;
		transition: border-color 0.15s;
	}
	.proposal-card:hover { border-color: var(--line-color); }
	.proposal-card--resolved { opacity: 0.65; }

	.proposal-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.proposal-tags { display: flex; gap: 6px; flex-wrap: wrap; }

	.proposal-tag {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-pill);
		padding: 2px 8px;
	}

	.proposal-meta {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.resolved-badge {
		background: var(--bg-control);
		border-radius: var(--radius-pill);
		padding: 2px 8px;
	}

	.proposal-statement {
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 1.05rem;
		line-height: 1.45;
		color: var(--text-primary);
		margin: 0;
		font-style: italic;
	}

	/* Consensus bar */
	.consensus-bar {
		height: 6px;
		border-radius: 3px;
		background: var(--bg-control);
		display: flex;
		overflow: hidden;
		gap: 1px;
	}

	.consensus-segment { height: 100%; transition: width 0.4s ease; }
	.consensus-agree { background: var(--color-success); }
	.consensus-disagree { background: var(--color-danger); }
	.consensus-pass { background: var(--line-color); }

	.consensus-labels {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
	}

	.consensus-label { color: var(--text-muted); }
	.consensus-label--agree { color: var(--color-success); }
	.consensus-label--disagree { color: var(--color-danger); }

	/* Vote buttons */
	.vote-row {
		display: flex;
		gap: 8px;
	}

	.vote-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px;
		border-radius: var(--radius-input);
		border: 1px solid var(--border-link);
		background: var(--bg-canvas);
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		transition: background 0.12s, color 0.12s, border-color 0.12s;
	}

	.vote-btn:hover { background: var(--bg-control); color: var(--text-primary); }

	.vote-btn--agree.vote-btn--selected {
		background: rgba(61, 158, 90, 0.1);
		border-color: var(--color-success);
		color: var(--color-success);
	}
	.vote-btn--disagree.vote-btn--selected {
		background: rgba(204, 0, 0, 0.08);
		border-color: var(--color-danger);
		color: var(--color-danger);
	}
	.vote-btn--pass.vote-btn--selected {
		background: var(--bg-control);
		border-color: var(--line-color);
		color: var(--text-primary);
	}

	/* ── Forum pane ── */
	.forum-pane {
		flex: 1;
		padding: 32px 48px 48px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.forum-categories {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.category-btn {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 5px 14px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-link);
		background: var(--bg-canvas);
		cursor: pointer;
		color: var(--text-muted);
		transition: background 0.12s, color 0.12s;
	}
	.category-btn:hover { background: var(--bg-control); color: var(--text-primary); }
	.category-btn--active {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-color: var(--text-primary);
	}

	.forum-list {
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		overflow: hidden;
	}

	.forum-list-header {
		display: grid;
		grid-template-columns: 1fr 80px 100px;
		gap: 16px;
		padding: 10px 20px;
		background: var(--bg-control);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-link);
	}

	.forum-row {
		display: grid;
		grid-template-columns: 1fr 80px 100px;
		gap: 16px;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-link);
		align-items: center;
		transition: background 0.12s;
	}
	.forum-row:last-child { border-bottom: none; }
	.forum-row:hover { background: var(--bg-control); }
	.forum-row--pinned { background: rgba(0,0,0,0.015); }
	:global([data-theme='dark']) .forum-row--pinned { background: rgba(255,255,255,0.02); }

	.forum-row-main {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.pin-icon {
		color: var(--text-muted);
		flex-shrink: 0;
		margin-top: 3px;
		display: flex;
	}

	.forum-row-text { display: flex; flex-direction: column; gap: 4px; }

	.forum-thread-title {
		font-size: 14px;
		color: var(--text-primary);
		text-decoration: none;
		line-height: 1.35;
	}
	.forum-thread-title:hover { text-decoration: underline; }

	.forum-thread-meta {
		display: flex;
		gap: 10px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.forum-category-tag {
		background: var(--bg-control);
		border-radius: var(--radius-pill);
		padding: 1px 7px;
	}

	.forum-replies, .forum-date {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
	}

	.forum-actions { display: flex; justify-content: flex-end; }

	/* ── Responsive ── */
	@media (max-width: 768px) {
		.assembly-header { flex-direction: column; padding: 24px; }
		.proposals-pane { padding: 24px; }
		.proposals-list { grid-template-columns: 1fr; }
		.forum-pane { padding: 24px; }
		.forum-list-header, .forum-row { grid-template-columns: 1fr 60px; }
		.forum-date { display: none; }
	}
</style>
