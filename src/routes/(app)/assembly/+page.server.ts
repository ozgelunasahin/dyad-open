import type { PageServerLoad } from './$types';

// Placeholder proposals — will come from DB (assembly_proposals table) in phase 2
const MOCK_PROPOSALS = [
	{
		id: '1',
		statement: 'dyad should support communities in cities beyond Berlin and Amsterdam by the end of 2026.',
		author: 'luna',
		created_at: '2026-06-01',
		agree: 24,
		disagree: 3,
		pass: 5,
		total: 32,
		status: 'active',
		tags: ['roadmap', 'growth']
	},
	{
		id: '2',
		statement: 'The assembly should meet in person once per quarter to make major governance decisions.',
		author: 'fiore',
		created_at: '2026-05-28',
		agree: 18,
		disagree: 6,
		pass: 8,
		total: 32,
		status: 'active',
		tags: ['governance', 'assembly']
	},
	{
		id: '3',
		statement: 'dyad should never take advertising revenue, regardless of financial pressure.',
		author: 'roos',
		created_at: '2026-05-15',
		agree: 31,
		disagree: 0,
		pass: 1,
		total: 32,
		status: 'resolved',
		tags: ['values', 'revenue']
	},
	{
		id: '4',
		statement: 'Community moderators should be elected by their community, not appointed by the founders.',
		author: 'sander',
		created_at: '2026-06-03',
		agree: 21,
		disagree: 4,
		pass: 7,
		total: 32,
		status: 'active',
		tags: ['governance', 'moderation']
	},
];

const MOCK_THREADS = [
	{
		id: 't1',
		category: 'Governance',
		title: 'How should we handle communities that want to leave dyad?',
		author: 'elif',
		replies: 12,
		last_activity: '2026-06-06',
		pinned: true,
	},
	{
		id: 't2',
		category: 'Product direction',
		title: 'Should the map show conversations outside your current city?',
		author: 'daan',
		replies: 8,
		last_activity: '2026-06-05',
		pinned: false,
	},
	{
		id: 't3',
		category: 'Values',
		title: 'What does "collectively owned" actually mean in practice for new members?',
		author: 'nina',
		replies: 23,
		last_activity: '2026-06-04',
		pinned: false,
	},
	{
		id: 't4',
		category: 'Community',
		title: 'Amsterdam meetup recap — notes from the PublicSpaces unconference',
		author: 'yasmin',
		replies: 5,
		last_activity: '2026-06-07',
		pinned: false,
	},
	{
		id: 't5',
		category: 'Meta',
		title: 'Proposal: how we should document assembly decisions going forward',
		author: 'tobias',
		replies: 3,
		last_activity: '2026-06-02',
		pinned: false,
	},
];

export const load: PageServerLoad = async ({ locals }) => {
	return {
		proposals: MOCK_PROPOSALS,
		threads: MOCK_THREADS,
		username: locals.user ? 'member' : null,
	};
};
