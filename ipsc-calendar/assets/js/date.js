/**
 * Date helpers. Events carry local wall-clock times ("2026-05-10T09:00:00"),
 * so everything here works on local Date objects without timezone conversion.
 */

const MAX_RANGE_DAYS = 731;

export const pad = (n) => String(n).padStart(2, '0');

export function parseDateTime(value) {
	const [datePart, timePart = '00:00:00'] = String(value).split('T');
	const [y, m, d] = datePart.split('-').map(Number);
	const [hh = 0, mi = 0, ss = 0] = timePart.split(':').map(Number);
	return new Date(y, m - 1, d, hh, mi, ss);
}

export function parseYmd(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
	const date = parseDateTime(value);
	return toYmd(date) === value ? date : null;
}

export const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const toMonthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function parseMonthKey(value) {
	if (!/^\d{4}-\d{2}$/.test(value || '')) return null;
	const [y, m] = value.split('-').map(Number);
	return m >= 1 && m <= 12 ? new Date(y, m - 1, 1) : null;
}

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

/** Same day-of-month n months later, clamped to the month's last day. */
export function shiftMonths(d, n) {
	const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
	const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
	return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
}

export const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export function startOfWeek(d, weekStart = 1) {
	const diff = (d.getDay() - weekStart + 7) % 7;
	return addDays(startOfDay(d), -diff);
}

export const endOfWeek = (d, weekStart = 1) => addDays(startOfWeek(d, weekStart), 6);

export const isSameDay = (a, b) => a && b && toYmd(a) === toYmd(b);

export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

/**
 * Last calendar day an event occupies. An end time of exactly midnight
 * (after the start) belongs to the previous day.
 */
export function eventLastDay(start, end) {
	if (end <= start) return startOfDay(start);
	const endsAtMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0;
	return startOfDay(endsAtMidnight ? new Date(end - 1) : end);
}

/** Visible date range of the month grid (full weeks). */
export function monthGridRange(monthDate, weekStart = 1) {
	return {
		from: startOfWeek(startOfMonth(monthDate), weekStart),
		to: endOfWeek(endOfMonth(monthDate), weekStart),
	};
}

/**
 * Translates a period preset into a concrete day range.
 * @returns {{from: Date, to: Date}}
 */
export function resolvePeriod(period, today, custom = {}) {
	const day = startOfDay(today);
	switch (period) {
		case 'next7':
			return { from: day, to: addDays(day, 6) };
		case 'month':
			return { from: startOfMonth(day), to: endOfMonth(day) };
		case 'next3':
			return { from: day, to: addDays(shiftMonths(day, 3), -1) };
		case 'year':
			return { from: new Date(day.getFullYear(), 0, 1), to: new Date(day.getFullYear(), 11, 31) };
		case 'past':
			return { from: shiftMonths(day, -12), to: addDays(day, -1) };
		case 'custom': {
			const from = parseYmd(custom.from) || day;
			let to = parseYmd(custom.to) || addDays(shiftMonths(from, 3), -1);
			if (to < from) to = from;
			if (daysBetween(from, to) > MAX_RANGE_DAYS) to = addDays(from, MAX_RANGE_DAYS);
			return { from, to };
		}
		case 'upcoming':
		default:
			return { from: day, to: addDays(shiftMonths(day, 12), -1) };
	}
}
