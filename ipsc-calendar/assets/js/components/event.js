/**
 * Event card (list view) and event details (card expansion and dialog).
 */

import { h, icon, safeUrl } from 'ipsc-calendar/dom';
import { categoryColor } from 'ipsc-calendar/filters';
import { daysBetween, isSameDay } from 'ipsc-calendar/date';

const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const SHORT_DATE = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
const RANGE_DATE = { day: 'numeric', month: 'long', year: 'numeric' };

export const isMultiDay = (event) => !isSameDay(event.startDay, event.lastDay);

export function isOngoing(event, today) {
	return event.startDay < today && event.lastDay >= today;
}

/** Human-readable "when" line. */
export function formatWhen(event, i18n, { long = false } = {}) {
	if (isMultiDay(event)) {
		const days = daysBetween(event.startDay, event.lastDay) + 1;
		const range = i18n.dateRange(event.startDay, event.lastDay, RANGE_DATE);
		return `${range} · ${i18n.tn('days_count', days)}`;
	}
	const date = i18n.date(event.startDate, long ? LONG_DATE : SHORT_DATE);
	if (event.allDay) return `${date} · ${i18n.t('all_day')}`;
	const sameTime = event.endDate.getTime() === event.startDate.getTime();
	const time = sameTime
		? i18n.time(event.startDate)
		: `${i18n.time(event.startDate)}–${i18n.time(event.endDate)}`;
	return `${date} · ${time}`;
}

export function venueLine(event) {
	const venue = event.venueInfo;
	if (!venue) return '';
	return [venue.name, venue.city && venue.city !== venue.name ? venue.city : null].filter(Boolean).join(', ');
}

function categoryBadges(event, data) {
	return event.categories
		.map((slug) => data.categories.get(slug))
		.filter(Boolean)
		.map((cat) => h('span', { class: 'ic-badge', style: { '--ic-badge': categoryColor(cat) } }, cat.name));
}

function statusBadges(event, ctx) {
	return [
		event.featured && h('span', { class: 'ic-badge ic-badge--featured' }, icon('star'), ctx.i18n.t('featured')),
		isOngoing(event, ctx.today) && h('span', { class: 'ic-badge ic-badge--ongoing' }, ctx.i18n.t('ongoing')),
	];
}

