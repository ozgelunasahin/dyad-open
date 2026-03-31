/**
 * Client-side search scoring for conversations.
 *
 * Extracted from SearchOverlay to keep UI components pure renderers.
 * Uses stemming, synonym expansion, and weighted scoring.
 */

export interface SearchableItem {
	id: string;
	title: string | null;
	body_text: string;
	cover_image_url: string | null;
	username: string;
	soonest_slot: string | null;
}

const STOP_WORDS = new Set([
	'a','an','the','in','on','at','to','for','of','and','or','is','it',
	'i','my','we','do','so','no','not','but','with','this','that','from',
	'by','as','be','are','was','who','what','how','about','ihre','ich',
	'ein','eine','der','die','das',
	'berlin' // all conversations are in Berlin — useless as a search term
]);

/** Strip common English suffixes for loose matching. */
function stem(w: string): string {
	return w
		.replace(/ies$/, 'y')
		.replace(/nesses$/, '')
		.replace(/ness$/, '')
		.replace(/tions?$/, '')
		.replace(/ments?$/, '')
		.replace(/ings?$/, '')
		.replace(/ers?$/, '')
		.replace(/ed$/, '')
		.replace(/ly$/, '')
		.replace(/s$/, '');
}

const SYNONYMS: Record<string, string[]> = {
	stranger:   ['unknown','encounter','unfamiliar','meet','people','neue'],
	connect:    ['bond','relate','link','together','community','belong'],
	alone:      ['lonely','solitude','isolation','disconnect','singular'],
	lonely:     ['alone','solitude','isolation','disconnect'],
	friend:     ['friendship','companion','relation','bond'],
	art:        ['creative','artistic','culture','aesthetic','making'],
	work:       ['job','career','profession','labor','purpose'],
	city:       ['urban','berlin','neighborhood','place','street'],
	time:       ['moment','daily','routine','habit','schedule'],
	body:       ['physical','health','feeling','sense','movement'],
	love:       ['intimacy','relationship','affection','care','romantic'],
	fear:       ['anxiety','worry','nervous','dread','uncertain'],
	home:       ['belong','place','roots','origin','where'],
	berlin:     ['city','urban','german','neighborhood'],
	neighbor:   ['community','nearby','local','district','hood'],
	money:      ['wealth','finance','poverty','cost','afford'],
	death:      ['loss','grief','mortality','end','dying'],
	family:     ['parent','sibling','child','relative','heritage'],
	language:   ['speak','tongue','translate','communicate','word'],
	memory:     ['past','remember','nostalgia','history','forget'],
};

function expandTerms(words: string[]): string[] {
	const expanded = new Set<string>(words);
	for (const w of words) {
		const s = stem(w);
		expanded.add(s);
		for (const key of [w, s]) {
			const syns = SYNONYMS[key];
			if (syns) syns.forEach(syn => { expanded.add(syn); expanded.add(stem(syn)); });
		}
	}
	return Array.from(expanded);
}

/** Score a searchable item against a raw query string. Higher = better match. */
export function scoreItem(item: SearchableItem, rawQuery: string): number {
	const words = rawQuery.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
	if (!words.length) return 0;

	const title = (item.title ?? '').toLowerCase();
	const body = item.body_text.toLowerCase();
	const allTerms = expandTerms(words);

	let s = 0;

	// Exact phrase in title — big bonus
	if (title.includes(rawQuery.toLowerCase())) s += 15;

	for (const w of words) {
		const sw = stem(w);
		if (title.includes(w)) s += 6;
		else if (title.includes(sw)) s += 4;
		if (body.includes(w)) s += 3;
		else if (body.includes(sw)) s += 2;
	}

	// Synonym / expanded terms (lower weight)
	const synonymTerms = allTerms.filter(t => !words.includes(t) && !words.map(stem).includes(t));
	for (const t of synonymTerms) {
		if (title.includes(t)) s += 1.5;
		else if (body.includes(t)) s += 0.5;
	}

	return s;
}

/** Search items and return top results sorted by score. */
export function searchItems(items: SearchableItem[], query: string, limit = 12): SearchableItem[] {
	if (query.trim().length < 2) return [];
	return items
		.map(item => ({ item, score: scoreItem(item, query.trim()) }))
		.filter(x => x.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(x => x.item);
}
