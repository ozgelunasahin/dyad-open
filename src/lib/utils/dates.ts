/**
 * Rolling 7-day calendar starting from today.
 * Used by discover page, editor page, and FloatingNav date filter.
 */
export interface WeekDate {
	date: string;     // 'YYYY-MM-DD' (sv-SE locale)
	dayShort: string; // e.g. 'Mon'
	dayNum: number;   // e.g. 28
}

export function getWeekDates(): WeekDate[] {
	const today = new Date();
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
		return {
			date: d.toLocaleDateString('sv-SE'),
			dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
			dayNum: d.getDate()
		};
	});
}
