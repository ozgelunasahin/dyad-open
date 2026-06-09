<script lang="ts">
	type Message = {
		id: string;
		author: string;
		authorInitial: string;
		authorColor: string;
		time: string;
		text: string;
		isOwn?: boolean;
		replyTo?: string;
		reactions?: { emoji: string; count: number }[];
	};

	type Channel = {
		id: string;
		name: string;
		description: string;
		unread?: number;
		community: string;
	};

	const channels: Channel[] = [
		{ id: 'general', name: 'general', description: 'Community-wide updates and introductions', community: 'dyad Berlin', unread: 0 },
		{ id: 'governance', name: 'governance', description: 'Policy, decisions, and assembly prep', community: 'dyad Berlin', unread: 3 },
		{ id: 'field-notes', name: 'field-notes', description: 'Links and observations worth sharing', community: 'dyad Berlin', unread: 1 },
		{ id: 'ops', name: 'ops', description: 'Venue, logistics, tech infrastructure', community: 'dyad Berlin', unread: 0 },
		{ id: 'intros', name: 'introductions', description: 'New member intros', community: 'dyad Berlin', unread: 2 },
		// cross-community
		{ id: 'ps-general', name: 'general', description: 'PublicSpaces network updates', community: 'PublicSpaces' },
		{ id: 'rebuild-ops', name: 'ops', description: 'Rebuild coalition coordination', community: 'Rebuild' },
	];

	const messagesByChannel: Record<string, Message[]> = {
		general: [
			{
				id: 'm1',
				author: 'Sarell',
				authorInitial: 'S',
				authorColor: '#a06040',
				time: 'Mon 9 Jun, 10:14',
				text: 'Reminder: governance assembly is next Sunday at Oyoun. Please read the proposals doc before you come — link in #governance.',
				reactions: [{ emoji: '👍', count: 7 }],
			},
			{
				id: 'm2',
				author: 'Lena',
				authorInitial: 'L',
				authorColor: '#6a88a0',
				time: 'Mon 9 Jun, 10:31',
				text: 'Will there be a Jitsi stream for people who can\'t make it in person?',
			},
			{
				id: 'm3',
				author: 'Sarell',
				authorInitial: 'S',
				authorColor: '#a06040',
				time: 'Mon 9 Jun, 10:35',
				text: 'Yes, same Jitsi link as last time. I\'ll drop it in #ops closer to the date.',
				replyTo: 'Lena',
				reactions: [{ emoji: '🙏', count: 3 }],
			},
			{
				id: 'm4',
				author: 'Nils',
				authorInitial: 'N',
				authorColor: '#5a8070',
				time: 'Mon 9 Jun, 11:02',
				text: 'Quick update: we now have 47 members across all cohorts. Cohort 3 opens in July.',
			},
			{
				id: 'm5',
				author: 'Özge',
				authorInitial: 'Ö',
				authorColor: '#7a6ea8',
				time: 'Mon 9 Jun, 18:44',
				text: 'Welcome to everyone who joined this week — @fatimab @armint @mirak. There\'s an onboarding call tonight at 19:00 on Jitsi if you want to get oriented.',
				isOwn: true,
				reactions: [{ emoji: '👋', count: 5 }, { emoji: '❤️', count: 2 }],
			},
			{
				id: 'm6',
				author: 'Fatima',
				authorInitial: 'F',
				authorColor: '#a05860',
				time: 'Mon 9 Jun, 18:51',
				text: 'Thanks Özge! Will be there.',
				replyTo: 'Özge',
			},
			{
				id: 'm7',
				author: 'Mira',
				authorInitial: 'M',
				authorColor: '#6b8fa8',
				time: 'Mon 9 Jun, 19:12',
				text: 'Also: zine collective planning is the 22nd at Riso-Studio. We need 3 more people — shout if interested. Theme is infrastructure (broadly interpreted).',
				reactions: [{ emoji: '🎨', count: 4 }],
			},
		],
		governance: [
			{
				id: 'g1',
				author: 'Pascal',
				authorInitial: 'P',
				authorColor: '#7a6060',
				time: 'Sun 8 Jun, 20:04',
				text: 'Proposal v2 is up: docs.dyad.berlin/assembly-june-2026. The main changes are on §3 (moderation escalation) and §7 (financial transparency). Please comment by Thursday.',
				reactions: [{ emoji: '📄', count: 6 }],
			},
			{
				id: 'g2',
				author: 'Yuki',
				authorInitial: 'Y',
				authorColor: '#889060',
				time: 'Sun 8 Jun, 21:17',
				text: 'I left a note on §3 — I think the escalation path is too slow for the cases it\'s trying to handle. Happy to talk it through before Thursday.',
			},
			{
				id: 'g3',
				author: 'Ada',
				authorInitial: 'A',
				authorColor: '#806880',
				time: 'Mon 9 Jun, 09:22',
				text: 'On §7: do we want to distinguish between operational costs (hosting, tools) and programme spend (events, guest fees)? I think the transparency obligation should be different for each.',
			},
			{
				id: 'g4',
				author: 'Özge',
				authorInitial: 'Ö',
				authorColor: '#7a6ea8',
				time: 'Mon 9 Jun, 10:01',
				text: 'Good point Ada. I\'ll flag it for the agenda. §7 is going to be a long conversation.',
				isOwn: true,
			},
			{
				id: 'g5',
				author: 'Leo',
				authorInitial: 'L',
				authorColor: '#5a7aa0',
				time: 'Mon 9 Jun, 14:30',
				text: 'Anyone else want to co-present a counterproposal on §3 at the assembly? I don\'t want to be the only voice — it\'s not a personal thing, it\'s a structural argument.',
				reactions: [{ emoji: '🤔', count: 3 }],
			},
			{
				id: 'g6',
				author: 'Yuki',
				authorInitial: 'Y',
				authorColor: '#889060',
				time: 'Mon 9 Jun, 14:55',
				text: 'Yes, I\'ll co-present. DM me before Sunday.',
				replyTo: 'Leo',
			},
		],
		'field-notes': [
			{
				id: 'fn1',
				author: 'Alex',
				authorInitial: 'A',
				authorColor: '#7a8060',
				time: 'Sat 7 Jun, 17:33',
				text: 'Interesting: Bluesky\'s moderation stack is now open source. The labeler spec has been out for a while but the actual tooling shipped last week. Worth reading if you\'re thinking about §3.',
				reactions: [{ emoji: '🔗', count: 5 }],
			},
			{
				id: 'fn2',
				author: 'Selin',
				authorInitial: 'S',
				authorColor: '#6878a0',
				time: 'Sat 7 Jun, 19:01',
				text: 'Related: the PublicSpaces conference was last week. Their framing of "infrastructural sovereignty" vs "platform sovereignty" is worth unpacking. Happy to share my notes.',
				reactions: [{ emoji: '🌍', count: 4 }, { emoji: '👍', count: 2 }],
			},
			{
				id: 'fn3',
				author: 'Bea',
				authorInitial: 'B',
				authorColor: '#8a7060',
				time: 'Sun 8 Jun, 10:15',
				text: '"The Ministry for the Future" arrived. Reading group is the 19th at Buchhandlung Oranienstraße. Bring a copy if you have one.',
			},
			{
				id: 'fn4',
				author: 'Pascal',
				authorInitial: 'P',
				authorColor: '#7a6060',
				time: 'Mon 9 Jun, 08:44',
				text: 'Genossenschaft Küche has a free evening slot on the 28th if anyone wants to do a community dinner. Capacity 35. Who\'s interested?',
				reactions: [{ emoji: '🍽️', count: 9 }, { emoji: '❤️', count: 3 }],
			},
		],
		intros: [
			{
				id: 'i1',
				author: 'Fatima',
				authorInitial: 'F',
				authorColor: '#a05860',
				time: 'Mon 9 Jun, 19:22',
				text: 'Hi everyone! I\'m Fatima, I work in platform policy and I\'ve been in Berlin for two years. I found dyad through Selin — I\'m here to have better conversations and get out of my algorithm bubble. Looking forward to it.',
				reactions: [{ emoji: '👋', count: 8 }],
			},
			{
				id: 'i2',
				author: 'Armin',
				authorInitial: 'A',
				authorColor: '#7060a0',
				time: 'Mon 9 Jun, 19:40',
				text: 'Hello, I\'m Armin. Photographer, Prenzlauer Berg. I came across the "What do you photograph when you\'re not trying to say anything?" conversation and it felt like someone had read my mind. Excited to be here.',
				reactions: [{ emoji: '📷', count: 5 }, { emoji: '❤️', count: 4 }],
			},
		],
	};

	let activeChannelId = $state('general');
	let inputText = $state('');

	const activeChannel = $derived(channels.find(c => c.id === activeChannelId)!);
	const messages = $derived(messagesByChannel[activeChannelId] ?? []);

	const communityGroups = $derived(() => {
		const map = new Map<string, Channel[]>();
		for (const ch of channels) {
			if (!map.has(ch.community)) map.set(ch.community, []);
			map.get(ch.community)!.push(ch);
		}
		return [...map.entries()];
	});
