<script lang="ts">
	import { onMount } from 'svelte';

	const ids = ['why', 'what', 'objectives', 'model', 'raise', 'key-elements'];
	let activeId = $state('');

	function isPast(id: string): boolean {
		const ai = ids.indexOf(activeId);
		const ii = ids.indexOf(id);
		return ai > 0 && ii < ai;
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) activeId = e.target.id;
				}
			},
			{ rootMargin: '-10% 0px -85% 0px', threshold: 0 }
		);
		for (const id of ids) {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		}
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>Steward Ownership — dyad.</title>
	<meta name="description" content="Dyad is committed to transitioning into steward ownership — separating control from capital so the company's purpose cannot be overridden by investor interests." />
</svelte:head>

<div class="page">

	<div class="page-intro">
		<p class="section-label">Steward Ownership</p>
		<h1 class="page-title">Ownership determines<br />whose interests prevail.</h1>
		<p class="page-attr">— Marjorie Kelly</p>
	</div>

	<div class="page-body">

		<nav class="toc">
			<p class="toc-label">In this section</p>
			<ol class="toc-list">
				<li><a href="#why" class:active={activeId === 'why'} class:past={isPast('why')}>Why ownership matters</a></li>
				<li><a href="#what" class:active={activeId === 'what'} class:past={isPast('what')}>What is steward ownership?</a></li>
				<li><a href="#objectives" class:active={activeId === 'objectives'} class:past={isPast('objectives')}>Objectives of our model</a></li>
				<li><a href="#model" class:active={activeId === 'model'} class:past={isPast('model')}>How our model works</a></li>
				<li><a href="#raise" class:active={activeId === 'raise'} class:past={isPast('raise')}>How we raise</a></li>
				<li><a href="#key-elements" class:active={activeId === 'key-elements'} class:past={isPast('key-elements')}>Key elements</a></li>
			</ol>
		</nav>

		<div class="prose">

			<section id="why">
				<h2 class="section-h2">Why ownership matters</h2>

				<p>Every company eventually faces the same question: Whose interests are represented in decision making when tradeoffs arise?</p>

				<p>Ownership answers this question at the deepest level. It determines who holds ultimate control, what the company is formally arranged to serve, and what cannot easily be overridden when pressure mounts. Governance answers a second question: who has voice, responsibility, and representation within that structure.</p>

				<p>In a conventional shareholder company, capital has formal standing that communities do not. For many businesses, this arrangement may seem fitting. For social technologies, it creates a structural mismatch. The value of a platform emerges through participation, trust, moderation, relationships, and community life, yet the people who help create those conditions are often left outside the ownership structures that govern the systems they depend on.</p>

				<p>We believe ownership structures and practices should reflect how value is actually created. If communities play a meaningful role in building and sustaining a platform, they should have meaningful ways to participate in shaping its future.</p>

				<p>This is why steward ownership matters to us. It separates control from capital, protects the company's purpose from purely extractive incentives, and creates a foundation on which more participatory forms of governance can grow.</p>

				<p>Ownership structures shape incentives, incentives shape behavior, and behavior shapes outcomes. Most social platforms are ultimately accountable to shareholders, meaning their decisions are structurally pushed toward growth, engagement, and financial return — even when this comes at the expense of user wellbeing, community trust, or public safety. If we want different outcomes, we must begin with different ownership structures.</p>

				<p>Dyad is committed to transitioning into steward ownership: separating control from capital so the company's purpose cannot be overridden by investor interests. This means putting decision-making structures in place without investor control, while developing participatory governance practices through which active community members can gain representation in the decisions that shape the platform.</p>
			</section>

			<section id="what">
				<h2 class="section-h2">What is steward ownership?</h2>

				<p>Steward ownership is a model in which a company is governed in service of its mission rather than in service of external owners. The company, in a meaningful sense, is held for its purpose.</p>

				<p>It rests on two principles.</p>

				<p>The first is <strong>self-governance</strong>. In a steward-owned company, voting rights and economic rights are separated. Those who run and maintain the company, its stewards, hold decision-making authority. Investors and funders may participate in defined financial returns, but they do not hold governance power over the company. Responsibility and control rest with people actively accountable to the mission, not with absentee capital owners.</p>

				<p>The second is <strong>profit-for-purpose</strong>. Profit is treated as a means to serve the company's purpose, not as the purpose itself. Any profits withdrawn from the company are limited, whether by amount, time, or agreed return structure, and the remainder is reinvested in service of the mission. Asset-lock mechanisms prevent the company from being sold, stripped, or restructured in ways that would abandon its founding purpose. These commitments are not merely policies that future management can revise. They are written into the company's legal architecture and protected through binding governance structures, often including an independent foundation or veto share. This is sometimes called the eternity guarantee.</p>

				<p>Because the company does not rely on selling control rights to capital, it is not structurally oriented toward a traditional exit: no acquisition, no IPO, no liquidity event designed to maximize returns for shareholders at scale. This removes one of the most common mechanisms by which mission-driven companies are eventually redirected toward extraction.</p>
			</section>

			<section id="objectives">
				<h2 class="section-h2">Objectives of our model</h2>

				<div class="objectives-grid">
					<div class="objective">
						<h3>Protect the Mission</h3>
						<p>The platform should remain dedicated to strengthening real-world conversations, community participation, and collective sensemaking regardless of future leadership, funding, or market pressures.</p>
					</div>
					<div class="objective">
						<h3>Align Control With Responsibility</h3>
						<p>Those responsible for maintaining and improving the platform should hold decision-making authority. Governance should remain in the hands of active stewards rather than passive capital owners.</p>
					</div>
					<div class="objective">
						<h3>Ensure Long-Term Financial Sustainability</h3>
						<p>Dyad should be able to attract funding, compensate contributors, and sustain operations without requiring an extractive business model or a traditional venture-backed exit.</p>
					</div>
					<div class="objective">
						<h3>Open Source & Transparency</h3>
						<p>Trust requires visibility. Dyad is open source, allowing our codebase to be inspected, improved, and built upon by others. We maintain a culture of writing through public documentation, changelogs, decision logs, and transparency reports.</p>
					</div>
					<div class="objective">
						<h3>Create a Replicable Model</h3>
						<p>Our ambition extends beyond building a single community. Through open-source software, steward ownership, participatory governance, and transparent documentation, we hope to contribute to a growing commons of tools and institutions that others can build upon.</p>
					</div>
				</div>
			</section>

			<section id="model">
				<h2 class="section-h2">How our model works</h2>

				<p>For Dyad, steward ownership means separating control from capital so the company can be governed in service of its mission rather than external ownership. The company, in a meaningful sense, is held for its purpose.</p>

				<p>In practice, this means that voting rights and economic rights will be separated. Decision-making authority will sit with stewards: people actively accountable to Dyad's mission. Investors and funders may participate in defined financial returns, but they will not hold governance power over the company. Capital can help Dyad come into being, but it should not determine what Dyad is ultimately for.</p>

				<p>We are currently raising pre-seed funding while committing to a transition into steward ownership. We are not making the full transition immediately because we first need to prove the product, bring the company into operational reality, and understand more precisely what needs to be protected. In conversation with Purpose Foundation and brafe.space, we came to the conclusion that the most responsible path is to make the commitment binding now and complete the structural transition at seed stage.</p>

				<p>This commitment is being written into our investor agreements from the beginning, so early funders cannot block the transition when we restructure. At that point, Dyad will move into a steward-owned structure with three steward classes: steward founders, steward team members, and steward members/users.</p>

				<p>Each class represents a different form of responsibility: those who initiated the work, those who maintain and develop it, and those who participate in the community it serves. Stewards may participate in capped economic rights, but no steward will hold an unlimited claim on the value Dyad creates.</p>

				<p>The purpose of this structure is to make Dyad hard to redirect toward extraction. We want to build a company that can raise the capital it needs, reward the people who take risks to make it possible, and still protect the mission from becoming subordinate to exit pressure, investor control, or unlimited private upside.</p>
			</section>

			<section id="raise">
				<h2 class="section-h2">How we raise</h2>

				<p>Building meaningful alternatives to incumbent platforms requires resources. We need to compensate high-quality talent, build and maintain a strong product, support community operations, and communicate the work well enough for the right people to find it. Underfunding the work would not make Dyad more principled. It would make it harder to build at the level our mission requires.</p>

				<p>At the same time, we are careful about where money comes from and what it asks of us. We do not want to solve the resource problem by introducing incentives that later compromise the platform, the community, or the mission. For us, fundraising is therefore not only a financial question. It is a design question.</p>

				<p>We are currently prioritizing creative, non-extractive financing paths. Inspired by the work of the VYLD team and Purpose Foundation, we are exploring future profit participation agreements rather than traditional equity. In this model, funders provide capital in exchange for a share of future profits up to an agreed multiple of their investment. Once that multiple is reached, the agreement concludes. Funders do not receive voting rights, governance authority, or ownership of Dyad.</p>

				<p>This allows us to attract patient, mission-aligned capital without transferring control of the platform. It treats investment as participation in the success of the mission rather than a claim on the company's future direction.</p>

				<p>The same principle applies internally. Founders, team members, and stewards may receive capped economic rights, but no individual, whether inside or outside the organization, holds an unlimited claim on Dyad's future value.</p>
			</section>

			<section id="key-elements">
				<h2 class="section-h2">Key elements</h2>

				<div class="elements-grid">
					<div class="element">
						<h3>Separation of Voting & Economic Rights</h3>
						<p>Governance and financial participation are intentionally separated. Investors may participate in the financial success of Dyad, but they do not control the company or community decisions. Instead, governance authority is distributed among stewards who are responsible for maintaining the mission and operating the organization.</p>
					</div>
					<div class="element">
						<h3>Members Assembly</h3>
						<p>The Members Assembly is the primary forum through which members and stakeholders participate in shaping Dyad's evolution. Initially, this will take the form of monthly assemblies open to active members and interested contributors — a space for deliberation, feedback, proposals, and collective learning, helping establish a culture of participation from the earliest stages of the organization.</p>
					</div>
					<div class="element">
						<h3>Stewardship & Community Governance</h3>
						<p>While the Members Assembly provides a mechanism for participation, stewards are responsible for translating community priorities into action and ensuring the long-term health of the organization. Over time, we intend to develop pathways through which members can help select, advise, and hold stewards accountable.</p>
					</div>
					<div class="element">
						<h3>Transparency & Accountability</h3>
						<p>Trust requires visibility. We intend to publish transparency reports, governance updates, trust and safety reports, and community participation metrics as the organization grows. These practices help create accountability not only to investors or leadership, but to members, contributors, and the broader public that the institution exists to serve.</p>
					</div>
				</div>
			</section>

		</div>
	</div>
