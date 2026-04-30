export type BodyItem = string | { heading: string } | { quote: string; attribution: string };

export interface NewsletterIssue {
	slug: string;
	title: string;
	subtitle?: string;
	author?: string;
	date: string;
	teaser: string;
	coverImage?: string;
	tags?: string[];
	epigraph?: { text: string; attribution: string };
	body: BodyItem[];
}

export const ISSUES: NewsletterIssue[] = [
	{
		slug: 'modal-confusion',
		title: 'Modal confusion sits at the root of all the problems I care deeply about',
		subtitle: 'On finding a well of wisdom behind my deepest worries',
		author: 'luna şahin',
		date: '2026-03-18',
		teaser:
			'Instrumental rationality has spilled into domains of life that are organic, relational, and emergent. What looks like personal failure — the inability to know where you\'re going before you begin — is often a systemic mismatch between how we are taught to know and what life actually requires.',
		coverImage: '/images/newsletter/modal-confusion.jpg',
		tags: ['Field Notes', 'Origins'],
		body: [
			'A central claim I hold in explaining the state of the world where we seem increasingly torn apart and unable to arrive at a shared understanding of what it means to be human is that instrumental rationality has come to dominate areas of life that are organic, therefore relational and emergent. Insisting on means–ends thinking in domains of life that are not mechanistic is alarmingly similar to an organ transplant gone wrong. And before we lose the patient, that is our capacities for individual and collective sensemaking critical to our species\' survival and flourishing, we got to course correct.',
			{ heading: 'Beginnings are openings' },
			'About two years ago, I had a much appreciated encounter with Richard Reitlinger and Isolde Sammer where I\'ve been a host at their family home just outside Hamburg. Over breakfast, we had a conversation which touched upon how you build a narrative arc and lately, I\'ve been coming back to Richard\'s remark on how good stories begin with a loss. As it happens, it would only click retrospectively that Dyad, too, came from such a place.',
			'The arc my work emerges out of a journey to understand how the current state of affairs run in the making and captivation of the digital social landscape and, once I arrived at a certain depth there, turned into creating alternatives. I knew I was being harmed by the social media platforms I\'ve been using and had withdrawn from nearly all. But, the catalyst, loss of my own sensemaking and sense of belonging was not until October, 2023 with the noticing that so many of us default into side taking at the breakdown of yet another war. I was agitated.',
			'Why do we still cause so much unavoidable pain and violence? What causes nuance and constructive dialog to evaporate? What is the role of the public when it comes to such decisions that harm so many lives indefinitely? What does this say about our morals, capacities for collective action, and the functioning of our democracies? What does this make visible about our institutions? Is there a thread between the shortening of our attention spans and digital addictions with the polarization of our societies?',
			'Having such a revolting kick off point, unmoored from a market analysis or a clear cut plan, already had me on the fringes of the society as I knew it. I felt disconnected from almost all circles I had a foot in. Soon enough, a choir of worried voices gathered in my head questioning whether I really know what I\'m doing here. You should have a grasp of the destination at the moment of departure, they claimed rushing me forward so that I\'d have quantifiable markers to justify the time I\'m taking on such a matter. They demanded certainty and safety, or a good illusion of it like we most often settle with.',
			'I had a very strong urge to keep walking on this path I set myself on and looking back, without that intensity of it, I would have caved in and take on another nine to five job way back. That very urge has also been my anchor and mirror, as I stood my ground and looked at those voices that claimed certainty. And I come to notice them for what they were, a product of conditioning that owes its existence to centuries of spillover of the instrumental logic into parts of our lives that do not have a suitable modus operandi for it. This modal confusion, that is approaching our being needs in the having mode, in Erich Fromm\'s terms, sits at the root of so much of our problems.',
			'Within the logic of instrumentality, we strive to effectively and efficiently make use of means to reach a predetermined end. Hannah Arendt makes the distinction in saying it is fabrication that follows this logic whereas action, by contrast, unfolds in relation. It cannot be fully predicted, controlled, or contained. It belongs to the space between people, and to beginnings. So by its nature, we take action without a hold of the destination.',
			'Embodying this with time has given the choir of mine a rest and I move with ease. But I cannot stop thinking about how this narrative that demands certainty from the get go is harming us. Where else has instrumental rationality spilled into? How many of us are not taking the courage of our convictions to take action on problems we care about? What is the psychological bill on the pressure this creates? What possibilities are we foreclosing? And, how can we build capacities to hold ambiguity that is essential to our lives so that this loss can turn into action and birth stories as we go?',
			{ heading: 'How do we know what we know?' },
			'That power in human societies organizes itself through hierarchies is well known to us. It is the breadth of the web through which it secures its place and the cost at which it clings on even as the conditions that once gave rise to it are steadily unraveling, that I find astonishing.',
			'As I zoomed out from my own experience, I\'ve come to notice how instrumental rationality depends on, and in turn, reinforces a mindset that insists on measurability, prediction, and optimization. As power has a hard time accepting one of the few concepts that does not discriminate, impermanence, it looks for ever more strength. The more widely this way of thinking is adopted, independent of context, the more stable the system that perpetuates the dominant becomes.',
			'This logic does not remain confined to the production line or the boardroom. It travels. It infiltrates. It builds alliances with those who benefit from existing distributions of power. And in doing so, it concentrates power further.',
			'Across domains, what lends itself to measurement, prediction, and control is consistently elevated.',
			'The endurance of instrumental logic is therefore not maintained by economics alone, but by a broader architecture of meaning-making: the ways we are taught to think, be, and make sense of the world. Through its overarching and intrusive effort, its logic seeps into education, epistemology, institutions, and everyday decision-making. The logic that governs production begins to govern thought itself. At a certain point, it becomes so pervasive that we no longer experience it as a system at all, only as reality.',
			{
				quote: 'Two young fish are swimming along when they pass an older fish who nods at them and says, Morning, boys. How\'s the water? The two young fish swim on for a while, and eventually one of them looks over at the other and asks, What the hell is water?',
				attribution: 'David Foster Wallace'
			},
			'The problem with subordinating ourselves to a hierarchy of knowing is not only that it narrows the ways we relate to ourselves, each other and our environment but that it becomes the ground we stand on. What is elevated over time comes to dominate, and what dominates begins to feel unquestionable. It settles into the background of our lives, passing itself off as the fabric of reality.',
			'Among all the domains that means-ends thinking has infiltrated, epistemology holds a root position. How we know what we know is not only about knowledge. It shapes the stance from which we encounter the world and, with it, the entirety of our lived experience. When a single way of knowing takes hold, it introduces hierarchies that reorganize our perception, relation, and action.',
			'It is on this ground systems increasingly misaligned with the organic, relational nature of life emerge. Systems that go so far as to treat our very mindspace as a means to their ends.',
			{ heading: 'The insidiousness and audacity of behavioral futures market' },
			'I\'ve already touched on power\'s attempt at securing itself through accumulation and expansion. A second, more cunning way it claims permanence is by evading scrutiny, by making its legitimacy difficult to question. What is not seen is really hard to question and hold accountable, which brings us swiftly to surveillance capitalist logic. The economic system that\'s based on widespread collection and commodification of personal data by corporations.',
			'In her comprehensive account of surveillance capitalism in The Age of Surveillance Capitalism: The Fight for a Human Future at the New Frontier of Power, Shoshana Zuboff highlights how this unnoticing is not incidental, but engineered. Drawing on cases mainly from Facebook and Google, she shows how the tools we use and the infrastructures they rest on are deliberately designed to obscure the very operations that make them profitable. Surveillance works best when it becomes invisible and significant resources goes into the making and sustenance of its cloak.',
			'Here\'s that protective instinct again. The scale and scope of these operations are still relatively new to my understanding, and in that I find myself returning to those who remain in the dark or who simply do not have the means to resist. The audacity of the harm, the deceitful breaking of boundaries is unacceptable. And words come closer to express the possible damage we are talking about here as Zuboff draws the parallels between industrial and surveillance capitalism and says, surveillance capitalism is to human nature what industrial capitalism has been to nature.',
			'One of the ways this logic secures its dominance is through the institutionalization of certainty as both promise and product. What presents itself as safety or stability is, more often, a carefully constructed illusion, one that masks the underlying asymmetries of knowledge and power. In turning toward these assurances, we gradually relinquish our capacity to endure uncertainty. And as that capacity diminishes, dependency deepens and we become increasingly reliant on the very systems whose operations remain opaque, yet whose authority over our experience continues to expand.',
			'The need to know the destination at the moment of departure then is not an individual shortcoming. It is a learned orientation that aligns seamlessly with a system built on prediction, control, and the continuous reduction of the unknown.',
			'And when this orientation is reinforced at scale, we begin to inhabit a world that quietly weakens our ability to live with or in change, an essential condition of any organic, living system.',
			{ heading: 'Towards a life affirming collective life' },
			'Life, in its social, psychological, and ecological dimensions is organic, relational, and emergent. And that calls for a different kind of thinking than what came to dominate. One less concerned with predetermined outcomes and more attentive to unfolding processes. The work of alignment here asks of us patience with uncertainty, sensitivity to context, and a willingness to remain with questions long enough.',
			'If instrumental logic has extended its reach by flattening context and elevating abstraction, then a life-affirming collective life depends on restoring our capacity for contextual judgment, nuanced thought and exchange, tender and embodied senses. It requires that we keep questioning the hierarchies we inherit, refusing to grant them legitimacy by default.',
			'To reclaim the sovereignty of our minds and the conditions of our collective life is not a singular act, but an ongoing practice. It unfolds wherever we resist premature closure, wherever we choose relation over reduction, wherever we allow complexity to remain without forcing it into false clarity.',
			'In this sense, any action we dare to take and sustain our attention, expand our circle of care and relation, harbor space for nuance and the in between, as well as holding power accountable, moves us in that direction.',
			'It is streams of consciousness like these, and an inclination toward nuance, in person conversations and an openness to perspectives beyond our own that we come together around at Dyad.',
			'If this is appealing to you, feel warmly welcome to join us.'
		]
	}
];

export function renderStaticBodyToHtml(body: BodyItem[]): string {
	return body
		.map((item) => {
			if (typeof item === 'string') {
				return `<p>${item}</p>`;
			}
			if ('heading' in item) {
				return `<h2>${item.heading}</h2>`;
			}
			if ('quote' in item) {
				return `<blockquote><p>${item.quote} —${item.attribution}</p></blockquote>`;
			}
			return '';
		})
		.join('\n');
}

export function getIssue(slug: string): NewsletterIssue | undefined {
	return ISSUES.find((i) => i.slug === slug);
}

export function formatIssueDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
}