function mapUrl(venue) {
	const query = [venue.name, venue.address, venue.zip, venue.city, venue.country].filter(Boolean).join(', ');
	return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function link(href, label, { primary = false, external = false } = {}) {
	const url = safeUrl(href);
	if (!url) return null;
	return h(
		'a',
		{
			class: ['ic-btn', primary ? 'ic-btn--primary' : 'ic-btn--ghost'],
			href: url,
			target: external ? '_blank' : null,
			rel: external ? 'noopener noreferrer' : null,
		},
		label,
		external && icon('external'),
	);
}

/** Definition list + description + actions. */
export function renderEventDetails(event, ctx) {
	const { i18n, data } = ctx;
	const venue = event.venueInfo;
	const organizers = event.organizers.map((id) => data.organizers.get(id)).filter(Boolean);

	const row = (label, ...content) => h('div', { class: 'ic-details__row' }, h('dt', null, label), h('dd', null, ...content));

	const venueContent = venue && [
		h('strong', null, venue.name),
		h('br'),
		[venue.address, [venue.zip, venue.city].filter(Boolean).join(' '), venue.region, venue.country]
			.filter(Boolean)
			.join(', '),
		mapUrl(venue) && [
			' · ',
			h('a', { class: 'ic-link', href: mapUrl(venue), target: '_blank', rel: 'noopener noreferrer' }, i18n.t('show_map')),
		],
	];

	const organizerContent = organizers.map((org, index) => [
		index > 0 && ', ',
		safeUrl(org.website)
			? h('a', { class: 'ic-link', href: org.website, target: '_blank', rel: 'noopener noreferrer' }, org.name)
			: org.name,
	]);

	return h(
		'div',
		{ class: 'ic-details' },
		h(
			'dl',
			{ class: 'ic-details__list' },
			row(i18n.t('when'), formatWhen(event, i18n, { long: true })),
			venue && row(i18n.t('where'), venueContent),
			!venue && event.locations.length > 0 && row(i18n.t('where'), event.locations.join(', ')),
			organizers.length > 0 && row(i18n.t('organizer'), organizerContent),
			event.cost && row(i18n.t('cost'), event.cost),
		),
		event.excerpt && h('p', { class: 'ic-details__excerpt' }, event.excerpt),
		h(
			'div',
			{ class: 'ic-details__actions' },
			link(event.url, i18n.t('event_page'), { primary: true }),
			link(event.gcal, i18n.t('add_google'), { external: true }),
			link(event.ical, i18n.t('add_ical')),
			link(event.website, i18n.t('website'), { external: true }),
		),
	);
}

/**
 * @param {object} event
 * @param {object} ctx { i18n, data, today, expanded: Set, uid }
 */
export function renderEventCard(event, ctx) {
	const { i18n, data, today } = ctx;
	const detailsId = `${ctx.uid}-event-${event.id}-${event.start}`.replace(/[^\w-]/g, '');
	const expanded = ctx.expanded.has(detailsId);
	const isPast = event.lastDay < today;
	const image = safeUrl(event.image);

	const details = h('div', { class: 'ic-event__details', id: detailsId, hidden: !expanded }, expanded && renderEventDetails(event, ctx));

	const toggle = h(
		'button',
		{
			type: 'button',
			class: 'ic-event__toggle',
			'aria-expanded': String(expanded),
			'aria-controls': detailsId,
			onClick: () => {
				const open = toggle.getAttribute('aria-expanded') !== 'true';
				toggle.setAttribute('aria-expanded', String(open));
				toggle.firstChild.textContent = open ? i18n.t('hide_details') : i18n.t('details');
				if (open && !details.firstChild) details.append(renderEventDetails(event, ctx));
				details.hidden = !open;
				if (open) ctx.expanded.add(detailsId);
				else ctx.expanded.delete(detailsId);
			},
		},
		h('span', null, expanded ? i18n.t('hide_details') : i18n.t('details')),
		icon('chevronDown'),
	);

	const meta = [
		h('p', { class: 'ic-event__meta' }, icon('clock'), h('span', null, formatWhen(event, i18n))),
		(event.venueInfo || event.locations.length > 0) &&
			h('p', { class: 'ic-event__meta' }, icon('pin'), h('span', null, venueLine(event) || event.locations.join(', '))),
		event.organizers.length > 0 &&
			h(
				'p',
				{ class: 'ic-event__meta' },
				icon('users'),
				h('span', null, event.organizers.map((id) => data.organizers.get(id)?.name).filter(Boolean).join(', ')),
			),
	];

	return h(
		'article',
		{ class: ['ic-event', event.featured && 'is-featured', isPast && 'is-past'] },
		h(
			'div',
			{ class: 'ic-event__date', 'aria-hidden': 'true' },
			h('span', { class: 'ic-event__weekday' }, i18n.date(event.startDate, { weekday: 'short' })),
			h('span', { class: 'ic-event__day' }, String(event.startDate.getDate())),
			h('span', { class: 'ic-event__month' }, i18n.date(event.startDate, { month: 'short' })),
		),
		h(
			'div',
			{ class: 'ic-event__body' },
			h('div', { class: 'ic-event__badges' }, statusBadges(event, ctx), categoryBadges(event, data)),
			h(
				'h3',
				{ class: 'ic-event__title' },
				safeUrl(event.url) ? h('a', { href: event.url }, event.title) : event.title,
			),
			meta,
			toggle,
			details,
		),
		image && h('img', { class: 'ic-event__image', src: image, alt: '', loading: 'lazy', decoding: 'async' }),
	);
}

/** Header used inside the event dialog. */
export function renderEventHeading(event, ctx) {
	return [
		h('div', { class: 'ic-event__badges' }, statusBadges(event, ctx), categoryBadges(event, ctx.data)),
		h('h2', { class: 'ic-dialog__title' }, event.title),
	];
}
