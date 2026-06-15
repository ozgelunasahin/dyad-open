<svelte:head>
	<title>dyad. — open infrastructure for real gathering</title>
</svelte:head>

<div class="page">

	<!-- subtle grid texture -->
	<div class="grid-bg" aria-hidden="true"></div>

	<!-- ── top bar ── -->
	<header class="topbar">
		<span class="brand">dyad.</span>
		<span class="topbar-label">OPEN INFRASTRUCTURE</span>
	</header>

	<!-- ── hero text ── -->
	<div class="hero">
		<h1 class="headline">
			Communities launch<br/>and govern their own<br/>social space.
		</h1>
		<p class="sub">
			Coordination · Moderation · Participation · Real gathering
		</p>
	</div>

	<!-- ── architecture diagram ── -->
	<div class="diagram">

		<!-- SVG connectors drawn behind nodes -->
		<svg class="lines" viewBox="0 0 960 480" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
			<!-- top nodes → relay -->
			<line x1="96"  y1="68" x2="480" y2="168" class="wire"/>
			<line x1="240" y1="68" x2="480" y2="168" class="wire"/>
			<line x1="384" y1="68" x2="480" y2="168" class="wire"/>
			<line x1="576" y1="68" x2="480" y2="168" class="wire"/>
			<line x1="720" y1="68" x2="480" y2="168" class="wire"/>
			<line x1="864" y1="68" x2="480" y2="168" class="wire"/>

			<!-- relay → tools -->
			<line x1="480" y1="208" x2="240" y2="292" class="wire"/>
			<line x1="480" y1="208" x2="480" y2="292" class="wire"/>
			<line x1="480" y1="208" x2="720" y2="292" class="wire"/>

			<!-- tools → spaces -->
			<line x1="240" y1="332" x2="320" y2="392" class="wire"/>
			<line x1="480" y1="332" x2="480" y2="392" class="wire"/>
			<line x1="720" y1="332" x2="640" y2="392" class="wire"/>

			<!-- spaces → governance -->
			<line x1="320" y1="424" x2="240" y2="464" class="wire"/>
			<line x1="480" y1="424" x2="480" y2="464" class="wire"/>
			<line x1="640" y1="424" x2="720" y2="464" class="wire"/>

			<!-- api curve -->
			<path d="M 120 292 C 200 292 200 188 480 188" class="wire wire--optional"/>
			<text x="152" y="282" class="svg-label svg-label--dim">(optional)</text>
		</svg>

		<!-- Row 1: communities -->
		<div class="row row--top">
			<div class="node-wrap">
				<div class="node node--server"><div class="srv-body"></div><div class="srv-top"></div></div>
				<span class="nlabel">university</span>
			</div>
			<div class="node-wrap">
				<div class="node node--server"><div class="srv-body"></div><div class="srv-top"></div></div>
				<span class="nlabel">neighbourhood</span>
			</div>
			<div class="node-wrap node--hl">
				<div class="node node--server node--server-hl"><div class="srv-body"></div><div class="srv-top"></div></div>
				<span class="nlabel nlabel--hl">[ your.community ]</span>
			</div>
			<div class="node-wrap">
				<div class="node node--server"><div class="srv-body"></div><div class="srv-top"></div></div>
				<span class="nlabel">institution</span>
			</div>
			<div class="node-wrap">
				<div class="node node--server"><div class="srv-body"></div><div class="srv-top"></div></div>
				<span class="nlabel">employer</span>
			</div>
			<div class="node-wrap">
				<div class="node node--server"><div class="srv-body"></div><div class="srv-top"></div></div>
				<span class="nlabel">city</span>
			</div>
		</div>
		<div class="row-label row-label--tr">YOUR COMMUNITIES</div>

		<!-- Row 2: relay -->
		<div class="row row--relay">
			<div class="api-aside">
				<div class="node node--cube"><div class="cube-face cube-top"></div><div class="cube-face cube-front"></div><div class="cube-face cube-side"></div></div>
				<span class="nlabel">dyad<br/>open api</span>
			</div>
			<div class="node-wrap">
				<div class="node node--cyl"><div class="cyl-top"></div><div class="cyl-body"></div></div>
				<span class="nlabel nlabel--lg">dyad coordination layer</span>
			</div>
		</div>
		<div class="row-label row-label--r">DYAD NETWORK</div>

		<!-- Row 3: tools -->
		<div class="row row--tools">
			<div class="node-wrap">
				<div class="node node--diamond"></div>
				<span class="nlabel">your curation<br/>algorithm</span>
			</div>
			<div class="node-wrap">
				<div class="node node--diamond"></div>
				<span class="nlabel">your moderation<br/>rules</span>
			</div>
			<div class="node-wrap">
				<div class="node node--diamond"></div>
				<span class="nlabel">your membership<br/>criteria</span>
			</div>
		</div>
		<div class="row-label row-label--r">YOUR TOOLS</div>

		<!-- Row 4: spaces -->
		<div class="row row--spaces">
			<div class="node-wrap">
				<div class="node node--platform"></div>
				<span class="nlabel">dyad.berlin</span>
			</div>
			<div class="node-wrap node--hl">
				<div class="node node--platform node--platform-hl"></div>
				<span class="nlabel nlabel--hl">your.community.social</span>
			</div>
			<div class="node-wrap">
				<div class="node node--platform"></div>
				<span class="nlabel">gather.yourcity.xyz</span>
			</div>
		</div>
		<div class="row-label row-label--r">YOUR SOCIAL SPACE</div>

		<!-- Row 5: governance -->
		<div class="row row--gov">
			<div class="node-wrap">
				<div class="node node--disc"></div>
				<span class="nlabel">your host<br/>circle</span>
			</div>
			<div class="node-wrap">
				<div class="node node--disc"></div>
				<span class="nlabel">your member<br/>assembly</span>
			</div>
			<div class="node-wrap">
				<div class="node node--disc"></div>
				<span class="nlabel">your gathering<br/>norms</span>
			</div>
		</div>
		<div class="row-label row-label--r">YOUR GOVERNANCE</div>

	</div><!-- /diagram -->

	<footer class="foot">
		<span>dyad.berlin</span>
		<span>·</span>
		<span>hello@dyad.berlin</span>
	</footer>

