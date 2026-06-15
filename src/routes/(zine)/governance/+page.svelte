<script lang="ts">
	import { onMount } from 'svelte';

	const ids = ['experiment', 'structure', 'decision-making', 'assembly', 'formalize', 'transparency'];
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
	<title>Participatory Governance — dyad.</title>
	<meta name="description" content="Online spaces have become places we live in, but not places we govern. Dyad is building governance people can actually participate in." />
</svelte:head>

<div class="page">

	<div class="page-intro">
		<p class="section-label">Participatory Governance</p>
		<h1 class="page-title">"To maintain the faith that democracy requires, people need to experience co-governance in their daily lives."</h1>
		<p class="page-attr">— Nathan Schneider</p>
	</div>

	<div class="page-body">

		<nav class="toc">
			<p class="toc-label">In this section</p>
			<ol class="toc-list">
				<li><a href="#experiment" class:active={activeId === 'experiment'} class:past={isPast('experiment')}>Community building as a social experiment</a></li>
				<li><a href="#structure" class:active={activeId === 'structure'} class:past={isPast('structure')}>Governance structure</a></li>
				<li><a href="#decision-making" class:active={activeId === 'decision-making'} class:past={isPast('decision-making')}>Decision making</a></li>
				<li><a href="#assembly" class:active={activeId === 'assembly'} class:past={isPast('assembly')}>What we are starting with</a></li>
				<li><a href="#formalize" class:active={activeId === 'formalize'} class:past={isPast('formalize')}>What we will formalize</a></li>
				<li><a href="#transparency" class:active={activeId === 'transparency'} class:past={isPast('transparency')}>Transparency & accountability</a></li>
			</ol>
		</nav>

		<div class="prose">

			<section id="intro">
				<p class="intro-text">Online spaces have become places we live in, but not places we govern. In communities, workplaces, and associations, we expect ways to be heard, disagree, decide, and revise decisions together. Online, rules often change without participation, moderation happens behind closed doors, and the people most affected rarely have a way to shape decisions.</p>
				<p class="intro-text">To make self-governance practical, we need clear roles, open feedback channels, assemblies, public documentation, and defined decision rights.</p>
			</section>

			<section id="experiment">
				<h2 class="section-h2">Community building as a social experiment</h2>

				<p>Our lived experiences organizing as communities for different intentions have presented us a valuable view of community building. We see communities as microcosms of society, and in that, a chance to rehearse another set of organizing principles for collective living.</p>

				<p>Our long-term theory of change begins with the ability to be with one another across difference. Not to collapse differences into agreement, but to stay in contact long enough to notice what our own vantage point cannot see. We believe this capacity is vital for discernment, truth-seeking, and a richer engagement with life.</p>

				<p>What we practice through conversations, we also want to invite into governance and decision-making. In building a collectively owned and governed community and community infrastructure, we are not trying to invent self-governance out of thin air. We are drawing from long traditions of assemblies, councils, cooperatives, commons, and community decision-making, and asking how these practices can be made usable for digital communities today.</p>
			</section>

			<section id="structure">
				<h2 class="section-h2">Governance structure</h2>

				<p>Dyad is built around two roles with distinct relationships to governance: members and stewards.</p>

				<p>Members participate in the life of the platform and have a voice in the decisions that shape it. Stewards are members entrusted with maintaining the health of the platform — not as executives, but as custodians. They uphold shared norms, facilitate moderation, and help carry out decisions made collectively.</p>

				<p>Dyad is working toward a steward-ownership structure in which the platform is governed in service of its mission rather than investor returns. Governance is not a back-office function. It is a visible and accessible part of what the platform is.</p>
			</section>

			<section id="decision-making">
				<h2 class="section-h2">Decision making</h2>

				<p>Not every decision requires a vote from all members. Dyad's governance distinguishes between three kinds of decisions.</p>

				<div class="decision-types">
					<div class="decision-type">
						<h3>Operational</h3>
						<p>Day-to-day development, moderation, and community support. These are handled by the team and stewards. Members do not vote on these decisions.</p>
					</div>
					<div class="decision-type">
						<h3>Strategic</h3>
						<p>Priorities, partnerships, and significant product or organizational directions. These are made by stewards, informed by member input through Sounding Boards and the Assembly process.</p>
					</div>
					<div class="decision-type">
						<h3>Fundamental</h3>
						<p>Changes to the governance structure or bylaws, the election of stewards, and decisions about the future of Dyad itself. These require a vote from the membership.</p>
					</div>
				</div>
			</section>

			<section id="assembly">
				<h2 class="section-h2">What we are starting with</h2>

				<p>We are beginning with governance practices we can actually run from the start: clear roles, Sounding Boards, regular Assemblies, public documentation, and defined decision rights.</p>

				<div class="practices-grid">
					<div class="practice">
						<h3>Sounding Boards</h3>
						<p>Sounding Boards are open working groups where members can contribute ideas, feedback, and expertise on specific topics. They are the bridge between everyday participation and formal governance, turning concerns into proposals and proposals into action. Topics may include product development, community health and moderation, governance and bylaws, local organizing and events, or research and editorial initiatives.</p>
					</div>
					<div class="practice">
						<h3>Assembly</h3>
						<p>The Assembly is a recurring process through which members help determine priorities, review platform health, discuss proposals, and guide Dyad's development. It is intended to function as an ongoing civic process, not a one-time vote. In the beginning, the Assembly may take the form of regular member sessions with updates, questions, proposals, and recommendations to stewards.</p>
					</div>
				</div>

				<blockquote class="pull-quote">We are not waiting for a finished governance model before inviting participation. Assembly is where the model begins to be practiced.</blockquote>
			</section>

			<section id="formalize">
				<h2 class="section-h2">What we will formalize over time</h2>

				<p>As the community grows, we intend to formalize Quarterly Assemblies, Annual Gatherings, and Special Meetings.</p>

				<div class="meetings-grid">
					<div class="meeting">
						<h3>Quarterly Assembly</h3>
						<p>A regular touchpoint for transparency, accountability, and collective reflection. May include a state of Dyad update, community health indicators, financial review, product and governance updates, and an open forum for member questions and proposals.</p>
					</div>
					<div class="meeting">
						<h3>Annual Gathering</h3>
						<p>The primary governance event of the year. May include steward elections, votes on fundamental governance matters, annual financial reporting, review of the past year, planning for the next, workshops, public programming, and recognition of member contributions.</p>
					</div>
					<div class="meeting">
						<h3>Special Meetings</h3>
						<p>May be called outside the regular schedule to address urgent matters, including changes to governance or bylaws, urgent financial or trust and safety issues, replacement of stewards under exceptional circumstances, or major partnerships and structural decisions.</p>
					</div>
				</div>
			</section>

			<section id="transparency">
				<h2 class="section-h2">Transparency & accountability</h2>

				<div class="transparency-grid">
					<div class="transparency-item">
						<h3>Living Governance Documents</h3>
						<p>Dyad's policies, governance documents, and community guidelines will be public, version-controlled, and open to scrutiny. Members should be able to understand how decisions are made, how policies evolve, and how governance functions in practice. This includes access to governance documents and bylaws, version histories, member comments, proposed revisions, and public rationale accompanying major decisions. Transparency is treated as infrastructure, not communication.</p>
					</div>
					<div class="transparency-item">
						<h3>Community Review and Policy Development</h3>
						<p>Rules governing the community should not emerge solely from the platform team. Wherever possible, members will participate in shaping the norms and policies that affect them. Dyad will develop mechanisms that allow members to submit proposals, comment on draft policies, signal support or concerns, and participate in structured deliberation on important issues.</p>
						<p class="note">The goal is not consensus on every matter, but legitimacy, accountability, and participation.</p>
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
		font-size: clamp(1.5rem, 3vw, 2.4rem);
		font-weight: 400;
		color: rgba(240, 236, 230, 0.88);
		margin: 0 0 16px;
		line-height: 1.3;
		letter-spacing: -0.01em;
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

	/* ── Intro ── */
	.intro-text {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.1rem;
		font-weight: 300;
		font-style: italic;
		color: rgba(240, 236, 230, 0.55);
		line-height: 1.75;
		margin: 0 0 20px;
	}

	/* ── Prose ── */
	.prose section {
		padding: 56px 0;
		border-bottom: 1px solid rgba(240, 236, 230, 0.05);
	}

	.prose section:first-child { padding-top: 0; }
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

	.pull-quote {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1.1rem;
		font-weight: 400;
		font-style: italic;
		color: rgba(240, 236, 230, 0.55);
		border-left: 2px solid rgba(240, 236, 230, 0.12);
		margin: 40px 0 0;
		padding: 4px 0 4px 24px;
		line-height: 1.65;
	}

	.decision-types {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
		margin-top: 8px;
	}

	.decision-type {
		padding: 24px;
		border: 1px solid rgba(240, 236, 230, 0.06);
		border-radius: 4px;
	}

	.decision-type h3 {
		font-family: 'SF Mono', 'Fira Code', Menlo, monospace;
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgba(240, 236, 230, 0.4);
		margin: 0 0 12px;
	}

	.decision-type p { font-size: 0.85rem !important; margin: 0 !important; }

	.practices-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 32px;
		margin-bottom: 0;
	}

	.practice {
		padding: 24px;
		border: 1px solid rgba(240, 236, 230, 0.06);
		border-radius: 4px;
	}

	.practice h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 12px;
	}

	.practice p { font-size: 0.85rem !important; margin: 0 !important; }

	.meetings-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
		margin-top: 8px;
	}

	.meeting {
		padding: 24px;
		border: 1px solid rgba(240, 236, 230, 0.06);
		border-radius: 4px;
	}

	.meeting h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.9rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 10px;
	}

	.meeting p { font-size: 0.82rem !important; margin: 0 !important; }

	.transparency-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 32px;
	}

	.transparency-item h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 14px;
	}

	.transparency-item p { font-size: 0.88rem !important; }

	.transparency-item .note {
		font-style: italic;
		color: rgba(240, 236, 230, 0.45) !important;
		margin-top: 16px !important;
	}

	@media (max-width: 760px) {
		.page { padding: 40px 20px 80px; }
		.page-body { grid-template-columns: 1fr; gap: 0; }
		.toc { position: static; margin-bottom: 40px; border-bottom: 1px solid rgba(240, 236, 230, 0.07); padding-bottom: 32px; }
		.decision-types, .meetings-grid { grid-template-columns: 1fr; gap: 16px; }
		.practices-grid, .transparency-grid { grid-template-columns: 1fr; gap: 20px; }
	}
</style>