</script>

<svelte:head>
	<title>Chat — dyad.</title>
</svelte:head>

<div class="chat-shell">
	<!-- Left: channel list -->
	<aside class="channel-sidebar">
		{#each communityGroups() as [community, chs]}
			<div class="channel-group">
				<span class="channel-group-label">{community}</span>
				{#each chs as ch}
					<button
						class="channel-item"
						class:channel-item--active={ch.id === activeChannelId}
						onclick={() => activeChannelId = ch.id}
					>
						<span class="channel-hash">#</span>
						<span class="channel-name">{ch.name}</span>
						{#if ch.unread}
							<span class="unread-pill">{ch.unread}</span>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
	</aside>

	<!-- Main: messages -->
	<div class="chat-main">
		<!-- Channel header -->
		<div class="chat-header">
			<span class="chat-header-hash">#</span>
			<span class="chat-header-name">{activeChannel.name}</span>
			<span class="chat-header-desc">{activeChannel.description}</span>
			<div class="chat-header-actions">
				<button class="hdr-btn">
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
					Search
				</button>
				<button class="hdr-btn">
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 7v5M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					Members
				</button>
			</div>
		</div>

		<!-- Message list -->
		<div class="message-list">
			{#each messages as msg}
				<div class="message" class:message--own={msg.isOwn}>
					<div class="msg-avatar" style="background: {msg.authorColor}22; color: {msg.authorColor};">
						{msg.authorInitial}
					</div>
					<div class="msg-content">
						<div class="msg-meta">
							<span class="msg-author" class:msg-author--own={msg.isOwn}>{msg.author}</span>
							<span class="msg-time">{msg.time}</span>
						</div>
						{#if msg.replyTo}
							<div class="msg-reply">↩ replying to {msg.replyTo}</div>
						{/if}
						<p class="msg-text">{msg.text}</p>
						{#if msg.reactions?.length}
							<div class="msg-reactions">
								{#each msg.reactions as r}
									<span class="reaction">{r.emoji} {r.count}</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Input -->
		<div class="chat-input-wrap">
			<div class="chat-input-bar">
				<button class="input-attach" title="Attach">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 7.5l-6 6A4 4 0 012 8l7-7a2.5 2.5 0 013.5 3.5L6 11a1 1 0 01-1.5-1.5L10 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
				</button>
				<input
					class="chat-input"
					type="text"
					bind:value={inputText}
					placeholder="Message #{activeChannel.name}"
				/>
				<div class="input-right">
					<button class="input-emoji" title="Emoji">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><circle cx="5.5" cy="7" r="0.8" fill="currentColor"/><circle cx="10.5" cy="7" r="0.8" fill="currentColor"/><path d="M5.5 10.5c.7 1 4.3 1 5 0" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
					</button>
					<button class="input-send" disabled={!inputText.trim()}>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 8H2M14 8L9 3M14 8l-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Right: members panel -->
	<div class="members-panel">
		<div class="members-panel-header">Members</div>
		<div class="member-section-label">Online — 6</div>
		{#each [
			{ initial: 'Ö', name: 'Özge', color: '#7a6ea8', status: 'steward' },
			{ initial: 'S', name: 'Sarell', color: '#a06040', status: 'organiser' },
			{ initial: 'F', name: 'Fatima', color: '#a05860', status: 'member' },
			{ initial: 'A', name: 'Armin', color: '#7060a0', status: 'member' },
			{ initial: 'Y', name: 'Yuki', color: '#889060', status: 'member' },
			{ initial: 'N', name: 'Nils', color: '#5a8070', status: 'member' },
		] as m}
			<div class="member-row">
				<div class="member-av" style="background: {m.color}22; color: {m.color};">
					{m.initial}
					<span class="online-dot"></span>
				</div>
				<div class="member-info">
					<span class="member-name">{m.name}</span>
					{#if m.status !== 'member'}
						<span class="member-role">{m.status}</span>
					{/if}
				</div>
			</div>
		{/each}
		<div class="member-section-label" style="margin-top: 20px;">Offline — 41</div>
		{#each [
			{ initial: 'P', name: 'Pascal', color: '#7a6060' },
			{ initial: 'L', name: 'Lena', color: '#6a88a0' },
			{ initial: 'M', name: 'Mira', color: '#6b8fa8' },
			{ initial: 'B', name: 'Bea', color: '#8a7060' },
			{ initial: 'A', name: 'Ada', color: '#806880' },
			{ initial: 'L', name: 'Leo', color: '#5a7aa0' },
			{ initial: 'S', name: 'Selin', color: '#6878a0' },
		] as m}
			<div class="member-row member-row--offline">
				<div class="member-av" style="background: {m.color}18; color: {m.color}88;">
					{m.initial}
				</div>
				<span class="member-name" style="opacity: 0.45;">{m.name}</span>
			</div>
		{/each}
		<span class="member-more">+ 34 more</span>
	</div>
</div>

<style>
	.chat-shell {
		display: grid;
		grid-template-columns: 200px 1fr 180px;
		height: 100vh;
		overflow: hidden;
		background: var(--bg-canvas);
	}

	/* ── Channel sidebar ── */
	.channel-sidebar {
		border-right: 1px solid var(--border-link);
		overflow-y: auto;
		padding: 16px 0 24px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.channel-group {
		margin-bottom: 8px;
	}

	.channel-group-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		padding: 8px 14px 4px;
	}

	.channel-item {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 5px 14px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 13px;
		color: var(--text-muted);
		text-align: left;
		border-radius: 0;
		transition: background 0.1s, color 0.1s;
	}
	.channel-item:hover { background: var(--bg-control); color: var(--text-primary); }
	.channel-item--active { background: var(--bg-control); color: var(--text-primary); }

	.channel-hash {
		font-size: 14px;
		opacity: 0.5;
		flex-shrink: 0;
		width: 12px;
	}
	.channel-name { flex: 1; }

	.unread-pill {
		background: var(--color-danger, #e05858);
		color: #fff;
		font-family: var(--font-mono);
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 8px;
		flex-shrink: 0;
	}

	/* ── Main chat ── */
	.chat-main {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 20px;
		border-bottom: 1px solid var(--border-link);
		flex-shrink: 0;
	}
	.chat-header-hash { font-size: 16px; color: var(--text-muted); }
	.chat-header-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
	.chat-header-desc {
		font-size: 12px;
		color: var(--text-muted);
		border-left: 1px solid var(--border-link);
		padding-left: 10px;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.chat-header-actions { display: flex; gap: 6px; }
	.hdr-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		cursor: pointer;
		font-size: 11px;
		color: var(--text-muted);
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}
	.hdr-btn:hover { color: var(--text-primary); }

	.message-list {
		flex: 1;
		overflow-y: auto;
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.message {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}

	.msg-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 12px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.msg-content { flex: 1; min-width: 0; }

	.msg-meta {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 3px;
	}
	.msg-author { font-size: 13px; font-weight: 500; color: var(--text-primary); }
	.msg-author--own { color: #7a6ea8; }
	.msg-time { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); letter-spacing: 0.04em; }

	.msg-reply {
		font-size: 11px;
		color: var(--text-muted);
		padding: 2px 8px;
		border-left: 2px solid var(--border-link);
		margin-bottom: 4px;
	}

	.msg-text { font-size: 14px; line-height: 1.55; color: var(--text-primary); margin: 0; }

	.msg-reactions {
		display: flex;
		gap: 6px;
		margin-top: 6px;
		flex-wrap: wrap;
	}
	.reaction {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 12px;
		border: 1px solid var(--border-link);
		background: var(--bg-control);
		cursor: pointer;
		user-select: none;
	}
	.reaction:hover { border-color: var(--text-muted); }

	/* ── Input ── */
	.chat-input-wrap {
		padding: 12px 20px 16px;
		flex-shrink: 0;
	}

	.chat-input-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-card);
		padding: 8px 12px;
		background: var(--bg-control);
		transition: border-color 0.15s;
	}
	.chat-input-bar:focus-within { border-color: var(--text-muted); }

	.input-attach, .input-emoji {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		padding: 0;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
	.input-attach:hover, .input-emoji:hover { color: var(--text-primary); }

	.chat-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		font-size: 14px;
		color: var(--text-primary);
		font-family: inherit;
	}
	.chat-input::placeholder { color: var(--text-muted); }

	.input-right { display: flex; align-items: center; gap: 6px; }

	.input-send {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--text-primary);
		border: none;
		cursor: pointer;
		color: var(--bg-canvas);
		flex-shrink: 0;
		transition: opacity 0.15s;
	}
	.input-send:disabled { opacity: 0.3; cursor: default; }
	.input-send:not(:disabled):hover { opacity: 0.8; }

	/* ── Members panel ── */
	.members-panel {
		border-left: 1px solid var(--border-link);
		overflow-y: auto;
		padding: 0 0 24px;
	}

	.members-panel-header {
		padding: 14px 14px 8px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-link);
		margin-bottom: 12px;
	}

	.member-section-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		padding: 4px 14px 6px;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 12px;
	}
	.member-row--offline { opacity: 0.65; }

	.member-av {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'SangBleu Sunrise', Georgia, serif;
		font-size: 11px;
		flex-shrink: 0;
		position: relative;
	}

	.online-dot {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 8px;
		height: 8px;
		background: var(--color-success, #3d9e5a);
		border-radius: 50%;
		border: 1.5px solid var(--bg-canvas);
	}

	.member-info { display: flex; flex-direction: column; min-width: 0; }
	.member-name { font-size: 12px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.member-role {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.member-more {
		display: block;
		font-size: 11px;
		color: var(--text-muted);
		padding: 8px 14px;
		cursor: pointer;
	}
	.member-more:hover { color: var(--text-primary); }
</style>
