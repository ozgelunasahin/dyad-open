<script lang="ts">
	import { copy } from '$lib/copy';
	import { storageUrl } from '$lib/utils/storage-url';
	import { formatHybridDate } from '$lib/utils/dates';
	import type { PageData } from './$types';
	import { env } from '$env/dynamic/public';

	let { data }: { data: PageData } = $props();

	const t = copy.about;
	const ogImage = `${copy.landing.ogUrl}/images/og-card-v2.png`;

	// Same photo as the landing page, shown in the photo blocks. The gradient
	// under it covers a failed load.
	const bgImageUrl = storageUrl('newsletter assets', 'landing page.jpg');
	const crowdImage = '/images/log-in.jpeg';
	const roomImage = '/images/sign-in.jpeg';

	// Tickets are a Stripe Payment Link: a full-page redirect, no embedded
	// Stripe.js (same consent-free pattern as /zine). Unset, the ticket half
	// of the card button is left out rather than pointing nowhere.
	const ticketUrl = (env.PUBLIC_TICKET_PAYMENT_LINK ?? '').trim();

	// Stand-in art for conversations without a cover of their own, cycled
	// in order. Swap in the final images here.
	const standIns = [
		{ src: crowdImage, pos: '50% 15%' },
		{ src: roomImage, pos: '50% 35%' },
		{ src: bgImageUrl, pos: '40% 60%' },
		{ src: crowdImage, pos: '50% 80%' },
		{ src: roomImage, pos: '30% 70%' }
	];
	// Card frames, cycled: soft blue, cream, deep (inverted), pale accent.
	const tints = ['light-soft', 'ground', 'deep', 'accent-soft', 'light-soft'];

	type Card = {
		key: string;
		href: string;
		title: string;
		area: string;
		when: string;
		format: string;
		cover: string | null;
	};

	// Real upcoming conversations when there are any; otherwise labelled
	// examples, so the page shows what joining looks like.
	const cards = $derived.by<Card[]>(() => {
		if (data.upcoming.length) {
			return data.upcoming.map((c) => ({
				key: c.id,
				href: `/conversations/${c.id}`,
				title: c.title,
				area: c.area,
				when: c.when ? formatHybridDate(c.when) : '',
				format: c.capacity === 1 ? t.formatOneOnOne : t.formatGroup,
				cover: c.cover
			}));
		}
		const areas = data.city === 'amsterdam' ? t.upcomingSampleAreasAmsterdam : t.upcomingSampleAreasBerlin;
		return t.upcomingSampleTitles.map((title, i) => ({
			key: title,
			href: '/signup',
			title,
			area: areas[i] ?? '',
			when: t.upcomingSampleDays[i] ?? '',
			format: i % 2 === 0 ? t.formatOneOnOne : t.formatGroup,
			cover: null
		}));
	});

	// Panel content eases up once as it enters the viewport. The only motion
	// on the page, skipped entirely under prefers-reduced-motion (see CSS).
	function reveal(node: HTMLElement) {
		if (typeof IntersectionObserver === 'undefined') return;
		node.classList.add('pending');
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						node.classList.remove('pending');
						io.disconnect();
					}
				}
			},
			{ rootMargin: '0px 0px -12% 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}
</script>

<svelte:head>
	<title>About · {copy.common.titleSuffix}</title>
	<meta name="description" content={t.metaDescription} />
	<meta property="og:title" content={t.title} />
	<meta property="og:description" content={t.metaDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={t.title} />
	<meta name="twitter:description" content={t.metaDescription} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<!-- One continuous off-white ground. Every section is a rounded block laid
     on it with the same shadow; the nav floats above them all. -->
<div class="about" style:--photo={`url("${bgImageUrl}")`}>
	<nav class="float-nav" aria-label="Main">
		<div class="nav-links">
			<a href="#conversation">{t.navAbout}</a>
			<a href="#how">{t.navHow}</a>
			<a href="#principles">{t.navPrinciples}</a>
		</div>
		<a href="/" class="wordmark" aria-label={`${t.brandName}, home`}>{t.brandName}</a>
		<a href="#upcoming" class="nav-join" aria-label={t.ctaJoin}><span class="join-long">{t.ctaJoin}</span><span class="join-short" aria-hidden="true">{t.navJoinShort}</span></a>
	</nav>

	<main>
		<!-- 1. One sentence, set across the page with photos in its gaps -->
		<section class="block hero deep">
			<h1 class="statement">
				<span class="line line-name">
					<span class="brand">{t.brandName}</span>
					<span class="dots" aria-hidden="true">
						<span class="dot" style:background-image={`url(${crowdImage})`} style:background-position="50% 20%"></span>
						<span class="dot" style:background-image={`url(${roomImage})`} style:background-position="40% 45%"></span>
						<span class="dot" style:background-image={`url(${crowdImage})`} style:background-position="55% 85%"></span>
					</span>
				</span>
				<span class="line to-end">{t.heroLines[0]}</span>
				<span class="line">{t.heroLines[1]}</span>
				<span class="line line-photo">
					<span class="inline-photo" style:background-image={`url(${roomImage})`} aria-hidden="true"></span>
					<span>{t.heroLines[2]}</span>
				</span>
			</h1>
			<div class="hero-foot">
				<p class="lede">{t.heroLede}</p>
				<div class="actions">
					<a href="#upcoming" class="btn btn-solid">{t.ctaJoin}</a>
					<a href="#conversation" class="btn btn-ghost">{t.ctaExplore}</a>
				</div>
			</div>
		</section>

		<!-- The question, on the photo -->
		<section class="block photo tall" use:reveal>
			<h2 class="display">{t.heroHeadline}</h2>
		</section>

		<!-- Where "Join a conversation" lands: what is coming up, by city.
		     City switching is a plain link, so it works without JS. -->
		<section id="upcoming" class="block upcoming" use:reveal>
			<span class="sticker" aria-hidden="true">{t.upcomingSticker}</span>
			<div class="upcoming-head">
				<div>
					<p class="kicker">{t.upcomingKicker}</p>
					<h2 class="headline">{t.upcomingHeadline}</h2>
				</div>
				<nav class="cities" aria-label={t.upcomingCityLabel}>
					{#each data.cities as c (c.key)}
						<a href={`?city=${c.key}#upcoming`} aria-current={c.key === data.city ? 'true' : undefined}>{c.label}</a>
					{/each}
				</nav>
			</div>
			{#if !data.upcoming.length}
				<p class="tag sample-tag">{t.upcomingSampleLabel}</p>
			{/if}
			<!-- A row that scrolls sideways; the second card is the featured one.
			     Inside each card, listing-style: format tag on the photo, when and
			     where, the question, then the two ways in. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<ul class="cards" tabindex="0" aria-label={t.upcomingKicker}>
				{#each cards as c, i (c.key)}
					<li class={`tint-${tints[i % tints.length]}`} class:featured={i === 1}>
						<article class="card">
							<div
								class="card-img"
								style:background-image={`url("${c.cover ?? standIns[i % standIns.length].src}")`}
								style:background-position={c.cover ? 'center' : standIns[i % standIns.length].pos}
							>
								<span class="card-format">{c.format}</span>
							</div>
							<p class="card-meta"><span class="card-when">{c.when}</span><span>{c.area}</span></p>
							<h3 class="card-title"><a href={c.href}>{c.title}</a></h3>
							<!-- One button, two ways in: the halves are separate links. -->
							<div class="card-choice">
								{#if ticketUrl}
									<a href={ticketUrl}>{t.cardTicket}</a>
									<span class="card-or" aria-hidden="true">{t.cardOr}</span>
								{/if}
								<a href="/membership">{t.cardMember}</a>
							</div>
						</article>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Sections share a few long blocks so the colour changes rarely:
		     one paper block for what Dyad does, one deep blue block for what it
		     is learning and how it behaves. -->
		<div class="block">
			<!-- 2. The immediate product -->
			<section id="conversation" class="row" use:reveal>
				<p class="kicker">{t.conversationKicker}</p>
				<div>
					<h2 class="headline">{t.conversationHeadline}</h2>
					<p class="body">{t.conversationBody}</p>
				</div>
			</section>

			<!-- 3. Many conversations: fragments stay visible, loosely grouped -->
			<section class="row" use:reveal>
				<p class="kicker">{t.manyKicker}</p>
				<div>
					<h2 class="headline">{t.manyHeadline}</h2>
					<p class="body">{t.manyBody}</p>
					<ul class="fragments" aria-label={t.illustrativeLabel}>
						{#each t.manyFragments as fragment, i (fragment)}
							<li style:--tilt={`${[-2, 1.5, -1, 2.5, -1.5, 1][i % 6]}deg`}>“{fragment}”</li>
						{/each}
					</ul>
					<p class="tag">{t.illustrativeLabel}</p>
				</div>
			</section>

			<!-- 4. From experience to attention -->
			<section id="how" class="row" use:reveal>
				<p class="kicker">{t.flowKicker}</p>
				<div>
					<ol class="flow">
						{#each t.flowSteps as step, i (step)}
							<li><span class="num">0{i + 1}</span>{step}</li>
						{/each}
					</ol>
					<p class="body">{t.flowNote}</p>
				</div>
			</section>

			<!-- 5. Different, and complementary -->
			<section class="row" use:reveal>
				<p class="kicker">{t.differentKicker}</p>
				<div>
					<ul class="rows">
						{#each t.differentRows as row (row)}
							<li>{row}</li>
						{/each}
					</ul>
					<p class="headline headline-sm">{t.differentDyad}</p>
					<p class="body">{t.differentNote}</p>
				</div>
			</section>
		</div>

		<!-- One quote on the photo -->
		<section class="block photo" use:reveal>
			<figure class="notice">
				<blockquote class="display display-sm">{t.noticeQuote}</blockquote>
				<figcaption class="kicker">{t.noticeSource}</figcaption>
			</figure>
		</section>

		<div class="block deep">
			<!-- 6. What we are learning (illustrative until real data exists) -->
			<section class="row" use:reveal>
				<p class="kicker">{t.learningKicker}</p>
				<div>
					<figure class="heard">
						<figcaption class="heard-label">{t.learningHeard}</figcaption>
						<blockquote class="headline">“{t.learningQuote}”</blockquote>
					</figure>
					<ul class="meta">
						{#each t.learningMeta as line (line)}
							<li>{line}</li>
						{/each}
					</ul>
					<p class="tag">{t.illustrativeLabel}</p>
				</div>
			</section>

			<!-- 8. For institutions -->
			<section class="row" use:reveal>
				<p class="kicker">{t.institutionsKicker}</p>
				<div>
					<h2 class="headline">{t.institutionsHeadline}</h2>
					<p class="body">{t.institutionsBody}</p>
					<ul class="chips">
						{#each t.institutionsList as who (who)}
							<li>{who}</li>
						{/each}
					</ul>
					<a href={`mailto:${t.workEmail}`} class="btn btn-solid">{t.ctaWork}</a>
				</div>
			</section>

			<!-- 9. Principles -->
			<section id="principles" class="row" use:reveal>
				<p class="kicker">{t.principlesKicker}</p>
				<div>
					<p class="body principles-lead">{t.principlesLead}</p>
					<div class="principles">
						<ul>
							{#each t.principlesNo as p (p)}<li>{p}</li>{/each}
						</ul>
						<ul class="yes">
							{#each t.principlesYes as p (p)}<li>{p}</li>{/each}
						</ul>
					</div>
				</div>
			</section>
		</div>

		<!-- 10. Back to the photo -->
		<section class="block photo tall" use:reveal>
			<h2 class="display display-md">{t.finalHeadline}</h2>
			<p class="lede final-body">{t.finalBody}</p>
			<div class="actions">
				<a href="#upcoming" class="btn btn-solid">{t.ctaJoin}</a>
				<a href="/conversations/new" class="btn btn-ghost">{t.ctaHost}</a>
				<a href={`mailto:${t.workEmail}`} class="btn btn-ghost">{t.ctaWork}</a>
			</div>
		</section>
	</main>
</div>

<style>
	/* BBH Hegarty (SIL OFL), self-hosted rather than loaded from Google
	   Fonts, which would observe visitors before consent. Used for the name
	   only; it ships in one weight. */
	@font-face {
		font-family: 'BBH Hegarty';
		src: url('/fonts/BBHHegarty-Regular-latin.woff2') format('woff2');
		font-weight: 400;
		font-display: swap;
	}

	/* Theme-independent, like the landing page: its own palette, not the
	   app's light/dark tokens. */
	.about {
		--ground: #f1eee6;
		--paper: #fffdf8;
		/* Cyanotype: Prussian blue on cream paper. A deep navy that doubles
		   as the ink, a cobalt accent, and the pale blue of the exposure. */
		--deep: #101c3b;
		--accent: #2f4f9e;
		--light: #a9bde6;
		--light-soft: #dfe7f6;
		--accent-soft: #e4e8f2;
		--ink: var(--deep);
		--on-photo: #f3efe4;
		/* Speckle only: noise drives the alpha, so the grain never shifts the
		   base colour. Pale-blue specks for the navy, Prussian specks for cream. */
		--grain-light: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.72  0 0 0 0 0.8  0 0 0 0 0.95  1.8 0 0 0 -0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		--grain-dark: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.06  0 0 0 0 0.11  0 0 0 0 0.23  1.8 0 0 0 -0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		--fallback: linear-gradient(175deg, #101c3b 0%, #2f4f9e 60%, #a9bde6 100%);
		/* The off-white frame around and between blocks. */
		--frame: clamp(8px, 1.2vw, 16px);
		--radius: clamp(16px, 2vw, 28px);
		--pad-x: clamp(1.25rem, 6vw, 7rem);
		--pad-y: clamp(3rem, 12vh, 8rem);
		/* One shadow for every block and the nav: a tight contact line and a
		   wide soft fall, as if each sits on the same off-white table. */
		--lift:
			0 1px 2px rgba(16, 28, 59, 0.06),
			0 8px 20px -6px rgba(16, 28, 59, 0.1),
			0 28px 56px -20px rgba(16, 28, 59, 0.22);

		color: var(--ink);
		font-family: var(--font-serif);
		background: var(--ground);
		padding: var(--frame);
	}

	/* ── Floating nav: centred, above everything, never in the way ── */
	.float-nav {
		position: fixed;
		top: calc(var(--frame) + 8px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		width: min(calc(100% - 4 * var(--frame)), 64rem);
		box-sizing: border-box;
		display: grid;
		/* Equal side columns that may shrink below their content, so the
		   name sits at the exact centre whatever the links weigh. */
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 1rem;
		padding: 0.7rem;
		background: var(--paper);
		border-radius: 16px;
		box-shadow: var(--lift);
	}
	.nav-links {
		display: flex;
		overflow: hidden;
		padding-left: 0.7rem;
		gap: clamp(0.75rem, 1.6vw, 1.4rem);
	}
	.nav-links a {
		color: inherit;
		font-size: 0.92rem;
		text-decoration: none;
		text-underline-offset: 0.25em;
		white-space: nowrap;
	}
	.nav-links a:hover { text-decoration: underline; }
	.join-short { display: none; }
	.wordmark,
	.brand {
		font-family: 'BBH Hegarty', var(--font-serif);
	}
	/* Hegarty runs very wide: set a step smaller than the sentence so the
	   name holds one line beside the photos. */
	.brand {
		font-weight: 400;
		font-size: 0.7em;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}
	.wordmark {
		justify-self: center;
		text-align: center;
		font-size: clamp(1.05rem, 1.5vw, 1.35rem);
		font-weight: 400;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		white-space: nowrap;
		color: inherit;
		text-decoration: none;
	}
	.nav-join {
		justify-self: end;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 1.1rem;
		border-radius: 999px;
		background: var(--deep);
		color: var(--paper);
		font-size: 0.88rem;
		text-decoration: none;
		white-space: nowrap;
	}

	/* ── Blocks ── */
	main {
		display: flex;
		flex-direction: column;
		gap: var(--frame);
	}
	/* Cyanotype grain laid over every block, like the speckle of an
	   exposure. Pointer-events off so it never blocks a link. */
	.block::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		background-image: var(--grain-dark);
		background-size: 120px 120px;
		opacity: 0.07;
	}
	.deep::after {
		background-image: var(--grain-light);
		opacity: 0.16;
	}
	.photo::after { content: none; }
	.block {
		position: relative;
		box-sizing: border-box;
		padding: var(--pad-y) var(--pad-x);
		border-radius: var(--radius);
		background: var(--paper);
		box-shadow: var(--lift);
	}
	/* A long block holds several sections as rows. Label on the left,
	   content on the right: the same 1fr / 3fr grid in every row, so
	   kickers and text line up down the whole page. */
	.row {
		display: grid;
		grid-template-columns: 1fr 3fr;
		gap: 1.5rem var(--pad-x);
		align-items: start;
	}
	.row + .row {
		margin-top: var(--pad-y);
		padding-top: var(--pad-y);
		border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
	}
	.row > .kicker { padding-top: 0.6em; }

	.deep { background: var(--deep); color: var(--paper); }
	.photo {
		color: var(--on-photo);
		text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35);
		background-image:
			linear-gradient(to bottom, rgba(16, 20, 14, 0.2), rgba(16, 20, 14, 0.55)),
			var(--photo),
			var(--fallback);
		background-size: cover;
		background-position: center;
		min-height: clamp(18rem, 55vh, 34rem);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}
	.tall { min-height: clamp(22rem, 80vh, 48rem); }

	/* Content eases up once as it enters the viewport. */
	.block,
	.row {
		transition:
			opacity 0.9s ease,
			transform 0.9s ease;
	}
	.about :global(.pending) {
		opacity: 0;
		transform: translateY(2.5rem);
	}

	/* ── Hero: one sentence, lines stepping left and right ── */
	.hero {
		/* Room for the floating nav above the sentence. */
		padding-top: calc(var(--pad-y) + 3rem);
	}
	/* The welcome is the cyanotype itself: deep Prussian navy, the type
	   in the pale exposure blue fading to cream. */
	.hero.deep .statement { color: var(--paper); }
	.hero.deep .lede { color: var(--light); }
	.statement {
		font-weight: 400;
		font-size: clamp(2.4rem, min(6.6vw, 12vh), 8rem);
		line-height: 1;
		letter-spacing: -0.04em;
		margin: 0;
	}
	.line {
		display: flex;
		align-items: center;
		gap: 0.25em;
	}
	.to-end,
	.line-photo { justify-content: flex-end; }
	.line-name { justify-content: space-between; }
	.dots {
		display: flex;
		gap: 0.2em;
	}
	.dot {
		width: 1.05em;
		height: 1.05em;
		border-radius: 50%;
		background-size: cover;
		box-shadow: var(--lift);
	}
	.inline-photo {
		flex: 1 1 auto;
		max-width: 5em;
		height: 1.05em;
		margin-right: auto;
		border-radius: 8px;
		background-size: cover;
		background-position: 50% 40%;
		box-shadow: var(--lift);
	}
	.hero-foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1.5rem 3rem;
		margin-top: clamp(2rem, 7vh, 4rem);
	}
	.hero-foot .actions { margin-top: 0; }

	/* ── Type ── */
	/* Every headline shares the card titles' face: BBH Hegarty in capitals.
	   It runs wide and ships in one weight, so sizes sit about a third
	   below the old serif headings and nothing is faux-bolded. */
	.display,
	.headline,
	.flow li,
	.principles li {
		font-family: 'BBH Hegarty', var(--font-serif);
		font-weight: 400;
		text-transform: uppercase;
	}
	.display {
		font-size: clamp(1.9rem, min(5.2vw, 9vh), 5.5rem);
		line-height: 1;
		letter-spacing: -0.01em;
		margin: 0;
		max-width: 13ch;
		text-wrap: balance;
	}
	.display-sm {
		font-size: clamp(1.4rem, min(3vw, 5vh), 2.7rem);
		max-width: 22ch;
		line-height: 1.05;
	}
	.display-md {
		font-size: clamp(1.6rem, min(4.2vw, 7vh), 4.2rem);
		max-width: 16ch;
	}
	.lede {
		max-width: 34rem;
		font-size: clamp(1rem, 1.25vw, 1.15rem);
		line-height: 1.35;
		margin: 0;
	}
	.final-body { margin-top: clamp(1rem, 3vh, 1.5rem); }

	.kicker {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		margin: 0;
	}
	.headline {
		font-size: clamp(1.4rem, min(3vw, 5vh), 2.7rem);
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0;
		max-width: 20ch;
		text-wrap: balance;
	}
	.headline-sm {
		font-size: clamp(1.1rem, min(2vw, 3.6vh), 1.8rem);
		max-width: 28ch;
		margin-top: clamp(1.5rem, 5vh, 3rem);
	}
	.body {
		max-width: 34rem;
		font-size: clamp(1rem, 1.2vw, 1.1rem);
		line-height: 1.35;
		margin: clamp(1rem, 3vh, 1.5rem) 0 0;
	}
	.tag {
		display: inline-block;
		margin: clamp(1.25rem, 4vh, 2rem) 0 0;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border: 1px solid currentColor;
		border-radius: 999px;
		padding: 0.35em 0.9em;
	}

	/* ── Upcoming: WePresent-style cards, a tinted frame around each image ── */
	.upcoming-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1.5rem;
		margin-bottom: clamp(2rem, 6vh, 3.5rem);
	}
	.upcoming-head .kicker { margin-bottom: 1rem; }
	.cities {
		display: flex;
		gap: 0.5rem;
	}
	.cities a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 1.2rem;
		border: 1.5px solid currentColor;
		border-radius: 999px;
		color: inherit;
		text-decoration: none;
	}
	.cities a[aria-current] {
		background: var(--deep);
		border-color: var(--deep);
		color: var(--paper);
	}
	.sample-tag { margin: 0 0 1.5rem; }
	/* Sideways row, bleeding to the block's edges, cards of mixed height
	   centred on one line. Scroll-snap keeps a card in view; no autoplay. */
	.cards {
		list-style: none;
		margin: 0 calc(-1 * var(--pad-x));
		padding: 1.5rem var(--pad-x) 2rem;
		display: flex;
		align-items: center;
		gap: clamp(1rem, 2.4vw, 2.5rem);
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding: 0 var(--pad-x);
		scrollbar-width: thin;
	}
	.cards li {
		flex: 0 0 clamp(15rem, 26vw, 23rem);
		scroll-snap-align: start;
	}
	.cards li.featured { flex-basis: clamp(17rem, 30vw, 27rem); }
	.card {
		display: flex;
		flex-direction: column;
		height: 100%;
		box-sizing: border-box;
		padding: clamp(0.75rem, 1.2vw, 1.1rem);
		border-radius: 16px;
		transition: transform 0.25s ease, box-shadow 0.25s ease;
	}
	.card:hover {
		transform: translateY(-4px);
		box-shadow: var(--lift);
	}
	.tint-light-soft .card { background: var(--light-soft); }
	.tint-ground .card { background: var(--ground); }
	.tint-accent-soft .card { background: var(--accent-soft); }
	.tint-deep .card { background: var(--deep); color: var(--paper); }
	.card-img {
		position: relative;
		aspect-ratio: 4 / 3;
		border-radius: 8px;
		background-color: var(--deep);
		background-size: cover;
	}
	.featured .card-img { aspect-ratio: 1 / 1; }
	.card-format {
		position: absolute;
		top: 0.7rem;
		right: 0.7rem;
		padding: 0.3em 0.75em;
		border-radius: 4px;
		background: var(--light);
		color: var(--deep);
		font-size: 0.85rem;
	}
	.card-meta {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 1.1rem 0.4rem 0.5rem;
		font-size: 0.95rem;
	}
	.card-when { font-weight: 700; }
	.card-meta span:last-child { opacity: 0.75; text-align: right; }
	.card-title {
		margin: 0 0.4rem;
		font-family: 'BBH Hegarty', var(--font-serif);
		font-weight: 400;
		font-size: clamp(1.05rem, 1.35vw, 1.3rem);
		line-height: 1.2;
		text-transform: uppercase;
	}
	.featured .card-title { font-size: clamp(1.2rem, 1.6vw, 1.55rem); }
	.card-title a {
		color: inherit;
		text-decoration: none;
	}
	.card-title a:hover { text-decoration: underline; }
	/* Two ways in on one button, pinned to the bottom so rows of cards
	   line up. Each half lights up on its own. */
	.card-choice {
		display: flex;
		align-items: stretch;
		margin: auto 0.4rem 0.4rem;
		border-radius: 6px;
		background: var(--deep);
		color: var(--paper);
		overflow: hidden;
		font-size: clamp(0.7rem, 0.85vw, 0.8rem);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.card-choice a {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 48px;
		padding: 0 0.5rem;
		color: inherit;
		text-align: center;
		text-decoration: none;
		transition: background 0.2s ease;
	}
	.card-choice a:hover { background: var(--accent); }
	.card-or {
		display: flex;
		align-items: center;
		padding: 0 0.2rem;
		font-style: italic;
		text-transform: none;
		letter-spacing: 0;
		opacity: 0.7;
	}
	.card-title { margin-bottom: 1.4rem; }
	.tint-deep .card-choice {
		background: var(--light);
		color: var(--deep);
	}
	.tint-deep .card-choice a:hover { background: var(--paper); }

	/* A round sticker on the block's corner, a little askew. */
	.sticker {
		position: absolute;
		top: clamp(-1rem, -1vw, -0.5rem);
		right: clamp(1rem, 6vw, 6rem);
		z-index: 2;
		display: grid;
		place-items: center;
		width: clamp(7rem, 11vw, 10rem);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--light);
		color: var(--deep);
		font-family: 'BBH Hegarty', var(--font-serif);
		font-size: clamp(0.95rem, 1.4vw, 1.3rem);
		line-height: 1.05;
		text-align: center;
		text-transform: uppercase;
		padding: 1rem;
		box-sizing: border-box;
		transform: rotate(-9deg);
		box-shadow: var(--lift);
	}
	.cards:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: -3px;
	}

	.notice { margin: 0; }
	.notice blockquote { margin: 0; }
	.notice figcaption { margin: clamp(1rem, 3vh, 1.5rem) 0 0; }

	/* Fragments: scraps of speech, slightly askew, still separate. */
	.fragments {
		list-style: none;
		padding: 0;
		margin: clamp(1.5rem, 4vh, 2.5rem) 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem 0.9rem;
	}
	.fragments li {
		background: var(--ground);
		padding: 0.6em 0.9em;
		border-radius: 6px;
		font-size: clamp(0.9rem, 1.1vw, 1rem);
		transform: rotate(var(--tilt));
		box-shadow: 0 1px 2px rgba(16, 28, 59, 0.08), 0 8px 18px -8px rgba(16, 28, 59, 0.35);
		transition: transform 0.3s ease;
	}
	.fragments li:hover {
		transform: rotate(0deg) translateY(-3px);
	}

	.flow {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.2rem;
	}
	.flow li {
		font-size: clamp(1.1rem, min(2.4vw, 4.2vh), 2.1rem);
		line-height: 1.25;
		letter-spacing: -0.01em;
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.flow li:last-child { color: var(--accent); }
	.num {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		opacity: 0.7;
		min-width: 2ch;
	}

	.rows {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.rows li {
		font-size: clamp(1rem, 1.6vw, 1.35rem);
		line-height: 1.35;
		padding: clamp(0.6rem, 1.8vh, 1rem) 0;
		border-top: 1px solid rgba(16, 28, 59, 0.2);
	}
	.rows li:first-child { border-top: 0; padding-top: 0; }

	.heard { margin: 0; }
	.heard-label {
		font-size: 0.8rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		margin-bottom: 1rem;
	}
	.heard blockquote { margin: 0; max-width: 20ch; }
	.meta {
		list-style: none;
		padding: 0;
		margin: clamp(1.5rem, 4vh, 2.5rem) 0 0;
		display: grid;
		gap: 0.4rem;
		font-size: 0.95rem;
	}

	/* Collaborators as outlined pills, like tags on a story. */
	.chips {
		list-style: none;
		padding: 0;
		margin: clamp(1.5rem, 4vh, 2.5rem) 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.chips li {
		border: 1.5px solid currentColor;
		border-radius: 999px;
		padding: 0.55em 1.2em;
		font-size: clamp(0.92rem, 1.1vw, 1.05rem);
	}

	.principles-lead { margin: 0 0 clamp(1.5rem, 5vh, 3rem); }
	.principles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem var(--pad-x);
	}
	.principles ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.principles li {
		font-size: clamp(1rem, 1.7vw, 1.7rem);
		line-height: 1.1;
		letter-spacing: -0.01em;
		margin-bottom: 0.5rem;
	}
	.principles ul:not(.yes) li { color: var(--light); }

	/* ── Buttons: pills, matching the nav ── */
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: clamp(1.5rem, 4vh, 2.5rem);
	}
	.btn {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 1.6rem;
		border-radius: 999px;
		font-size: 0.95rem;
		text-decoration: none;
		text-shadow: none;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}
	.btn-solid {
		background: var(--accent);
		color: var(--paper);
	}
	.deep .btn-solid { background: var(--light); color: var(--deep); }
	.btn-ghost {
		color: inherit;
		border: 1.5px solid currentColor;
	}
	.btn:hover { transform: translateY(-2px); }
	a:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}
	.photo a:focus-visible { outline-color: var(--light); }

	@media (max-width: 1100px) {
		.nav-links { visibility: hidden; }
	}

	@media (max-width: 860px) {
		.row { grid-template-columns: 1fr; }
		.row > .kicker { padding-top: 0; }
		/* Links go, but their column stays so the name remains centred. */
		.nav-links { visibility: hidden; }
	}

	@media (max-width: 640px) {
		.cards li,
		.cards li.featured { flex-basis: 78vw; }
		.principles { grid-template-columns: 1fr; }
		.dots { display: none; }
		.join-long { display: none; }
		.join-short { display: inline; }
		.inline-photo { display: none; }
		.line { flex-wrap: wrap; }
		.to-end,
		.line-photo { justify-content: flex-start; }
	}

	@media (prefers-reduced-motion: reduce) {
		.block,
		.row,
		.fragments li,
		.btn {
			transition: none;
		}
		.about :global(.pending) {
			opacity: 1;
			transform: none;
		}
	}
</style>
