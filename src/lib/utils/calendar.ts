/** Escape a string for safe ICS field interpolation (strip newlines, escape special chars). */
function icsEscape(value: string): string {
	return value.replace(/[\r\n]+/g, ' ').replace(/[;,\\]/g, '\\$&');
}

/** Generate an ICS calendar file string for a meeting. */
export function generateICS(opts: {
	title: string;
	start: string;
	durationMinutes: number;
	location?: string;
	uid?: string;
}): string {
	const start = new Date(opts.start);
	const end = new Date(start.getTime() + opts.durationMinutes * 60_000);
	const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//dyad.berlin//meeting//EN',
		'BEGIN:VEVENT',
		`UID:${opts.uid ?? crypto.randomUUID()}@dyad.berlin`,
		`DTSTAMP:${fmt(new Date())}`,
		`DTSTART:${fmt(start)}`,
		`DTEND:${fmt(end)}`,
		`SUMMARY:${icsEscape(opts.title)}`,
		opts.location ? `LOCATION:${icsEscape(opts.location)}` : '',
		'END:VEVENT',
		'END:VCALENDAR'
	].filter(Boolean).join('\r\n');
}

/** Trigger a browser download of an ICS file. */
export function downloadICS(ics: string, filename: string): void {
	const blob = new Blob([ics], { type: 'text/calendar' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
