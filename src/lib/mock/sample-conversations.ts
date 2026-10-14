/**
 * Mock "published conversation" pages for the /about examples. The cards on
 * /about link here until real conversations are scheduled; every name,
 * quote and time below is illustrative.
 */

export type SampleImage = 'crowd' | 'room' | 'landscape';

export interface SampleConversation {
	slug: string;
	title: string;
	/** Short date, as on the card. */
	when: string;
	/** Concrete mock date and time, shown on the detail page. */
	date: string;
	time: string;
	areaBerlin: string;
	areaAmsterdam: string;
	format: 'one-on-one' | 'group';
	seats: number;
	taken: number;
	duration: string;
	image: SampleImage;
	imagePos: string;
	/** One paragraph on why this question. */
	why: string;
	/** What people are asked to bring. */
	bring: string;
	host: { name: string; line: string };
}

export const SAMPLE_CONVERSATIONS: SampleConversation[] = [
	{
		slug: 'where-does-belonging-begin',
		title: 'Where does belonging begin?',
		when: 'Thu Oct 8',
		date: 'Thursday, 8 October',
		time: '19:00 to 21:00',
		areaBerlin: 'Kreuzberg',
		areaAmsterdam: 'De Pijp',
		format: 'group',
		seats: 6,
		taken: 4,
		duration: 'Two hours',
		image: 'crowd',
		imagePos: '50% 15%',
		why: 'Most of us belong to places we never chose and are left out of places we would. We want to hear where belonging started for you, and where it was refused.',
		bring: 'One moment when you felt you were in, or out. A true one, not a good one.',
		host: { name: 'Mira', line: 'Hosts from a kitchen table in a flat she has lived in for eleven years.' }
	},
	{
		slug: 'what-would-you-stop-paying-attention-to',
		title: 'What would you stop paying attention to?',
		when: 'Sat Oct 10',
		date: 'Saturday, 10 October',
		time: '10:30 to 12:00',
		areaBerlin: 'Neukölln',
		areaAmsterdam: 'Oost',
		format: 'group',
		seats: 6,
		taken: 2,
		duration: 'An hour and a half',
		image: 'room',
		imagePos: '50% 35%',
		why: 'Attention is the one thing everybody is spending and nobody budgets. Before asking what deserves more of it, we start with what has taken too much.',
		bring: 'Something you check every day that you would not miss. Phone left in the bag.',
		host: { name: 'Jonas', line: 'Teaches evening classes and has opinions about notifications.' }
	},
	{
		slug: 'who-taught-you-to-listen',
		title: 'Who taught you to listen?',
		when: 'Sun Oct 11',
		date: 'Sunday, 11 October',
		time: '15:00 to 16:00',
		areaBerlin: 'Wedding',
		areaAmsterdam: 'Noord',
		format: 'one-on-one',
		seats: 2,
		taken: 1,
		duration: 'One hour',
		image: 'landscape',
		imagePos: '40% 60%',
		why: 'Someone once listened to you in a way you still remember. This hour is for passing that on: two people, one question, no agenda.',
		bring: 'The name of one person who listened well, and what they did.',
		host: { name: 'Aylin', line: 'Pairs people up and then mostly stays out of the way.' }
	},
	{
		slug: 'is-ambition-overrated',
		title: 'Is ambition overrated?',
		when: 'Tue Oct 13',
		date: 'Tuesday, 13 October',
		time: '19:30 to 21:00',
		areaBerlin: 'Prenzlauer Berg',
		areaAmsterdam: 'Jordaan',
		format: 'group',
		seats: 6,
		taken: 5,
		duration: 'An hour and a half',
		image: 'crowd',
		imagePos: '50% 80%',
		why: 'We are told to want more, and then told to be grateful for what we have. We would like to know what you actually want, and who taught you to want it.',
		bring: 'A goal you dropped, and whether you miss it.',
		host: { name: 'Tomas', line: 'Left two careers and is still undecided about the third.' }
	},
	{
		slug: 'what-do-we-owe-our-neighbours',
		title: 'What do we owe our neighbours?',
		when: 'Fri Oct 16',
		date: 'Friday, 16 October',
		time: '18:30 to 20:30',
		areaBerlin: 'Friedrichshain',
		areaAmsterdam: 'West',
		format: 'group',
		seats: 6,
		taken: 3,
		duration: 'Two hours',
		image: 'room',
		imagePos: '30% 70%',
		why: 'Neighbours are the people we live closest to and often know least. We want to hear what you have given, what you were given, and where you stopped asking.',
		bring: 'A story about a neighbour, kind or complicated.',
		host: { name: 'Sofia', line: 'Runs the courtyard garden and knows everyone’s bins.' }
	}
];

export const sampleBySlug = (slug: string) => SAMPLE_CONVERSATIONS.find((c) => c.slug === slug);
export const sampleHref = (i: number) => `/about/conversations/${SAMPLE_CONVERSATIONS[i]?.slug ?? ''}`;
