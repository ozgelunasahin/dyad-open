<script lang="ts">
	let active = $state<'space' | 'feeds' | 'moderation' | 'identity' | 'health'>('space');

	const nav = [
		{ id: 'space',      label: 'Space' },
		{ id: 'feeds',      label: 'Feeds' },
		{ id: 'moderation', label: 'Moderation' },
		{ id: 'identity',   label: 'Identity' },
		{ id: 'health',     label: 'Health' },
	] as const;

	// ── Health chart data ────────────────────────────────────────────────────
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
	const chartW = 600, chartH = 220;
	const padL = 36, padB = 28, padT = 12, padR = 12;
	const W = chartW - padL - padR;
	const H = chartH - padB - padT;
	const maxVal = 900;

	function cx(i: number) { return padL + (i / (months.length - 1)) * W; }
	function cy(v: number) { return padT + H - (v / maxVal) * H; }

	const feedViews = [80, 240, 360, 470, 590, 730, 880];
	const members   = [30, 80,  135, 165, 205, 260, 310];
	const resolved  = [20, 42,  62,  84,  102, 122, 145];

	function polyline(data: number[]) {
		return data.map((v, i) => `${cx(i)},${cy(v)}`).join(' ');
	}
	function area(data: number[]) {
		return data.map((v, i) => `${cx(i)},${cy(v)}`).join(' ')
			+ ` ${cx(data.length-1)},${cy(0)+padB} ${cx(0)},${cy(0)+padB}`;
	}
	const yTicks = [0, 300, 600, 900];

	// ── Moderation rules ─────────────────────────────────────────────────────
	let rules = $state([
		{ label: 'Require profile to respond',     on: true  },
		{ label: 'Host review for new members',    on: false },
		{ label: 'Max 1 open conversation/member', on: true  },
		{ label: 'Block repeat no-shows',          on: true  },
		{ label: 'Manual approve invitations',     on: false },
	]);
</script>

<svelte:head>
	<title>Community Manager — dyad.</title>
</svelte:head>

