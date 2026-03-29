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

/**
 * Hybrid timestamp: Today / Tomorrow / Day name / "29 Mar"
 */
export function formatHybridDate(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Tomorrow';
	if (diffDays >= 2 && diffDays <= 6) {
		return date.toLocaleDateString('en-GB', { weekday: 'long' });
	}
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Format time range: "15:00–16:00" */
export function formatSlotTimeRange(iso: string, durationMinutes: number): string {
	const start = new Date(iso);
	const end = new Date(start.getTime() + durationMinutes * 60_000);
	const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	return `${fmt(start)}–${fmt(end)}`;
}
