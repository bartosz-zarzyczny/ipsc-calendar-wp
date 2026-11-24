/**
 * Month view: a calendar grid plus an agenda of the selected day (or month)
 * below it. On narrow screens the grid shows dots and the agenda does the work.
 */

import { h, icon } from 'ipsc-calendar/dom';
import { addDays, endOfMonth, isSameDay, monthGridRange, startOfMonth, toYmd } from 'ipsc-calendar/date';
import { categoryColor } from 'ipsc-calendar/filters';
import { renderEventCard } from 'ipsc-calendar/components/event';

const MAX_CHIPS = 3;

function eventsByDay(events, from, to) {
	const map = new Map();
	for (const event of events) {
		let day = event.startDay < from ? from : event.startDay;
		const last = event.lastDay > to ? to : event.lastDay;
		while (day <= last) {
			const key = toYmd(day);
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(event);
			day = addDays(day, 1);
		}
	}
	// Multi-day and all-day events first, then by start time.
	for (const list of map.values()) {
		list.sort((a, b) => {
			const aLong = a.allDay || !isSameDay(a.startDay, a.lastDay);
			const bLong = b.allDay || !isSameDay(b.startDay, b.lastDay);
			return Number(bLong) - Number(aLong) || a.startDate - b.startDate;
		});
	}
	return map;
}

const eventColor = (event, data) => categoryColor(data.categories.get(event.categories[0]) || { slug: 'default' });

/**
 * @param {object} opts
 * @param {Date}   opts.monthDate     First day of the shown month.
 * @param {Array}  opts.events        Filtered events (sorted by date).
 * @param {number} opts.weekStart     0 = Sunday, 1 = Monday.
 * @param {string|null} opts.selectedDay  Y-m-d or null.
 * @param {object} opts.ctx           Card context.
 * @param {Function} opts.onNavigate  (delta: number | 'today') => void
 * @param {Function} opts.onSelectDay (ymd: string | null) => void
 * @param {Function} opts.onOpenEvent (event) => void
 */
export function renderMonth({ monthDate, events, weekStart, selectedDay, ctx, onNavigate, onSelectDay, onOpenEvent }) {
	const { i18n, data, today } = ctx;
	const { from, to } = monthGridRange(monthDate, weekStart);
	const byDay = eventsByDay(events, from, to);
	const monthStart = startOfMonth(monthDate);
	const monthEnd = endOfMonth(monthDate);

	const header = h(
		'div',
		{ class: 'ic-month__header' },
		h(
			'button',
			{ type: 'button', class: 'ic-icon-btn', 'aria-label': i18n.t('prev_month'), title: i18n.t('prev_month'), onClick: () => onNavigate(-1), dataset: { focusKey: 'month-prev' } },
			icon('chevronLeft'),
		),
		h('h2', { class: 'ic-month__title', 'aria-live': 'polite' }, i18n.monthTitle(monthDate)),
		h(
			'button',
			{ type: 'button', class: 'ic-icon-btn', 'aria-label': i18n.t('next_month'), title: i18n.t('next_month'), onClick: () => onNavigate(1), dataset: { focusKey: 'month-next' } },
			icon('chevronRight'),
		),
		h('button', { type: 'button', class: 'ic-btn ic-btn--outline ic-btn--sm', onClick: () => onNavigate('today'), dataset: { focusKey: 'month-today' } }, i18n.t('today')),
	);

	const weekdays = h(
		'div',
		{ class: 'ic-month__weekdays', 'aria-hidden': 'true' },
		Array.from({ length: 7 }, (_, i) => h('span', null, i18n.date(addDays(from, i), { weekday: 'short' }))),
	);

	const cells = [];
	for (let day = from; day <= to; day = addDays(day, 1)) {
		const ymd = toYmd(day);
		const dayEvents = byDay.get(ymd) || [];
		const outside = day < monthStart || day > monthEnd;
		const selected = selectedDay === ymd;
		const label = `${i18n.date(day, { weekday: 'long', day: 'numeric', month: 'long' })} – ${i18n.tn('events_count', dayEvents.length)}`;

		cells.push(
			h(
				'div',
				{
					class: ['ic-day', outside && 'is-outside', isSameDay(day, today) && 'is-today', selected && 'is-selected', dayEvents.length && 'has-events'],
					onClick: (e) => {
						if (!e.target.closest('.ic-day__event')) onSelectDay(selected ? null : ymd);
					},
				},
				h(
					'button',
					{ type: 'button', class: 'ic-day__num', 'aria-label': label, 'aria-pressed': String(selected), dataset: { focusKey: `day-${ymd}` } },
					String(day.getDate()),
				),
				dayEvents.length > 0 &&
					h(
						'ul',
						{ class: 'ic-day__events' },
						dayEvents.slice(0, MAX_CHIPS).map((event) =>
							h(
								'li',
								null,
								h(
									'button',
									{
										type: 'button',
										class: ['ic-day__event', event.featured && 'is-featured'],
										style: { '--ic-chip': eventColor(event, data) },
										title: event.title,
										onClick: () => onOpenEvent(event),
									},
									!event.allDay && isSameDay(event.startDay, day) && h('span', { class: 'ic-day__time' }, i18n.time(event.startDate)),
									h('span', { class: 'ic-day__label' }, event.title),
								),
							),
						),
						dayEvents.length > MAX_CHIPS && h('li', { class: 'ic-day__more' }, i18n.t('more_events', { n: dayEvents.length - MAX_CHIPS })),
					),
				dayEvents.length > 0 &&
					h(
						'span',
						{ class: 'ic-day__dots', 'aria-hidden': 'true' },
						dayEvents.slice(0, 4).map((event) => h('i', { style: { '--ic-chip': eventColor(event, data) } })),
					),
			),
		);
	}

	// Agenda below the grid.
	let agendaEvents;
	let agendaTitle;
	if (selectedDay) {
		agendaEvents = byDay.get(selectedDay) || [];
		const date = new Date(`${selectedDay}T00:00:00`);
		agendaTitle = i18n.t('day_events', { date: i18n.date(date, { weekday: 'long', day: 'numeric', month: 'long' }) });
	} else {
		agendaEvents = events.filter((e) => e.lastDay >= monthStart && e.startDay <= monthEnd);
		agendaTitle = i18n.t('month_events', { month: i18n.monthTitle(monthDate) });
	}

	const agenda = h(
		'section',
		{ class: 'ic-month__agenda' },
		h(
			'div',
			{ class: 'ic-month__agenda-header' },
			h('h3', null, agendaTitle),
			selectedDay && h('button', { type: 'button', class: 'ic-link-btn', onClick: () => onSelectDay(null) }, i18n.t('show_whole_month')),
		),
		agendaEvents.length
			? h('div', { class: 'ic-list__items' }, agendaEvents.map((event) => renderEventCard(event, ctx)))
			: h('p', { class: 'ic-muted' }, i18n.t(selectedDay ? 'no_events_day' : 'no_events_month')),
	);

	return h(
		'div',
		{ class: 'ic-month' },
		header,
		h('div', { class: 'ic-month__grid-wrap' }, weekdays, h('div', { class: 'ic-month__grid' }, cells)),
		agenda,
	);
}
