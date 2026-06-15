<script lang="ts">
	import { onMount } from 'svelte';

	const ids = ['holding-space', 'approach', 'guidelines', 'moderation', 'in-person', 'living'];
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
	<title>Community Care — dyad.</title>
	<meta name="description" content="Trust, safety, and community care at Dyad. We begin with responsibility, not certainty." />
</svelte:head>

<div class="page">

	<div class="page-intro">
		<p class="section-label">Trust, Safety & Community Care</p>
		<h1 class="page-title">"Really to care is to care as you would for a tree or a plant, watering it, studying its needs, the best soil for it, looking after it with gentleness and tenderness."</h1>
		<p class="page-attr">— Krishnamurti</p>
	</div>

	<div class="page-body">

		<nav class="toc">
			<p class="toc-label">In this section</p>
			<ol class="toc-list">
				<li><a href="#holding-space" class:active={activeId === 'holding-space'} class:past={isPast('holding-space')}>Holding space online</a></li>
				<li><a href="#approach" class:active={activeId === 'approach'} class:past={isPast('approach')}>Our approach</a></li>
				<li><a href="#guidelines" class:active={activeId === 'guidelines'} class:past={isPast('guidelines')}>Community guidelines</a></li>
				<li><a href="#moderation" class:active={activeId === 'moderation'} class:past={isPast('moderation')}>Moderation</a></li>
				<li><a href="#in-person" class:active={activeId === 'in-person'} class:past={isPast('in-person')}>In-person safety & privacy</a></li>
				<li><a href="#living" class:active={activeId === 'living'} class:past={isPast('living')}>Living guidelines</a></li>
			</ol>
		</nav>

		<div class="prose">

			<section id="holding-space">
				<h2 class="section-h2">Holding space online</h2>

				<p>We started this zine with the harms that brought us here. The exhaustion, hostility, harm, and erosion of trust we have experienced and witnessed are not abstract to us. They have been foundational parts of why Dyad exists.</p>

				<p>The places where we meet others online are part of public life. They may not look like streets, libraries, or community spaces, but they increasingly serve similar functions. People gather there, speak there, organize there, disagree there, find belonging there, and become visible to one another there. Yet our language, principles, and practices for public space, civic responsibility, and communal life has not fully caught up with the digital realm.</p>

				<p>Communal living has always come with shared understandings, boundaries, agreements, and forms of accountability. The digital realm will not be an exception. Consideration of safeguarding cannot be secondary.</p>

				<p>The current status quo exists in large part because a handful of platforms moved fast and broke things before public awareness and the institutions traditionally responsible for the public interest could catch up. Taking stock of the first twenty years of interactive life online, we need accountable practices, serious follow-through, and structures that do not leave care dependent on goodwill alone.</p>

				<p>And, we are catching up. We see regulatory pushback against incumbents, a growing field of communities doing things differently, and charities, nonprofits, researchers, and practitioners working to inform technology builders and civil society on what is possible and what should be in place.</p>

				<p>We looked closely at Blacksky and Glitch as we began shaping the first set of practices we want to experiment with. We also benefited immensely from our conversations with Sarell, which helped us understand that the search for a perfect process can become paralyzing, and that we cannot know what works without putting it into practice and involving our community.</p>

				<p>So in all our effort to be good hosts, we begin with responsibility, not certainty.</p>
			</section>

			<section id="approach">
				<h2 class="section-h2">Our approach</h2>

				<div class="approach-grid">
					<div class="approach-item">
						<h3>Centering those who are most exposed</h3>
						<p>We are inspired by Glitch's principle that safety infrastructure should be designed from the margins inward, not the centre outward. Designing for the most exposed member raises the floor for everyone, while designing for the average member protects only those already protected. This means paying particular attention to the experiences of people who are more likely to encounter harassment, discrimination, exclusion, coercion, or abuse. Their experiences provide some of the clearest signals about whether a community is genuinely safe and welcoming.</p>
						<p>We are seeding conversations with Glitch, as well as Blacksky, an open-source, community-driven infrastructure for decentralized social media, with the intention to engage in an ongoing relationship not as sources to be cited, but as partners whose expertise could meaningfully shape how these practices evolve as we build Dyad.</p>
					</div>
					<div class="approach-item">
						<h3>Structural safeguards & processes</h3>
						<p>We have placed our trust in technology companies enough times to know that goodwill and original intentions are not a sufficient safeguard. Founders change, teams change, investors arrive, and priorities shift. Rather than asking members to trust us indefinitely, we aim to create a system that requires as little blind trust as possible.</p>
						<p>Open source infrastructure, transparent governance, community participation, and our commitment to steward ownership are all attempts to distribute power, increase accountability, and reduce dependence on any single group of people; including ourselves.</p>
					</div>
					<div class="approach-item">
						<h3>Shared stewardship</h3>
						<p>Healthy communities are maintained by the people who participate in them. While the team currently holds the responsibility for moderation, we do not believe trust and safety should remain the responsibility of a small group indefinitely.</p>
						<p>We are interested in developing mechanisms through which members can help maintain community standards, participate in moderation processes, provide feedback on difficult cases, and contribute to the evolution of the community. Our goal is to create a culture in which stewardship is shared and responsibility for the health of the community gradually becomes distributed across the people who inhabit it.</p>
					</div>
				</div>

				<div class="iterations-note">
					<h3>Transparency & iterations</h3>
					<p>No trust and safety system will ever be done and complete. As the community grows, new challenges will emerge and existing approaches will need to evolve. We understand that trust is not something that can be claimed; it is something that must be earned repeatedly through accountability and practice.</p>
					<p>With our first year of operations, we will publish disaggregated data in our transparency reports, on reports made, actions taken, and their outcomes, broken down by the identity dimensions relevant to intersectional harm. This responds directly to Glitch's call for platforms to release transparency data that includes race, gender, and other identity characteristics, so that failures at intersections become visible rather than averaged away.</p>
				</div>
			</section>

			<section id="guidelines">
				<h2 class="section-h2">Community guidelines</h2>

				<div class="guidelines-intro">
					<div>
						<h3>Purpose of the space</h3>
						<p>Dyad exists to help people meet for meaningful in-person conversations. The purpose of our guidelines is not ideological conformity. It is to create the conditions for encounters across difference, which cannot happen without a baseline of mutual care.</p>
						<p>We ask members to approach one another with curiosity, reciprocity, respect, consent, and accountability. Members should be able to disagree, ask difficult questions, and bring different experiences into conversation without being harassed, coerced, exposed, or exploited.</p>
					</div>
					<div>
						<h3>What we do not allow</h3>
						<p>We do not allow harassment, discrimination, coercion, abuse, doxing, privacy violations, non-consensual behavior, spam, impersonation, weaponized reporting, or unsafe conduct.</p>
						<p>We also do not allow behavior that targets people on the basis of race, gender, sexuality, disability, nationality, religion, class, body, or other protected or vulnerable dimensions of identity. These categories will become more specific as we learn from actual reports and community feedback.</p>
					</div>
				</div>
			</section>

			<section id="moderation">
				<h2 class="section-h2">Moderation</h2>

				<div class="moderation-grid">
					<div class="mod-item">
						<h3>Moderation labels</h3>
						<p>Members will be able to report content, behavior, or in-person encounters that violate our guidelines. Reports should include context where possible, so moderators can understand what happened without relying on assumptions. We will encourage reporting through the proper channels rather than public escalation that may amplify harm. Reports will be taken seriously, but the reporting system itself must not be used to harass, punish, or coordinate against others.</p>
					</div>
					<div class="mod-item">
						<h3>Reporting</h3>
						<p>Reports will be reviewed against a small set of moderation labels. Our starting labels will include harassment, discrimination, coercion, abuse, doxing or privacy violation, non-consensual behavior, spam, impersonation, unsafe meeting conduct, weaponized reporting, and misogynoir, the intersection of anti-Black racism and misogyny that standard categories consistently fail to capture.</p>
						<p>Each label will have a public definition, examples, possible consequences, and a path to appeal. Blacksky's model is grounded in the principle that communities closest to harm are best positioned to name it. Their labels are publicly defined, contestable, and shaped through community input rather than decided by a central team. We are drawing from this approach.</p>
					</div>
					<div class="mod-item">
						<h3>Team review & consequences</h3>
						<p>Our team is currently responsible for reviewing reports, assessing harm, and deciding whether action is needed. Consequences should be proportionate and may include a warning, temporary restriction, removal from a community, suspension, or removal from the wider community.</p>
						<p>As we grow, we plan to onboard peer moderators and draw on the network of practitioners through Sarell to build our capacity for this work. Unclear cases will not be decided alone or in haste; we will document our reasoning and bring broader questions into Assemblies or external review.</p>
					</div>
					<div class="mod-item">
						<h3>Appeals</h3>
						<p>Members affected by a moderation decision should be told what action was taken, why it was taken, and how they can contest it. Appeals should be reviewed by someone other than the person who made the original decision wherever possible. We are still defining the details of the appeal process, including timelines, escalation paths, and the role of external advisors. What we can commit to is that moderation decisions should not disappear into a black box.</p>
					</div>
				</div>
			</section>

			<section id="in-person">
				<h2 class="section-h2">In-person safety & privacy</h2>

				<div class="inperson-grid">
					<div>
						<h3>In-person safety</h3>
						<p>Dyad exists to help people meet offline, so trust and safety cannot stop at the screen. Location, consent, no-shows, unwanted contact, and unsafe behavior around meetings all require careful handling.</p>
						<p>Our starting point is to reveal location gradually, allow members to report unsafe conduct around meetings, and treat post-conversation feedback as part of participation.</p>
					</div>
					<div>
						<h3>Privacy and data</h3>
						<p>Trust and safety cannot mean surveillance in softer language. Our refusal to collect unnecessary personal data is part of our commitment to user autonomy. We will not sell personal data, use it for advertising, or collect more than we need to operate the service responsibly.</p>
						<p>This creates real design questions. How do we notice patterns of harm without tracking people? How do we respond to reports without building a culture of suspicion? How do we support moderation with aggregated signals rather than personal surveillance? These are among the questions we are actively working through.</p>
					</div>
				</div>
			</section>

			<section id="living">
				<h2 class="section-h2">Living guidelines</h2>

				<p>These guidelines are living documents. They will change as the community grows, as new harms become visible, and as we learn what our current process fails to see.</p>

				<p>We are working on documenting the principles behind our trust and safety approach, the questions raised through Assemblies and Sounding Boards, and the changes we make over time. Updates to guidelines, labels, moderation processes, and appeals will be recorded in a public changelog, so members can follow the evolution of the process with ease.</p>

				<p>We will use monthly Assemblies, Sounding Boards, transparency reports, and collaborate with third-party organizations to revise these practices over time. Alongside our members, we plan to invite organizers, researchers, trust and safety practitioners, and anyone thinking seriously about healthier digital spaces to help us question our approach as we iterate.</p>
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
		font-size: clamp(1.3rem, 2.5vw, 2rem);
		font-weight: 400;
		color: rgba(240, 236, 230, 0.88);
		margin: 0 0 16px;
		line-height: 1.4;
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

	.approach-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 24px;
		margin-bottom: 40px;
	}

	.approach-item {
		padding: 24px;
		border: 1px solid rgba(240, 236, 230, 0.06);
		border-radius: 4px;
	}

	.approach-item h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.9rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 12px;
		line-height: 1.3;
	}

	.approach-item p { font-size: 0.82rem !important; margin: 0 0 12px !important; }
	.approach-item p:last-child { margin-bottom: 0 !important; }

	.iterations-note {
		padding: 28px;
		border: 1px solid rgba(240, 236, 230, 0.06);
		border-radius: 4px;
		background: rgba(240, 236, 230, 0.015);
	}

	.iterations-note h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 14px;
	}

	.iterations-note p { font-size: 0.88rem !important; }

	.guidelines-intro {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 40px;
	}

	.guidelines-intro h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 14px;
	}

	.moderation-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 28px;
	}

	.mod-item {
		padding: 24px;
		border: 1px solid rgba(240, 236, 230, 0.06);
		border-radius: 4px;
	}

	.mod-item h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 0.9rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 12px;
	}

	.mod-item p { font-size: 0.82rem !important; margin: 0 0 12px !important; }
	.mod-item p:last-child { margin-bottom: 0 !important; }

	.inperson-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 40px;
	}

	.inperson-grid h3 {
		font-family: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
		font-size: 1rem;
		font-weight: 400;
		color: rgba(240, 236, 230, 0.8);
		margin: 0 0 14px;
	}

	@media (max-width: 760px) {
		.page { padding: 40px 20px 80px; }
		.page-body { grid-template-columns: 1fr; gap: 0; }
		.toc { position: static; margin-bottom: 40px; border-bottom: 1px solid rgba(240, 236, 230, 0.07); padding-bottom: 32px; }
		.approach-grid, .moderation-grid { grid-template-columns: 1fr; gap: 16px; }
		.guidelines-intro, .inperson-grid { grid-template-columns: 1fr; gap: 28px; }
	}
</style>
