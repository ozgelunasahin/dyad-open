<script lang="ts">
	import { copy } from '$lib/copy';
	import { storageUrl } from '$lib/utils/storage-url';
	import { SAMPLE_CONVERSATIONS, type SampleImage } from '$lib/mock/sample-conversations';
	import AboutNav from '$lib/components/AboutNav.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const t = copy.about;
	const images: Record<SampleImage, string> = {
		crowd: '/images/log-in.jpeg',
		room: '/images/sign-in.jpeg',
		landscape: storageUrl('newsletter assets', 'landing page.jpg')
	};

	const c = $derived(data.conversation);
	const area = $derived(data.city === 'amsterdam' ? c.areaAmsterdam : c.areaBerlin);
	const seatsLeft = $derived(c.seats - c.taken);
	const others = $derived(SAMPLE_CONVERSATIONS.filter((o) => o.slug !== c.slug).slice(0, 3));
	const navItems = $derived(
		SAMPLE_CONVERSATIONS.map((o) => ({
			href: `/about/conversations/${o.slug}`,
			title: o.title,
			meta: `${o.when} · ${data.city === 'amsterdam' ? o.areaAmsterdam : o.areaBerlin}`,
			text: o.why
		}))
	);
	const who = $derived(c.format === 'one-on-one' ? t.detailWhoPair : t.detailWhoGroup(c.seats));
</script>