</div>

<style>
	.page {
		max-width: 1080px;
		margin: 0 auto;
		padding: 80px 48px 120px;
	}

	.page-intro {
		margin-bottom: 56px;
		padding-bottom: 48px;
		border-bottom: 1px solid rgba(240, 236, 230, 0.07);
	}

	.page-body {
		display: grid;
		grid-template-columns: 160px 1fr;
		gap: 64px;
		align-items: start;
	}

	.section-label {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.28);
		margin: 0 0 20px;
	}

	.page-title {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: clamp(2rem, 4.5vw, 3.5rem);
		font-weight: 400;
		color: rgba(240, 236, 230, 0.92);
		margin: 0 0 12px;
		line-height: 1.15;
		letter-spacing: -0.02em;
		font-style: italic;
	}

	.page-attr {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		color: rgba(240, 236, 230, 0.25);
		margin: 0;
	}

	/* ── Sticky TOC ── */
	.toc {
		position: sticky;
		top: 80px;
		height: fit-content;
	}

	.toc-label {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.52rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.2);
		margin: 0 0 14px;
	}

	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
		counter-reset: toc-counter;
	}

	.toc-list li {
		display: flex;
		align-items: baseline;
		gap: 8px;
		counter-increment: toc-counter;
		padding: 7px 0;
		border-bottom: 1px solid rgba(240, 236, 230, 0.04);
	}

	.toc-list li:last-child { border-bottom: none; }

	.toc-list li::before {
		content: counter(toc-counter, decimal-leading-zero);
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.48rem;
		letter-spacing: 0.04em;
		color: rgba(240, 236, 230, 0.15);
		flex-shrink: 0;
		transition: color 0.15s;
	}

	.toc-list a {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.78rem;
		font-weight: 300;
		color: rgba(240, 236, 230, 0.38);
		text-decoration: none;
		line-height: 1.35;
		transition: color 0.15s;
	}

	.toc-list a:hover { color: rgba(240, 236, 230, 0.75); }

	.toc-list a.active {
		color: rgba(240, 236, 230, 0.88);
		font-weight: 400;
	}

	.toc-list li:has(a.active)::before {
		color: rgba(240, 236, 230, 0.4);
	}

	.toc-list a.past {
		color: rgba(240, 236, 230, 0.18);
	}

	/* ── Prose ── */
	.prose section {
		padding: 56px 0;
		border-bottom: 1px solid rgba(240, 236, 230, 0.05);
	}

	.prose section:last-child { border-bottom: none; }

	.section-h2 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: clamp(1.3rem, 2.5vw, 1.75rem);
		font-weight: 400;
		color: rgba(240, 236, 230, 0.88);
		margin: 0 0 28px;
		line-height: 1.2;
	}

	.prose p {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 300;
		color: rgba(240, 236, 230, 0.6);
		line-height: 1.8;
		margin: 0 0 20px;
	}

	.prose strong {
		color: rgba(240, 236, 230, 0.85);
		font-weight: 400;
	}

	.objectives-grid,
	.elements-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 32px;
		margin-top: 8px;
	}

	.objective,
	.element {
		padding: 24px;
		border: 1px solid rgba(240, 236, 230, 0.06);
		border-radius: 4px;
	}

	.objective h3,
	.element h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.95rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 10px;
		line-height: 1.3;
	}

	.objective p,
	.element p {
		font-size: 0.85rem !important;
		margin: 0 !important;
	}

	@media (max-width: 760px) {
		.page { padding: 40px 20px 80px; }
		.page-body { grid-template-columns: 1fr; gap: 0; }
		.toc { position: static; margin-bottom: 40px; border-bottom: 1px solid rgba(240, 236, 230, 0.07); padding-bottom: 32px; }
		.objectives-grid, .elements-grid { grid-template-columns: 1fr; gap: 16px; }
	}
</style>