</div>

<style>
	/* ── Reset / base ─────────────────────────────────────────────────────── */
	:global(body) { margin: 0; background: #000; }

	.page {
		min-height: 100vh;
		background: #000;
		color: #d4cfc8;
		font-family: 'Courier New', Courier, monospace;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	/* ── Grid texture ─────────────────────────────────────────────────────── */
	.grid-bg {
		position: fixed;
		inset: 0;
		background-image:
			linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
		background-size: 40px 40px;
		pointer-events: none;
		z-index: 0;
	}

	/* ── Topbar ───────────────────────────────────────────────────────────── */
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 40px;
		border-bottom: 1px solid #1a1a18;
		position: relative;
		z-index: 1;
	}

	.brand {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #ede9e0;
		font-family: inherit;
	}

	.topbar-label {
		font-size: 10px;
		letter-spacing: 0.2em;
		color: #c8b274;
	}

	/* ── Hero ─────────────────────────────────────────────────────────────── */
	.hero {
		padding: 32px 40px 16px;
		position: relative;
		z-index: 1;
	}

	.headline {
		font-size: clamp(22px, 3vw, 34px);
		font-weight: 400;
		line-height: 1.2;
		letter-spacing: -0.03em;
		color: #ede9e0;
		margin: 0 0 10px;
		font-family: inherit;
	}

	.sub {
		font-size: 10px;
		letter-spacing: 0.15em;
		color: #c8b274;
		margin: 0;
		text-transform: uppercase;
	}

	/* ── Diagram wrapper ──────────────────────────────────────────────────── */
	.diagram {
		flex: 1;
		position: relative;
		z-index: 1;
		padding: 12px 40px 0;
	}

	/* ── SVG connector layer ──────────────────────────────────────────────── */
	.lines {
		position: absolute;
		top: 0;
		left: 40px;
		right: 40px;
		bottom: 0;
		width: calc(100% - 80px);
		height: 100%;
		pointer-events: none;
		z-index: 0;
	}

	.wire {
		stroke: #2a2824;
		stroke-width: 1;
		stroke-dasharray: 5 4;
		fill: none;
	}

	.wire--optional {
		stroke: #3a3428;
	}

	.svg-label {
		font-family: 'Courier New', monospace;
		font-size: 9px;
		fill: #c8b274;
	}

	.svg-label--dim {
		fill: #4a4438;
		font-style: italic;
	}

	/* ── Row layout ───────────────────────────────────────────────────────── */
	.row {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		gap: 0;
		position: relative;
		z-index: 1;
	}

	.row--top    { gap: 16px; margin-bottom: 2px; }
	.row--relay  { gap: 40px; margin-bottom: 2px; justify-content: center; align-items: center; }
	.row--tools  { gap: 40px; margin-bottom: 2px; }
	.row--spaces { gap: 40px; margin-bottom: 2px; }
	.row--gov    { gap: 48px; margin-bottom: 2px; }

	/* row labels */
	.row-label {
		font-size: 9px;
		letter-spacing: 0.2em;
		color: #c8b274;
		text-align: right;
		position: relative;
		z-index: 1;
		margin-bottom: 8px;
	}

	.row-label--r  { text-align: right; }
	.row-label--tr { text-align: right; margin-top: 2px; }

	/* ── Node wrap ────────────────────────────────────────────────────────── */
	.node-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.nlabel {
		font-size: 9px;
		color: #4a4840;
		text-align: center;
		line-height: 1.4;
		white-space: nowrap;
	}

	.nlabel--lg { font-size: 10px; color: #6a6560; }
	.nlabel--hl { color: #c8b274; }

	/* ── Server node ──────────────────────────────────────────────────────── */
	.node--server {
		width: 36px;
		height: 44px;
		position: relative;
	}

	.srv-body {
		position: absolute;
		bottom: 0;
		left: 0; right: 0;
		height: 36px;
		border: 1px solid #2a2824;
		border-radius: 2px;
	}

	.srv-top {
		position: absolute;
		top: 0;
		left: 4px; right: 4px;
		height: 10px;
		border: 1px solid #2a2824;
		border-radius: 1px;
	}

	.node--server-hl .srv-body,
	.node--server-hl .srv-top {
		border-color: #c8b274;
	}

	/* ── Cylinder node ────────────────────────────────────────────────────── */
	.node--cyl {
		width: 80px;
		height: 44px;
		position: relative;
	}

	.cyl-top {
		position: absolute;
		top: 0; left: 0; right: 0;
		height: 16px;
		border: 1px solid #4a4840;
		border-radius: 50%;
	}

	.cyl-body {
		position: absolute;
		top: 8px; bottom: 0; left: 0; right: 0;
		border: 1px solid #4a4840;
		border-top: none;
		border-radius: 0 0 50% 50% / 0 0 40% 40%;
	}

	/* ── Cube node (API) ──────────────────────────────────────────────────── */
	.node--cube {
		width: 36px;
		height: 36px;
		position: relative;
	}

	.cube-face {
		position: absolute;
		border: 1px solid #3a3630;
	}

	.cube-front {
		bottom: 0; left: 0;
		width: 26px; height: 26px;
	}

	.cube-top {
		top: 0; left: 8px;
		width: 26px; height: 10px;
		transform: skewX(-45deg);
		transform-origin: bottom left;
	}

	.cube-side {
		top: 10px; right: 0;
		width: 10px; height: 26px;
		transform: skewY(-45deg);
		transform-origin: top left;
	}

	/* ── Diamond node ─────────────────────────────────────────────────────── */
	.node--diamond {
		width: 32px;
		height: 32px;
		border: 1px solid #2a2824;
		transform: rotate(45deg);
		flex-shrink: 0;
	}

	/* ── Platform node ────────────────────────────────────────────────────── */
	.node--platform {
		width: 72px;
		height: 14px;
		border: 1px solid #2a2824;
		border-radius: 50%;
		position: relative;
	}

	.node--platform::before {
		content: '';
		position: absolute;
		top: -8px; left: -1px; right: -1px;
		height: 10px;
		border: 1px solid #2a2824;
		border-bottom: none;
		border-radius: 50% 50% 0 0 / 80% 80% 0 0;
	}

	.node--platform-hl,
	.node--platform-hl::before { border-color: #c8b274; }

	/* ── Disc node (governance) ───────────────────────────────────────────── */
	.node--disc {
		width: 60px;
		height: 14px;
		border: 1px solid #222018;
		border-radius: 50%;
		position: relative;
	}

	.node--disc::before {
		content: '';
		position: absolute;
		top: -6px; left: -1px; right: -1px;
		height: 8px;
		border: 1px solid #222018;
		border-bottom: none;
		border-radius: 50% 50% 0 0 / 80% 80% 0 0;
	}

	/* ── API aside (left of relay row) ───────────────────────────────────── */
	.api-aside {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		opacity: 0.6;
	}

	/* ── Footer ───────────────────────────────────────────────────────────── */
	.foot {
		padding: 16px 40px;
		border-top: 1px solid #1a1a18;
		display: flex;
		gap: 12px;
		font-size: 9px;
		color: #3a3630;
		letter-spacing: 0.1em;
		position: relative;
		z-index: 1;
	}

	/* ── highlight node wrapper ───────────────────────────────────────────── */
	.node--hl .nlabel { color: #c8b274; }
</style>
