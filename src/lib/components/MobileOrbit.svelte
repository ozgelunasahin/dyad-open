<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ConstellationCard } from '$lib/types/constellation.js';

	interface Props {
		cards: ConstellationCard[];
		onWaitlist?: () => void;
	}
	let { cards, onWaitlist }: Props = $props();

	const GRADIENTS = [
		['#1a1a2e', '#16213e'],
		['#0d1b2a', '#1b263b'],
		['#1b1b2f', '#2e2e4f'],
		['#0f2027', '#203a43'],
		['#1a0533', '#2d1b69'],
		['#0c1821', '#1f3a4a'],
	];

	const orbitCards = cards.slice(0, 14);
	const extraTilts = orbitCards.map(() => (Math.random() - 0.5) * 14);

	let selectedCard = $state<ConstellationCard | null>(null);
	const cardEls = new Map<string, HTMLDivElement>();
	let teaserSection: HTMLElement | null = null;
	let rafId: number;
	let angle = 0;
	let paused = false;

	function tick() {
		if (!paused) angle += 0.004;

		const cx = window.innerWidth / 2;
		const cy = window.innerHeight * 0.46;
		const r = window.innerWidth * 0.44;
		const n = orbitCards.length;

		for (let i = 0; i < n; i++) {
			const el = cardEls.get(orbitCards[i].id);
			if (!el) continue;
			const a = angle + (i / n) * Math.PI * 2;
			const x = cx + r * Math.cos(a);
			const y = cy + r * Math.sin(a);
			const tilt = Math.cos(a) * 15 + extraTilts[i];
			const depth = (Math.sin(a) + 1) / 2;
			const scale = 0.55 + 0.48 * depth;
			const opacity = 0.36 + 0.64 * depth;
			// Pure transform — iOS Safari correctly updates hit-test rects for
			// GPU-composited transforms; left/top changes do not update them
			el.style.transform = `translate(${x - 36}px, ${y - 42}px) rotate(${tilt}deg) scale(${scale})`;
			el.style.opacity = opacity.toFixed(2);
			el.style.zIndex = String(Math.round(depth * 20));
			el.style.boxShadow =
				selectedCard?.id === orbitCards[i].id
					? '0 0 0 2px rgba(255,255,255,0.7), 0 6px 24px rgba(0,0,0,0.6)'
					: '0 4px 18px rgba(0,0,0,0.55)';
		}
		rafId = requestAnimationFrame(tick);
	}

	function registerCard(el: HTMLDivElement, id: string) {
		cardEls.set(id, el);
		return { destroy() { cardEls.delete(id); } };
	}

	function tapCard(card: ConstellationCard) {
		selectedCard = card;
		paused = true;
		// Scroll down to teaser — same pattern as coveomusic.com
		setTimeout(() => {
			teaserSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 40);
	}

	function dismiss() {
		selectedCard = null;
		paused = false;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	onMount(() => {
		rafId = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		cancelAnimationFrame(rafId);
	});
</script>

<!-- ── Section 1: orbit ring (first screen) ── -->
<div class="orbit-section">
	{#each orbitCards as card, i}
		<div
			class="card-thumb"
			use:registerCard={card.id}
			onclick={() => tapCard(card)}
			role="button"
			tabindex={0}
			onkeydown={(e) => e.key === 'Enter' && tapCard(card)}
			aria-label={card.title ?? 'conversation'}
		>
			{#if card.cover_image_url}
				<img src={card.cover_image_url} alt="" class="thumb-img" />
			{:else}
				<div
					class="thumb-gradient"
					style="background: linear-gradient(135deg, {GRADIENTS[i % GRADIENTS.length][0]}, {GRADIENTS[i % GRADIENTS.length][1]})"
				></div>
			{/if}
			{#if card.archived}<div class="arch-pip"></div>{/if}
		</div>
	{/each}

	<div class="orbit-center">
		<p class="tagline">the offline social network<br />owned by its community</p>
		<div class="cta-row">
			<button class="cta cta-primary" onclick={() => onWaitlist?.()}>join</button>
			<a href="/newsletter" class="cta">explore</a>
		</div>
		<p class="orbit-hint">tap a card to read a conversation</p>
	</div>
</div>

<!-- ── Section 2: teaser + footnote (scroll target) ── -->
<section class="teaser-section" bind:this={teaserSection}>
	{#if selectedCard}
		<div class="teaser" role="region" aria-label="conversation preview">
			<button class="teaser-close" onclick={dismiss} aria-label="close">×</button>
			{#if selectedCard.archived}
				<p class="teaser-badge">FROM THE ARCHIVES</p>
			{/if}
			<p class="teaser-title">{selectedCard.title ?? 'Untitled'}</p>
			{#if selectedCard.snippet}
				<p class="teaser-snippet">{selectedCard.snippet}</p>
			{/if}
			<p class="teaser-author">{selectedCard.author_username}</p>
			<button
				class="teaser-cta"
				onclick={() => {
					dismiss();
					onWaitlist?.();
				}}
			>join to read</button>
		</div>
	{/if}

	<div class="footnote">
		<a href="/newsletter" class="fn-link">field notes</a>
		<span class="fn-sep">·</span>
		<a href="/why" class="fn-link">steward ownership</a>
		<span class="fn-sep">·</span>
		<a href="/why" class="fn-link">participatory governance</a>
		<span class="fn-sep">·</span>
		<span class="fn-text">community care</span>
		<span class="fn-sep">·</span>
		<span class="fn-text">currently in beta in berlin</span>
	</div>
</section>

<!-- ── Zine content sections ── -->
<div class="zine-sections">

	<!-- ── FIELD NOTES: essays ── -->
	<section class="zine-area" id="field-notes">
		<p class="area-label">field notes</p>
		<p class="area-sub">Field notes on building social technology as civic infrastructure.</p>

		<article class="essay-card">
			<p class="essay-num">01</p>
			<h3 class="essay-title">Embedding care into the infrastructure</h3>
			<p class="essay-lede">Dyad began from a state of disillusionment that came through my own experience with harassment online, and with the strange powerlessness I mistook, at first, as personal. At the very moment I needed support, the platforms I relied on revealed the distance they had built between themselves and the people who depend on them.</p>
			<p class="essay-body">What I experienced as abandonment was not a glitch. It was a structural omission. These platforms are not accidentally producing harm — they are working exactly as they were built to work. The problem is systemic, and so must be the response.</p>
			<p class="essay-body">Dyad begins from this old premise in a new condition: an online software to help us find one another for conversations in real life, under a structure of collective ownership, participatory governance, and open infrastructure.</p>
			<p class="essay-attr">— Luna Sahin, Co-founder & Steward</p>
		</article>

		<article class="essay-card">
			<p class="essay-num">02</p>
			<h3 class="essay-title">A systemic diagnosis</h3>
			<p class="essay-lede">Climate online has grown increasingly commodified and hostile. The desire to connect and exchange, once held as the emancipatory promise of the World Wide Web, is now met by systems that capture and translate our lives into data, extracting from our relationships, expressions, and attention in ways that mirror colonial patterns of appropriation.</p>
			<p class="essay-body">The scale and scope of the harm is difficult to overstate. From loneliness and declining mental health, to information warfare, political polarization, and the erosion of trust in institutions — the effects of opaque and self-serving social technology corporations reach far beyond the screen.</p>
			<p class="essay-body">We understand this persistence as evidence of a deeper structural problem. We are therefore not interested in one-off interventions, nor in building a gentler interface on top of the same underlying logic.</p>
		</article>

		<article class="essay-card">
			<p class="essay-num">03</p>
			<h3 class="essay-title">Why ownership matters</h3>
			<p class="essay-lede">Every company eventually faces the same question: Whose interests are represented in decision making when tradeoffs arise? Ownership answers this question at the deepest level. It determines who holds ultimate control, what the company is formally arranged to serve, and what cannot easily be overridden when pressure mounts.</p>
			<p class="essay-body">In a conventional shareholder company, capital has formal standing that communities do not. For social technologies, this creates a structural mismatch. The value of a platform emerges through participation, trust, moderation, relationships, and community life — yet the people who help create those conditions are often left outside the ownership structures that govern the systems they depend on.</p>
		</article>

		<article class="essay-card">
			<p class="essay-num">04</p>
			<h3 class="essay-title">Community building as a social experiment</h3>
			<p class="essay-lede">Our lived experiences organizing as communities for different intentions have presented us a valuable view of community building. We see communities as microcosms of society, and in that, a chance to rehearse another set of organizing principles for collective living.</p>
			<p class="essay-body">Our long-term theory of change begins with the ability to be with one another across difference. Not to collapse differences into agreement, but to stay in contact long enough to notice what our own vantage point cannot see. We believe this capacity is vital for discernment, truth-seeking, and a richer engagement with life.</p>
		</article>

		<article class="essay-card">
			<p class="essay-num">05</p>
			<h3 class="essay-title">Holding space online</h3>
			<p class="essay-lede">We started this zine with the harms that brought us here. The exhaustion, hostility, harm, and erosion of trust we have experienced and witnessed are not abstract to us. They have been foundational parts of why Dyad exists.</p>
			<p class="essay-body">The places where we meet others online are part of public life. Communal living has always come with shared understandings, boundaries, agreements, and forms of accountability. The digital realm will not be an exception. Consideration of safeguarding cannot be secondary.</p>
			<p class="essay-body">So in all our effort to be good hosts, we begin with responsibility, not certainty.</p>
		</article>
	</section>

	<!-- ── STEWARD OWNERSHIP ── -->
	<section class="zine-area" id="steward-ownership">
		<p class="area-label">steward ownership</p>
		<blockquote class="area-quote">"Ownership determines whose interests prevail." — Marjorie Kelly</blockquote>

		<p class="zine-body">Ownership structures shape incentives, incentives shape behavior, and behavior shapes outcomes. Most social platforms are ultimately accountable to shareholders, meaning their decisions are structurally pushed toward growth, engagement, and financial return — even when this comes at the expense of user wellbeing, community trust, or public safety.</p>

		<p class="zine-body">If we want different outcomes, we must begin with different ownership structures.</p>

		<p class="zine-body">Dyad is committed to transitioning into steward ownership: separating control from capital so the company's purpose cannot be overridden by investor interests. This means putting decision-making structures in place without investor control, while developing participatory governance practices through which active community members can gain representation in the decisions that shape the platform.</p>

		<h3 class="zine-h3">What is steward ownership?</h3>
		<p class="zine-body">Steward ownership is a model in which a company is governed in service of its mission rather than in service of external owners. It rests on two principles.</p>
		<p class="zine-body">The first is self-governance: voting rights and economic rights are separated. Those who run and maintain the company — its stewards — hold decision-making authority. Investors and funders may participate in defined financial returns, but they do not hold governance power over the company.</p>
		<p class="zine-body">The second is profit-for-purpose: profit is treated as a means to serve the company's purpose, not as the purpose itself. Asset-lock mechanisms prevent the company from being sold, stripped, or restructured in ways that would abandon its founding purpose. This is sometimes called the eternity guarantee.</p>

		<h3 class="zine-h3">Objectives of our model</h3>
		<p class="zine-body">Our platform should remain dedicated to strengthening real-world conversations, community participation, and collective sensemaking — regardless of future leadership, funding, or market pressures. Those responsible for maintaining and improving the platform should hold decision-making authority. Governance should remain in the hands of active stewards rather than passive capital owners.</p>
		<p class="zine-body">Trust requires visibility. Dyad is open source. We maintain a culture of writing through public documentation, changelogs, decision logs, and transparency reports. Wherever possible, we seek to make the reasoning behind our decisions visible to the people affected by them.</p>
	</section>

	<!-- ── PARTICIPATORY GOVERNANCE ── -->
	<section class="zine-area" id="governance">
		<p class="area-label">participatory governance</p>
		<blockquote class="area-quote">"To maintain the faith that democracy requires, as well as the skills it demands, people need to experience co-governance in their daily lives. They need to see it work and feel their own power." — Nathan Schneider</blockquote>

		<p class="zine-body">Online spaces have become places we live in, but not places we govern. In communities, workplaces, and associations, we expect ways to be heard, disagree, decide, and revise decisions together. Online, rules often change without participation, moderation happens behind closed doors, and the people most affected rarely have a way to shape decisions.</p>

		<p class="zine-body">Governance is not a back-office function. It is a visible and accessible part of what the platform is. Members participate in the life of the platform and have a voice in the decisions that shape it. Stewards are members entrusted with maintaining the health of the platform — not as executives, but as custodians. They uphold shared norms, facilitate moderation, and help carry out decisions made collectively.</p>

		<h3 class="zine-h3">Governance structure</h3>
		<p class="zine-body">Dyad is built around two roles with distinct relationships to governance: members and stewards. Dyad distinguishes between three kinds of decisions. Operational decisions (day-to-day development, moderation, community support) are handled by the team. Strategic decisions (priorities, partnerships, significant product directions) are made by stewards, informed by member input through Sounding Boards and the Assembly. Fundamental decisions (changes to governance structure or bylaws, elections of stewards, decisions about the future of Dyad) require a vote from the membership.</p>

		<h3 class="zine-h3">What we are starting with</h3>
		<p class="zine-body">We are beginning with governance practices we can actually run from the start: clear roles, Sounding Boards, regular Assemblies, public documentation, and defined decision rights. Sounding Boards are open working groups where members can contribute ideas, feedback, and expertise on specific topics — the bridge between everyday participation and formal proposals. The Assembly is a recurring process through which members help determine priorities, review platform health, and guide Dyad's development. It is intended to function as an ongoing civic process, not a one-time vote.</p>
		<p class="zine-body">We are launching Dyad's monthly Assembly process on 24 June at 17:00 CET. This will be our first recurring space for members, contributors, and interested parties to help shape Dyad in practice. Assembly is where the model begins to be practiced.</p>
	</section>

	<!-- ── COMMUNITY CARE ── -->
	<section class="zine-area" id="community-care">
		<p class="area-label">community care</p>
		<blockquote class="area-quote">"Really to care is to care as you would for a tree or a plant, watering it, studying its needs, the best soil for it, looking after it with gentleness and tenderness." — Krishnamurti</blockquote>

		<p class="zine-body">The places where we meet others online are part of public life. They may not look like streets, libraries, or community spaces, but they increasingly serve similar functions. People gather there, speak there, organize there, disagree there, find belonging there, and become visible to one another there. Yet our language, principles, and practices for public space, civic responsibility, and communal life has not fully caught up with the digital realm.</p>

		<p class="zine-body">Communal living has always come with shared understandings, boundaries, agreements, and forms of accountability. The digital realm will not be an exception. Consideration of safeguarding cannot be secondary.</p>

		<h3 class="zine-h3">Our approach</h3>
		<p class="zine-body">We are inspired by Glitch's principle that safety infrastructure should be designed from the margins inward, not the centre outward. Designing for the most exposed member raises the floor for everyone, while designing for the average member protects only those already protected. This means paying particular attention to the experiences of people who are more likely to encounter harassment, discrimination, exclusion, coercion, or abuse.</p>
		<p class="zine-body">Rather than asking members to trust us indefinitely, we aim to create a system that requires as little blind trust as possible. Open source infrastructure, transparent governance, community participation, and our commitment to steward ownership are all attempts to distribute power, increase accountability, and reduce dependence on any single group of people — including ourselves.</p>

		<h3 class="zine-h3">Community guidelines</h3>
		<p class="zine-body">Dyad exists to help people meet for meaningful in-person conversations. The purpose of our guidelines is not ideological conformity. It is to create the conditions for encounters across difference, which cannot happen without a baseline of mutual care. We ask members to approach one another with curiosity, reciprocity, respect, consent, and accountability. Members should be able to disagree, ask difficult questions, and bring different experiences into conversation without being harassed, coerced, exposed, or exploited.</p>
		<p class="zine-body">These guidelines are living documents. They will change as the community grows, as new harms become visible, and as we learn what our current process fails to see.</p>
	</section>

	<div class="zine-colophon">
		<p>DYAD — Draft Edition, June 2026<br />Field notes on building social technology as civic infrastructure.</p>
	</div>

</div>

<style>
	/* ── Orbit section — full screen, no overflow clipping ── */
	.orbit-section {
		position: relative;
		height: 100vh;
		height: 100svh;
		background: #06060a;
	}

	.card-thumb {
		position: absolute;
		left: 0;
		top: 0;
		width: 72px;
		height: 84px;
		border-radius: 14px;
		overflow: hidden;
		cursor: pointer;
		will-change: transform, opacity;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		transition: box-shadow 0.15s;
	}

	.thumb-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		pointer-events: none;
	}

	.thumb-gradient {
		width: 100%;
		height: 100%;
	}

	.arch-pip {
		position: absolute;
		bottom: 6px;
		right: 7px;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.55);
	}

	/* ── Center content ── */
	.orbit-center {
		position: absolute;
		top: 46%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		z-index: 30;
		width: 220px;
		pointer-events: none;
	}

	.orbit-center .cta-row,
	.orbit-center .orbit-hint {
		pointer-events: auto;
	}

	.tagline {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.78rem;
		font-weight: 500;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 16px;
		letter-spacing: -0.02em;
	}

	.cta-row {
		display: flex;
		gap: 24px;
		align-items: baseline;
		justify-content: center;
		margin-bottom: 20px;
	}

	.cta {
		background: none;
		border: none;
		cursor: pointer;
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.68rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.35);
		padding: 0;
		text-decoration: none;
		letter-spacing: 0.04em;
		-webkit-tap-highlight-color: transparent;
	}

	.cta-primary {
		color: rgba(255, 255, 255, 0.7);
	}

	.orbit-hint {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.2);
		margin: 0;
	}

	/* ── Section 2: teaser + footnote ── */
	.teaser-section {
		background: #06060a;
		padding: 0 24px 60px;
		min-height: 60vh;
	}

	.teaser {
		position: relative;
		padding: 40px 0 32px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		animation: fade-up 0.22s ease;
	}

	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.teaser-close {
		position: absolute;
		top: 36px;
		right: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: none;
		color: rgba(255, 255, 255, 0.4);
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.teaser-badge {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.28);
		margin: 0 0 10px;
	}

	.teaser-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.15rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 12px;
		line-height: 1.3;
		padding-right: 36px;
	}

	.teaser-snippet {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.85rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.45);
		margin: 0 0 12px;
		line-height: 1.7;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.teaser-author {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.24);
		margin: 0 0 20px;
	}

	.teaser-cta {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.16);
		color: rgba(255, 255, 255, 0.55);
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.06em;
		padding: 9px 20px;
		border-radius: 100px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.teaser-cta:active {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}

	/* ── Zine sections ── */
	.zine-sections {
		background: #06060a;
	}

	.zine-area {
		padding: 56px 24px 48px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.area-label {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.3);
		margin: 0 0 20px;
	}

	.area-sub {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.9rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.35);
		line-height: 1.6;
		margin: 0 0 40px;
		font-style: italic;
	}

	.area-quote {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.95rem;
		font-weight: 300;
		font-style: italic;
		color: rgba(255, 255, 255, 0.45);
		line-height: 1.65;
		border-left: 1px solid rgba(255, 255, 255, 0.12);
		margin: 0 0 36px;
		padding-left: 18px;
	}

	/* Essay cards (field notes) */
	.essay-card {
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		padding: 32px 0 28px;
	}

	.essay-card:first-of-type {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.essay-num {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.18);
		margin: 0 0 10px;
	}

	.essay-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.15rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.88);
		margin: 0 0 14px;
		line-height: 1.25;
	}

	.essay-lede {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.88rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.7;
		margin: 0 0 12px;
	}

	.essay-body {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.82rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.4);
		line-height: 1.75;
		margin: 0 0 10px;
	}

	.essay-attr {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.2);
		margin: 14px 0 0;
	}

	/* Body text (non-essay sections) */
	.zine-body {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.88rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.75;
		margin: 0 0 18px;
	}

	.zine-h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.75);
		margin: 32px 0 14px;
		line-height: 1.3;
	}

	.zine-colophon {
		padding: 40px 24px 80px;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.zine-colophon p {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.14);
		line-height: 1.8;
		margin: 0;
	}

	/* ── Footnote ── */
	.footnote {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		padding-top: 32px;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.fn-link,
	.fn-text {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.22);
		letter-spacing: 0.06em;
		text-decoration: none;
		white-space: nowrap;
	}

	.fn-link {
		color: rgba(255, 255, 255, 0.4);
	}

	.fn-sep {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.1);
		padding: 0 7px;
	}
</style>