<div class="shell">

	<!-- ── Top bar ─────────────────────────────────────────────────────────── -->
	<header class="topbar">
		<!-- Tab nav — scrollable on mobile -->
		<nav class="tabnav" aria-label="Sections">
			{#each nav as item}
				<button
					class="tab"
					class:tab--active={active === item.id}
					onclick={() => active = item.id as typeof active}
				>{item.label}</button>
			{/each}
		</nav>
	</header>

	<!-- ── Content ─────────────────────────────────────────────────────────── -->
	<main class="main">

		<!-- YOUR SPACE -->
		{#if active === 'space'}
			<div class="panel">
				<p class="kicker">Your space</p>
				<h2 class="title">Set up your community.</h2>
				<p class="body-text">Define who belongs, what you gather around, and how members find you.</p>

				<div class="form-stack">
					<div class="form-row">
						<div class="field">
							<label class="label">Community name</label>
							<input class="input" type="text" value="Kreuzberg Reads" />
						</div>
						<div class="field">
							<label class="label">Handle</label>
							<input class="input" type="text" value="kreuzberg-reads.dyad.berlin" />
						</div>
					</div>

					<div class="field">
						<label class="label">What do you gather around?</label>
						<textarea class="input input--area" rows="3">A neighbourhood reading community. We meet to discuss books, essays, and ideas — one conversation at a time.</textarea>
					</div>

					<div class="field">
						<label class="label">Topic areas</label>
						<div class="tags">
							<span class="tag tag--on">Literature</span>
							<span class="tag tag--on">Philosophy</span>
							<span class="tag tag--on">Local history</span>
							<span class="tag">Politics</span>
							<span class="tag">Science</span>
							<span class="tag tag--add">+ add</span>
						</div>
					</div>

					<div class="form-row">
						<div class="field">
							<label class="label">Join method</label>
							<div class="select-fake">Invite link only ▾</div>
						</div>
						<div class="field">
							<label class="label">Invite link</label>
							<div class="copy-row">
								<span class="copy-val">dyad.berlin/join/kr-reads-a7x</span>
								<button class="copy-btn">copy</button>
							</div>
						</div>
					</div>
				</div>

				<div class="save-row">
					<button class="btn-save">Save changes</button>
				</div>
			</div>

		<!-- YOUR FEEDS -->
		{:else if active === 'feeds'}
			<div class="panel">
				<p class="kicker">Your feeds</p>
				<h2 class="title">Shape what surfaces.</h2>
				<p class="body-text">Decide which conversations appear in your community feed and in what order.</p>

				<div class="settings-list">
					<div class="setting">
						<div class="setting-text">
							<span class="setting-label">Show conversations from</span>
							<span class="setting-desc">Limit the feed to members only, or open to all of dyad.</span>
						</div>
						<div class="select-fake select-fake--sm">Members only ▾</div>
					</div>
					<div class="setting">
						<div class="setting-text">
							<span class="setting-label">Default sort</span>
							<span class="setting-desc">How new members first encounter the feed.</span>
						</div>
						<div class="select-fake select-fake--sm">Most recent ▾</div>
					</div>
					<div class="setting">
						<div class="setting-text">
							<span class="setting-label">Surface conversations with open slots</span>
							<span class="setting-desc">Promote prompts that still have available meeting times.</span>
						</div>
						<div class="toggle toggle--on"></div>
					</div>
					<div class="setting">
						<div class="setting-text">
							<span class="setting-label">Hide after meeting is confirmed</span>
							<span class="setting-desc">Keeps the feed focused on conversations still seeking partners.</span>
						</div>
						<div class="toggle toggle--on"></div>
					</div>
					<div class="setting">
						<div class="setting-text">
							<span class="setting-label">Filter by community topics only</span>
							<span class="setting-desc">Only show conversations tagged with your topics.</span>
						</div>
						<div class="toggle toggle--off"></div>
					</div>
				</div>

				<div class="save-row">
					<button class="btn-save">Save changes</button>
				</div>
			</div>

		<!-- YOUR MODERATION -->
		{:else if active === 'moderation'}
			<div class="panel">
				<p class="kicker">Your moderation</p>
				<h2 class="title">Set the norms.</h2>
				<p class="body-text">Define rules, review behaviour, and maintain the quality of your space.</p>

				<div class="settings-list">
					{#each rules as rule, i}
						<div class="setting">
							<span class="setting-label">{rule.label}</span>
							<button
								class="toggle"
								class:toggle--on={rule.on}
								class:toggle--off={!rule.on}
								onclick={() => rules[i].on = !rules[i].on}
								aria-label="toggle"
							></button>
						</div>
					{/each}
				</div>

				<div class="section-divider"></div>

				<p class="section-title">Report queue</p>
				<div class="reports">
					<div class="report-row">
						<div class="report-info">
							<span class="report-who">@felix_m</span>
							<span class="report-reason">No-show × 2</span>
						</div>
						<div class="report-actions">
							<button class="btn-warn">warn</button>
							<button class="btn-remove">remove</button>
						</div>
					</div>
					<div class="report-row report-row--dim">
						<div class="report-info">
							<span class="report-who">@ana_k</span>
							<span class="report-reason">Off-topic prompt</span>
						</div>
						<div class="report-actions">
							<button class="btn-warn">warn</button>
							<button class="btn-remove">remove</button>
						</div>
					</div>
				</div>
			</div>

		<!-- YOUR IDENTITY -->
		{:else if active === 'identity'}
			<div class="panel">
				<p class="kicker">Your identity</p>
				<h2 class="title">Make it yours.</h2>
				<p class="body-text">Your community's name, look, and public presence across dyad.</p>

				<div class="id-block">
					<div class="avatar-row">
						<div class="avatar">KR</div>
						<button class="btn-ghost">Upload logo</button>
					</div>

					<div class="field">
						<label class="label">Display name</label>
						<input class="input" type="text" value="Kreuzberg Reads" />
					</div>
					<div class="field">
						<label class="label">Public tagline</label>
						<input class="input" type="text" value="One book. One conversation. One neighbour at a time." />
					</div>
					<div class="field">
						<label class="label">Accent colour</label>
						<div class="colour-row">
							<div class="swatch" style="background: #b04a3a"></div>
							<input class="input input--sm" type="text" value="#b04a3a" />
						</div>
					</div>
				</div>

				<p class="section-title" style="margin-top: var(--space-8);">Preview</p>
				<div class="preview-card">
					<div class="preview-avatar">KR</div>
					<div class="preview-text">
						<p class="preview-name">Kreuzberg Reads</p>
						<p class="preview-tag">One book. One conversation. One neighbour at a time.</p>
						<p class="preview-meta">34 members · kreuzberg-reads.dyad.berlin</p>
					</div>
				</div>

				<div class="save-row">
					<button class="btn-save">Save changes</button>
				</div>
			</div>

		<!-- YOUR HEALTH -->
		{:else if active === 'health'}
			<div class="panel">
				<p class="kicker">Your health</p>
				<h2 class="title">See what's working.</h2>
				<p class="body-text">Track member growth, feed activity, and engagement.<br/>Understand where your community wants to go.</p>

				<div class="stat-strip">
					<div class="stat">
						<span class="stat-val">34</span>
						<span class="stat-lbl">members</span>
					</div>
					<div class="stat">
						<span class="stat-val">128</span>
						<span class="stat-lbl">conversations</span>
					</div>
					<div class="stat">
						<span class="stat-val">89%</span>
						<span class="stat-lbl">meetings held</span>
					</div>
					<div class="stat">
						<span class="stat-val">4.8</span>
						<span class="stat-lbl">avg. rating</span>
					</div>
				</div>

				<div class="chart-wrap">
					<div class="chart-legend">
						<span class="legend-item legend--feed">Feed views</span>
						<span class="legend-item legend--members">Members</span>
						<span class="legend-item legend--resolved">Reports resolved</span>
					</div>
					<svg class="chart-svg" viewBox="0 0 {chartW} {chartH}" xmlns="http://www.w3.org/2000/svg">
						<defs>
							<linearGradient id="gFeed" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stop-color="#b04a3a" stop-opacity="0.18"/>
								<stop offset="100%" stop-color="#b04a3a" stop-opacity="0"/>
							</linearGradient>
						</defs>

						{#each yTicks as tick}
							<line x1={padL} y1={cy(tick)} x2={chartW-padR} y2={cy(tick)} stroke="#e8e4dc" stroke-width="1"/>
							<text x={padL-6} y={cy(tick)+4} text-anchor="end" class="axis-lbl">{tick}</text>
						{/each}

						{#each months as m, i}
							<text x={cx(i)} y={chartH-6} text-anchor="middle" class="axis-lbl">{m}</text>
						{/each}

						<polygon points={area(feedViews)} fill="url(#gFeed)"/>

						<polyline points={polyline(members)} fill="none" stroke="#8a7fc0" stroke-width="1.5" stroke-linejoin="round"/>
						{#each members as v, i}
							<circle cx={cx(i)} cy={cy(v)} r="3" fill="#8a7fc0"/>
						{/each}

						<polyline points={polyline(resolved)} fill="none" stroke="#5a9e9e" stroke-width="1.5" stroke-linejoin="round"/>
						{#each resolved as v, i}
							<circle cx={cx(i)} cy={cy(v)} r="3" fill="#5a9e9e"/>
						{/each}

						<polyline points={polyline(feedViews)} fill="none" stroke="#b04a3a" stroke-width="2" stroke-linejoin="round"/>
						{#each feedViews as v, i}
							<circle cx={cx(i)} cy={cy(v)} r="4" fill="#b04a3a"/>
						{/each}
					</svg>
				</div>
			</div>
		{/if}

	</main>
</div>

<style>
	/* ── Shell ─────────────────────────────────────────────────────────────── */
	.shell {
		min-height: 100vh;
		background: var(--bg-canvas, #f5f3f0);
		display: flex;
		flex-direction: column;
	}

	/* ── Topbar ─────────────────────────────────────────────────────────────── */
	.topbar {
		background: var(--bg-canvas, #f5f3f0);
		border-bottom: 1px solid rgba(0,0,0,0.08);
		position: sticky;
		top: 0;
		z-index: 10;
		padding-top: var(--space-10);
	}

	/* ── Tab nav ────────────────────────────────────────────────────────────── */
	.tabnav {
		display: flex;
		gap: var(--space-2);
		padding: 0 var(--space-5) var(--space-4);
		overflow-x: auto;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
	}

	.tabnav::-webkit-scrollbar { display: none; }

	.tab {
		flex-shrink: 0;
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		padding: 7px 16px;
		border-radius: var(--radius-pill);
		border: 1px solid rgba(0,0,0,0.12);
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.tab:hover {
		background: rgba(0,0,0,0.04);
		color: var(--text-primary);
	}

	.tab--active {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-color: var(--text-primary);
	}

	/* ── Main content ───────────────────────────────────────────────────────── */
	.main {
		flex: 1;
		padding: var(--space-6) var(--space-5);
		max-width: 640px;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}

	/* ── Panel ──────────────────────────────────────────────────────────────── */
	.panel { display: flex; flex-direction: column; gap: 0; }

	.kicker {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		color: var(--color-accent, #b04a3a);
		margin: 0 0 var(--space-2);
		text-transform: uppercase;
	}

	.title {
		font-size: clamp(26px, 7vw, 38px);
		font-weight: 400;
		letter-spacing: -0.03em;
		line-height: 1.1;
		color: var(--text-primary);
		margin: 0 0 var(--space-3);
	}

	.body-text {
		font-size: var(--text-base);
		line-height: 1.65;
		color: var(--text-muted);
		margin: 0 0 var(--space-8);
	}

	/* ── Form ───────────────────────────────────────────────────────────────── */
	.form-stack { display: flex; flex-direction: column; gap: var(--space-5); }

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	@media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }

	.field { display: flex; flex-direction: column; gap: var(--space-2); }

	.label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.input {
		background: rgba(0,0,0,0.04);
		border: 1px solid rgba(0,0,0,0.1);
		border-radius: var(--radius-input);
		color: var(--text-primary);
		font-family: inherit;
		font-size: var(--text-base);
		padding: 10px 14px;
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
		box-sizing: border-box;
	}

	.input:focus { border-color: var(--text-primary); }
	.input--area { resize: none; }
	.input--sm { max-width: 120px; }

	.tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }

	.tag {
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		padding: 5px 12px;
		border-radius: var(--radius-pill);
		border: 1px solid rgba(0,0,0,0.12);
		color: var(--text-muted);
		cursor: pointer;
	}

	.tag--on {
		border-color: var(--color-accent, #b04a3a);
		color: var(--color-accent, #b04a3a);
		background: rgba(176,74,58,0.06);
	}

	.tag--add { border-style: dashed; color: rgba(0,0,0,0.2); }

	.select-fake {
		background: rgba(0,0,0,0.04);
		border: 1px solid rgba(0,0,0,0.1);
		border-radius: var(--radius-input);
		color: var(--text-primary);
		font-family: inherit;
		font-size: var(--text-base);
		padding: 10px 14px;
		cursor: pointer;
	}

	.select-fake--sm { font-size: var(--text-sm); padding: 8px 12px; }

	.copy-row {
		display: flex;
		border: 1px solid rgba(0,0,0,0.1);
		border-radius: var(--radius-input);
		overflow: hidden;
	}

	.copy-val {
		flex: 1;
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		color: var(--text-muted);
		padding: 10px 12px;
		background: rgba(0,0,0,0.04);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.copy-btn {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		padding: 10px 16px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		cursor: pointer;
		flex-shrink: 0;
	}

	/* ── Settings list ──────────────────────────────────────────────────────── */
	.settings-list { display: flex; flex-direction: column; }

	.setting {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-5) 0;
		border-bottom: 1px solid rgba(0,0,0,0.06);
	}

	.setting-text { display: flex; flex-direction: column; gap: var(--space-1); }
	.setting-label { font-size: var(--text-base); color: var(--text-primary); }
	.setting-desc { font-size: var(--text-sm); color: var(--text-muted); line-height: 1.5; }

	/* ── Toggle ─────────────────────────────────────────────────────────────── */
	.toggle {
		width: 40px;
		height: 22px;
		border-radius: 11px;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		position: relative;
		transition: background 0.2s;
	}

	.toggle::after {
		content: '';
		position: absolute;
		top: 3px;
		width: 16px; height: 16px;
		border-radius: 50%;
		background: #fff;
		transition: left 0.2s;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
	}

	.toggle--on  { background: var(--color-accent, #b04a3a); }
	.toggle--on::after  { left: 21px; }
	.toggle--off { background: rgba(0,0,0,0.15); }
	.toggle--off::after { left: 3px; }

	/* ── Save row ───────────────────────────────────────────────────────────── */
	.save-row { margin-top: var(--space-8); }

	.btn-save {
		font-family: inherit;
		font-size: var(--text-base);
		padding: 12px 28px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.btn-save:hover { opacity: 0.82; }

	/* ── Section divider / title ────────────────────────────────────────────── */
	.section-divider {
		height: 1px;
		background: rgba(0,0,0,0.06);
		margin: var(--space-8) 0 var(--space-6);
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		color: var(--text-muted);
		text-transform: uppercase;
		margin: 0 0 var(--space-4);
	}

	/* ── Reports ────────────────────────────────────────────────────────────── */
	.reports { display: flex; flex-direction: column; }

	.report-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-4) 0;
		border-bottom: 1px solid rgba(0,0,0,0.06);
	}

	.report-row--dim { opacity: 0.45; }
	.report-info { display: flex; flex-direction: column; gap: 3px; }
	.report-who { font-size: var(--text-sm); color: var(--text-primary); }
	.report-reason { font-size: var(--text-xs); font-family: var(--font-mono); color: var(--text-muted); }
	.report-actions { display: flex; gap: var(--space-2); flex-shrink: 0; }

	.btn-warn, .btn-remove {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		padding: 6px 12px;
		border-radius: var(--radius-input);
		cursor: pointer;
		background: transparent;
	}

	.btn-warn   { border: 1px solid rgba(176,74,58,0.4); color: var(--color-accent, #b04a3a); }
	.btn-remove { border: 1px solid rgba(0,0,0,0.15); color: var(--text-muted); }

	/* ── Identity ───────────────────────────────────────────────────────────── */
	.id-block { display: flex; flex-direction: column; gap: var(--space-5); }

	.avatar-row { display: flex; align-items: center; gap: var(--space-4); }

	.avatar {
		width: 64px; height: 64px;
		border-radius: 50%;
		background: var(--color-accent, #b04a3a);
		color: #fff;
		display: flex; align-items: center; justify-content: center;
		font-size: 20px; font-weight: 500;
		flex-shrink: 0;
	}

	.btn-ghost {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		padding: 8px 16px;
		border: 1px solid rgba(0,0,0,0.15);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
	}

	.colour-row { display: flex; align-items: center; gap: var(--space-3); }

	.swatch {
		width: 32px; height: 32px;
		border-radius: var(--radius-input);
		flex-shrink: 0;
	}

	.preview-card {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		padding: var(--space-5);
		background: rgba(0,0,0,0.03);
		border: 1px solid rgba(0,0,0,0.08);
		border-radius: var(--radius-card);
	}

	.preview-avatar {
		width: 48px; height: 48px;
		border-radius: 50%;
		background: var(--color-accent, #b04a3a);
		color: #fff;
		display: flex; align-items: center; justify-content: center;
		font-size: 14px; font-weight: 500;
		flex-shrink: 0;
	}

	.preview-text { display: flex; flex-direction: column; gap: 3px; }
	.preview-name { font-size: var(--text-base); color: var(--text-primary); margin: 0; }
	.preview-tag  { font-size: var(--text-sm); color: var(--text-muted); margin: 0; }
	.preview-meta { font-size: var(--text-xs); font-family: var(--font-mono); color: rgba(0,0,0,0.25); margin: 0; }

	/* ── Health ─────────────────────────────────────────────────────────────── */
	.stat-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background: rgba(0,0,0,0.08);
		border-radius: var(--radius-card);
		overflow: hidden;
		margin-bottom: var(--space-6);
	}

	@media (max-width: 480px) { .stat-strip { grid-template-columns: repeat(2, 1fr); } }

	.stat {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: var(--space-5) var(--space-5);
		background: var(--bg-canvas);
	}

	.stat-val {
		font-size: 28px;
		font-weight: 400;
		letter-spacing: -0.04em;
		color: var(--text-primary);
		line-height: 1;
	}

	.stat-lbl {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	/* ── Chart ──────────────────────────────────────────────────────────────── */
	.chart-wrap {
		background: rgba(0,0,0,0.02);
		border: 1px solid rgba(0,0,0,0.07);
		border-radius: var(--radius-card);
		padding: var(--space-5);
	}

	.chart-legend {
		display: flex;
		gap: var(--space-5);
		margin-bottom: var(--space-4);
		flex-wrap: wrap;
	}

	.legend-item {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.legend-item::before {
		content: '●';
		font-size: 8px;
	}

	.legend--feed    { color: var(--color-accent, #b04a3a); }
	.legend--members { color: #8a7fc0; }
	.legend--resolved{ color: #5a9e9e; }

	.chart-svg { width: 100%; height: auto; display: block; }

	.axis-lbl {
		font-family: var(--font-mono);
		font-size: 10px;
		fill: rgba(0,0,0,0.25);
	}
</style>