<svelte:head>
	<title>{c.title} · {t.brandName}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
	<AboutNav items={navItems} base="/about" />

	<main>
		<!-- Hero: photo, then the title and the one action -->
		<header class="block hero">
			<div
				class="photo"
				style:background-image={`url("${images[c.image]}")`}
				style:background-position={c.imagePos}
				aria-hidden="true"
			>
				<span class="format">{c.format === 'one-on-one' ? t.formatOneOnOne : t.formatGroup}</span>
			</div>
			<div class="head">
				<p class="kicker">{c.when} · {area}</p>
				<h1 class="display">{c.title}</h1>
				<div class="cta-row">
					<a class="btn btn-solid" href="/membership">{t.detailCta}</a>
					<span class="seats">{t.detailSeatsLeft(seatsLeft)}</span>
				</div>
			</div>
		</header>

		<!-- Practical facts, set apart like a ticket stub -->
		<section class="block facts" aria-label="Details">
			<dl>
				<div><dt>{t.detailFacts.when}</dt><dd>{c.date}<br />{c.time}</dd></div>
				<div><dt>{t.detailFacts.where}</dt><dd>{area}<br /><span class="muted">{t.detailWhereNote}</span></dd></div>
				<div><dt>{t.detailFacts.who}</dt><dd>{who}</dd></div>
				<div><dt>{t.detailFacts.length}</dt><dd>{c.duration}</dd></div>
			</dl>
		</section>

		<section class="block prose">
			<div class="col">
				<h2 class="label">{t.detailWhyHeading}</h2>
				<p class="lead">{c.why}</p>
			</div>
			<div class="col">
				<h2 class="label">{t.detailBringHeading}</h2>
				<p class="lead">{c.bring}</p>
			</div>
		</section>

		<section class="block deep">
			<h2 class="label">{t.detailHowHeading}</h2>
			<ol class="steps">
				{#each t.detailHow as step, i}
					<li><span class="n">{i + 1}</span><span>{step}</span></li>
				{/each}
			</ol>
			<h2 class="label after">{t.detailAfterHeading}</h2>
			<p class="lead">{t.detailAfter}</p>
		</section>

		<section class="block prose">
			<div class="col">
				<h2 class="label">{t.detailHostHeading}</h2>
				<p class="host-name">{c.host.name}</p>
				<p class="lead">{c.host.line}</p>
			</div>
			<div class="col">
				<h2 class="label">{t.detailFaqHeading}</h2>
				<dl class="faq">
					{#each t.detailFaq as [q, a]}
						<dt>{q}</dt>
						<dd>{a}</dd>
					{/each}
				</dl>
			</div>
		</section>

		<section class="block more">
			<h2 class="label">{t.detailMoreHeading}</h2>
			<ul>
				{#each others as o}
					<li>
						<a href={`/about/conversations/${o.slug}`}>
							<span class="more-when">{o.when} · {data.city === 'amsterdam' ? o.areaAmsterdam : o.areaBerlin}</span>
							<span class="more-title">{o.title}</span>
						</a>
					</li>
				{/each}
			</ul>
			<p class="note">{t.detailSampleNote}</p>
		</section>
	</main>
</div>

<style>
	@font-face {
		font-family: 'BBH Hegarty';
		src: url('/fonts/BBHHegarty-Regular-latin.woff2') format('woff2');
		font-weight: 400;
		font-display: swap;
	}

	/* Same cyanotype palette and block language as /about. */
	.page {
		--ground: #f1eee6;
		--paper: #fffdf8;
		--deep: #101c3b;
		--accent: #2f4f9e;
		--light: #a9bde6;
		--light-soft: #dfe7f6;
		--ink: var(--deep);
		--frame: clamp(8px, 1.2vw, 16px);
		--radius: clamp(16px, 2vw, 28px);
		--pad-x: clamp(1.25rem, 6vw, 7rem);
		--pad-y: clamp(2.5rem, 8vh, 6rem);
		--lift:
			0 1px 2px rgba(16, 28, 59, 0.06),
			0 8px 20px -6px rgba(16, 28, 59, 0.1),
			0 28px 56px -20px rgba(16, 28, 59, 0.22);
		color: var(--ink);
		font-family: var(--font-serif);
		background: var(--ground);
		padding: var(--frame);
		min-height: 100vh;
		box-sizing: border-box;
	}
	main { display: grid; gap: var(--frame); }
	:global(body) { background: var(--ground); }

	.block {
		background: var(--paper);
		border-radius: var(--radius);
		box-shadow: var(--lift);
		padding: var(--pad-y) var(--pad-x);
	}
	.deep { background: var(--deep); color: var(--paper); }

	/* Hero: photo left, title right; stacked on phones. */
	.hero {
		margin-top: 5.5rem;
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: clamp(1.5rem, 4vw, 4rem);
		align-items: end;
		padding: clamp(1.25rem, 3vw, 2.5rem);
	}
	.photo {
		position: relative;
		aspect-ratio: 4 / 3;
		border-radius: calc(var(--radius) - 8px);
		background-color: var(--deep);
		background-size: cover;
	}
	.format {
		position: absolute;
		top: 0.9rem;
		right: 0.9rem;
		background: var(--light);
		color: var(--deep);
		font-size: 0.85rem;
		padding: 0.3em 0.8em;
		border-radius: 6px;
	}
	.head { padding-bottom: 0.5rem; }
	.kicker { margin: 0 0 1rem; font-size: 1rem; opacity: 0.75; }
	.display {
		font-family: 'BBH Hegarty', var(--font-serif);
		font-weight: 400;
		text-transform: uppercase;
		font-size: clamp(1.7rem, min(4.2vw, 8vh), 4.2rem);
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0;
		text-wrap: balance;
	}
	.cta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem 1.25rem;
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
		transition: transform 0.2s ease;
	}
	.btn-solid { background: var(--accent); color: var(--paper); }
	.btn:hover { transform: translateY(-2px); }
	.seats { font-size: 0.95rem; opacity: 0.8; }

	/* Facts: the practical details, in a tinted stub. */
	.facts { background: var(--light-soft); padding-block: clamp(1.5rem, 4vh, 2.5rem); }
	.facts dl {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1.5rem 2rem;
	}
	.facts dt, .label {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.7;
		margin: 0 0 0.5rem;
		font-weight: 400;
	}
	.facts dd { margin: 0; font-size: 1.1rem; line-height: 1.35; }
	.muted { font-size: 0.85rem; opacity: 0.7; }

	.prose {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(2rem, 6vw, 6rem);
	}
	.lead { font-size: clamp(1.1rem, 1.6vw, 1.45rem); line-height: 1.4; margin: 0; max-width: 34ch; }
	.host-name {
		font-family: 'BBH Hegarty', var(--font-serif);
		text-transform: uppercase;
		font-size: 1.6rem;
		margin: 0 0 0.75rem;
	}
	.faq { margin: 0; }
	.faq dt { font-size: 1.1rem; margin-top: 1.1rem; }
	.faq dt:first-child { margin-top: 0; }
	.faq dd { margin: 0.25rem 0 0; opacity: 0.8; line-height: 1.45; max-width: 36ch; }

	.deep .label { color: var(--light); opacity: 1; }
	.label.after { margin-top: clamp(2rem, 5vh, 3.5rem); }
	.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.1rem; max-width: 40rem; }
	.steps li { display: grid; grid-template-columns: 2.2rem 1fr; align-items: baseline; font-size: clamp(1.05rem, 1.5vw, 1.3rem); line-height: 1.4; }
	.n { font-family: 'BBH Hegarty', var(--font-serif); color: var(--light); }

	.more ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}
	.more a {
		display: grid;
		gap: 0.5rem;
		padding: 1.2rem;
		background: var(--light-soft);
		border-radius: 12px;
		color: inherit;
		text-decoration: none;
		height: 100%;
		box-sizing: border-box;
	}
	.more a:hover { background: var(--light); }
	.more-when { font-size: 0.9rem; opacity: 0.75; }
	.more-title {
		font-family: 'BBH Hegarty', var(--font-serif);
		text-transform: uppercase;
		font-size: 1.05rem;
		line-height: 1.15;
	}
	.note { margin: 1.5rem 0 0; font-size: 0.85rem; opacity: 0.6; }

	a:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }

	@media (max-width: 900px) {
		.hero, .prose { grid-template-columns: 1fr; }
		.facts dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.more ul { grid-template-columns: 1fr; }
	}
</style>
