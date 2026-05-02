<script lang="ts">
	import { env } from '$env/dynamic/public';

	// Base URL for page imagery. Falls back to the current Supabase bucket URL
	// so deployments without the env var set keep rendering identically. Set
	// PUBLIC_ASSET_BASE_URL to a different origin to route these assets through
	// a sovereign host without a code change.
	const ASSETS =
		env.PUBLIC_ASSET_BASE_URL ??
		'https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads';
</script>

<svelte:head>
	<title>Why</title>
</svelte:head>

<div class="page">

	<div class="snap-intro">
		<header class="header">
			<a href="/"><img src="/images/logo.png" alt="dyad." class="logo" /></a>
		</header>

		<div class="hero">
		<div class="hero-body">


			<p>Over the past two years now, we have been meticulously at work. Working first to understand how we arrived at a digital environment that feels so intrusive, hostile, exhausting, and then, working on something precious, full of life by virtue of serving the life within. Dyad is the product of such care and intention.</p>

			<p>We did not like how being social online felt. We lacked the humanity the platforms we meet on allowed for. We are stripped down to a certain version of ourselves, and not the version we wanted come forth. The complexity of our experiences, the intricacy of making sense of them, and with that, discovering and nurturing the meaning of our lives. Where do you go online to expand, deepen, texture?</p>

			<p>A face to face conversation is part of the oral culture we only recently parted ways with. Stories and conversations have so long been how we weave parts of us together. And we wanted to give way to more of them.</p>

		</div>
		<div class="scattered">
			<img class="sc sc-lg" style="--x: 2%; --y: 8%; --r: -2deg"  src="{ASSETS}/why0.1.png" alt="" />
			<img class="sc sc-lg" style="--x: 48%; --y: 42%; --r: 2deg" src="{ASSETS}/why0.2.png" alt="" />
		</div>
	</div>
	</div>

	<div class="snap-dare">
		<div class="dare-body">
			<p>Dyad started as Dare. We designed an ugly duckling version of what we had in mind online and invited people to curated conversations. A topic, a question and four to eight people who wanted to meet for that. Our first users, two hundred of them, have taken something so humble, that was the private alpha of our product, and turned it into something extraordinary.</p>

			<p>Over a hundred conversations, all across Berlin. We flooded with people who had felt what we felt to begin with. We connected, conversed, and brought layers to our thinking behind the product.</p>

			<p>Dyad is now on its private beta and opens in Berlin for one on one conversations. We have a vision for an ecosystem in service to connection and collective sensemaking that brightens up our eyes every time we zoom out and circle back. That is to say, Dyad, the app to start and surface face to face conversations is only the beginning.</p>
		</div>

		<div class="scattered">
			<img class="sc" style="--x: 4%; --y: 20%; --r: -4deg"   src="{ASSETS}/why1.png" alt="" />
			<img class="sc" style="--x: 38%; --y: 14%; --r: 3deg"   src="{ASSETS}/why2.png" alt="" />
			<img class="sc" style="--x: 18%; --y: 52%; --r: -2deg" src="{ASSETS}/why3.png" alt="" />
			<img class="sc" style="--x: 50%; --y: 46%; --r: 4deg"  src="{ASSETS}/why4.png" alt="" />
		</div>
	</div>

	<div class="snap-section">
		<div class="section-body">
			<p>Although simple at face value, there is not a single decision that went into the making of Dyad that we have not deliberately thought about. A select few are worth voicing.</p>
			<p>Dyad is a hyper local, curated network. This is among the many decisions we took to bend the overwhelm of the internet. The March 2026 verdicts against Meta and YouTube are the culmination of decades of work on digital rights and privacy and affirm that platform design is intentional and liable to its effects. With that, we situate ourselves within a countermovement to the commodification and surveillance that have come to define much of the internet. We approach our work not merely as social technology, but as a living infrastructure for connection and sensemaking, drawing from the deep traditions of inquiry, expression, and creation.</p>
		</div>
		<div class="scattered scattered-harm">
			<img class="sc sc-full" style="--x: 2%; --y: 20%; --r: -3deg"  src="{ASSETS}/harm4.png" alt="" />
			<img class="sc sc-full" style="--x: 28%; --y: 14%; --r: 2deg"  src="{ASSETS}/harm3.png" alt="" />
			<img class="sc sc-full mobile-hide" style="--x: 12%; --y: 38%; --r: -2deg" src="{ASSETS}/harm1.png" alt="" />
			<img class="sc sc-full mobile-hide" style="--x: 38%; --y: 32%; --r: 3deg"  src="{ASSETS}/harm2.png" alt="" />
		</div>
	</div>

	<div class="snap-section">
		<div class="section-body">
			<p>Dyad is set to transition into steward ownership. A root cause that takes a big part in explaining how social platforms begin with a niche, do great service, and end up as extractive technologies with agendas of their own lies in their corporate ownership structure. Traditional corporate models, by design, do not allow operational decision making to sit separate from shareholder interests, interests that are solely monetary. With that, the mission is diluted in the pursuit of ever greater profits. Steward ownership offers a different foundation. It is grounded in self governance and treats profit as a means in service of purpose. In practice, our investors do not hold equity, nor do they have a say in our operational decision making. We believe it is our acts rather than our words that does the difference with such critical considerations. The choice of steward ownership is one of those acts.</p>
		</div>
		<div class="scattered">
			<img class="sc sc-full" style="--x: 32%; --y: 12%; --r: 2deg"   src="{ASSETS}/steward2.png" alt="" />
			<img class="sc sc-full mobile-hide" style="--x: 14%; --y: 44%; --r: -2deg; width: 360px;" src="{ASSETS}/steward5.png" alt="" />
			<img class="sc sc-full mobile-hide" style="--x: 44%; --y: 38%; --r: 3deg; width: 380px;"  src="{ASSETS}/steward4.png" alt="" />
			<img class="sc sc-full mobile-hide" style="--x: 28%; --y: 58%; --r: -8deg; width: 280px;" src="{ASSETS}/steward6.png" alt="" />
			<img class="sc sc-full desktop-hide" style="--x: 60%; --y: 30%; --r: 3deg; width: 280px;" src="{ASSETS}/steward8.png" alt="" />
		</div>
	</div>

	<div class="snap-rest">
		<div class="section-body">
			<p>Dyad is built on a framework that follows the open and decentralised original intentions of the web. The fact that we do not yet own the data we create online and how little we know and can affect of the collection, archival, and usage of this information is absolutely bonkers. We nest ourselves in the movement towards open, decentralised infrastructure that makes these matters right. With that, we follow the lineage of internet's architects.</p>

			<p>We feel that in speaking our minds as we build Dyad, we give the most honest insider view into what is happening inside the community.</p>

			<p>If you feel spoken to, join us still early in the way and let's talk.</p>

			<div class="sign-off">
				<p class="sign-name">With care and joy,</p>
				<p class="sign-name">Luna</p>
			</div>
		</div>

		<div class="scattered">
			<img class="sc sc-lg" style="--x: 2%; --y: 8%; --r: -4deg"  src="{ASSETS}/whyteam1.png" alt="" />
			<img class="sc sc-lg" style="--x: 48%; --y: 42%; --r: 3deg"  src="{ASSETS}/whyteam2.png" alt="" />
		</div>
	</div>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}

	.page {
		background: var(--bg-canvas);
		color: var(--text-secondary);
		font-family: inherit;
	}

	.snap-intro {
		height: 100vh;
		scroll-snap-align: start;
		display: flex;
		flex-direction: column;
	}

	.snap-dare {
		height: 100vh;
		scroll-snap-align: start;
		display: flex;
		align-items: center;
	}

	.dare-body {
		width: 50vw;
		padding: 0 48px;
		flex-shrink: 0;
	}

	.dare-body p {
		font-size: 1.125rem;
		font-weight: 300;
		line-height: 1.55;
		color: var(--text-secondary);
		margin: 0 0 28px 0;
	}

	.dare-body p:last-child {
		margin-bottom: 0;
	}

	/* Scattered images */
	.scattered {
		position: relative;
		flex: 1;
		align-self: stretch;
	}

	.sc {
		position: absolute;
		left: var(--x);
		top: var(--y);
		width: 160px;
		height: 180px;
		object-fit: cover;
		border-radius: 4px;
		transform: rotate(var(--r, 0deg));
	}

	.sc-lg {
		width: 260px;
		height: 300px;
	}

	.sc-full {
		width: 280px;
		height: auto;
		object-fit: contain;
	}

	.snap-section {
		height: 100vh;
		scroll-snap-align: start;
		display: flex;
		align-items: center;
	}

	.snap-rest {
		scroll-snap-align: start;
		min-height: 100vh;
		display: flex;
		align-items: center;
		position: relative;
	}

	.section-body {
		width: 50vw;
		padding: 0 48px;
	}

	.section-body p {
		font-size: 1.125rem;
		font-weight: 300;
		line-height: 1.55;
		color: var(--text-secondary);
		margin: 0 0 28px 0;
	}

	.section-body p:last-of-type {
		margin-bottom: 0;
	}

	/* Header */
	.header {
		padding: 36px 48px;
		flex-shrink: 0;
	}

	.logo {
		height: 24px;
		width: auto;
		display: block;
		opacity: 0.85;
	}

	/* Hero — first viewport */
	.hero {
		flex: 1;
		display: flex;
		align-items: center;
	}

	.hero-body {
		width: 50vw;
		padding: 0 48px;
		flex-shrink: 0;
	}

	.why0 {
		width: 260px;
		height: 300px;
		object-fit: cover;
		border-radius: 4px;
		transform: rotate(-2deg);
		margin: auto;
	}

	.hero-body {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.hero-body p {
		font-size: 1.125rem;
		font-weight: 300;
		line-height: 1.55;
		color: var(--text-secondary);
		margin: 0 0 28px 0;
	}

	.hero-body p:last-child {
		margin-bottom: 0;
	}

	/* Content */
	.content {
		width: 50vw;
		padding: 0 48px 160px;
	}

	/* h1 Headline */
	.headline {
		font-size: 2.5rem;
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		margin: 0 0 56px 0;
	}

	/* h2 Section title — serif, like conversation prompt */
	.section-title {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 400;
		line-height: 1.25;
		letter-spacing: -0.01em;
		color: var(--text-primary);
		margin: 0 0 40px 0;
	}

	/* Body text */
	.body p {
		font-size: 1.125rem;
		font-weight: 300;
		line-height: 1.55;
		color: var(--text-secondary);
		margin: 0 0 28px 0;
	}

	/* Three things */
	.three-things {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.thing-label {
		font-family: var(--font-serif);
		font-size: 1.125rem !important;
		font-weight: 400 !important;
		color: var(--text-primary) !important;
		margin-bottom: 12px !important;
	}

	.thing-contrast {
		font-style: italic;
		color: var(--text-muted) !important;
		font-size: 1rem !important;
		margin-top: -12px !important;
	}

	/* Divider */
	.divider {
		margin: 56px 0;
	}

	/* Sign-off */
	.sign-off {
		margin-top: 48px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.sign-name {
		font-size: 1rem;
		font-weight: 300;
		color: var(--text-secondary);
		margin: 0 !important;
	}

	.sign-role {
		font-size: 0.8rem;
		font-weight: 300;
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	/* Join block */
	.join-block {
		margin-top: 64px;
		padding-top: 48px;
		border-top: 1px solid var(--border-subtle);
	}

	.join-text {
		font-size: 1rem !important;
		color: var(--text-muted) !important;
		margin-bottom: 20px !important;
	}

	.join-btn {
		display: inline-block;
		padding: 12px 28px;
		border: 1px solid var(--border-code);
		border-radius: 999px;
		font-size: 0.9rem;
		color: var(--text-secondary);
		text-decoration: none;
		transition: border-color 0.2s, color 0.2s;
	}

	.join-btn:hover {
		border-color: var(--border-link);
		color: var(--text-primary);
	}

	@media (min-width: 601px) {
		.desktop-hide {
			display: none;
		}
	}

	/* Mobile */
	@media (max-width: 600px) {
		.header {
			padding: 20px 24px;
		}

		/* Sections stack vertically */
		.snap-intro,
		.snap-dare,
		.snap-section,
		.snap-rest {
			height: auto;
			min-height: unset;
			flex-direction: column;
			align-items: stretch;
			padding-bottom: 56px;
		}

		.hero {
			flex-direction: column;
			align-items: stretch;
		}

		/* Text bodies full width */
		.hero-body,
		.dare-body,
		.section-body {
			width: 100%;
			padding: 32px 24px 0;
		}

		/* Horizontal scroll strip for images */
		.scattered {
			order: -1;
			position: static;
			display: flex;
			flex-direction: row;
			overflow-x: auto;
			overflow-y: hidden;
			gap: 12px;
			padding: 24px 24px;
			height: 220px;
			flex-shrink: 0;
			align-items: flex-start;
			scrollbar-width: none;
		}

		.scattered::-webkit-scrollbar {
			display: none;
		}

		/* Override absolute positioning for all scattered images */
		.sc {
			position: static;
			width: 150px;
			height: 180px;
			object-fit: cover;
			flex-shrink: 0;
			transform: rotate(var(--r, 0deg));
			left: unset;
			top: unset;
		}

		.sc-lg {
			width: 170px;
			height: 190px;
		}

		.sc-full {
			width: 150px;
			height: 180px;
			object-fit: cover;
		}

		.hero p,
		.dare-body p,
		.section-body p {
			font-size: 1rem;
		}

		.sign-off {
			margin-top: 32px;
		}

		.mobile-hide {
			display: none;
		}

		/* Harm images — full width vertical stack */
		.scattered-harm {
			flex-direction: column;
			height: auto;
			max-height: 70vh;
			overflow-y: auto;
			overflow-x: hidden;
			gap: 16px;
			padding: 24px;
		}

		.scattered-harm .sc {
			width: 100%;
			height: auto;
			transform: none;
		}

		.scattered-harm .sc:first-child {
			transform: rotate(4deg);
		}

		.scattered-harm .sc:nth-child(2) {
			transform: rotate(-6deg);
			margin-top: 12px;
		}
	}
</style>
