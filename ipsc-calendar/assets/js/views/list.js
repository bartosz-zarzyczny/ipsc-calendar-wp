/**
 * List view: events grouped by month when sorted by date.
 */

import { h } from 'ipsc-calendar/dom';
import { toMonthKey } from 'ipsc-calendar/date';
import { renderEventCard } from 'ipsc-calendar/components/event';

/**
 * @param {object} opts
 * @param {Array}  opts.events      Filtered and sorted events.
 * @param {string} opts.sort        Current sort.
 * @param {number} opts.visible     How many events to show.
 * @param {Date}   opts.rangeFrom   Start of the displayed range (ongoing events are grouped under it).
 * @param {object} opts.ctx         Card context.
 * @param {Function} opts.onLoadMore
 */
export function renderList({ events, sort, visible, rangeFrom, ctx, onLoadMore }) {
	const { i18n } = ctx;
	const shown = events.slice(0, visible);
	const grouped = sort.startsWith('date');

	const content = [];
	if (grouped) {
		let currentKey = null;
		let currentList = null;
		for (const event of shown) {
			const anchor = rangeFrom && event.startDay < rangeFrom && event.lastDay >= rangeFrom ? rangeFrom : event.startDate;
			const key = toMonthKey(anchor);
			if (key !== currentKey) {
				currentKey = key;
				currentList = h('div', { class: 'ic-list__items' });
				content.push(
					h(
						'section',
						{ class: 'ic-list__group' },
						h('h2', { class: 'ic-list__heading' }, i18n.monthTitle(anchor)),
						currentList,
					),
				);
			}
			currentList.append(renderEventCard(event, ctx));
		}
	} else {
		content.push(h('div', { class: 'ic-list__items' }, shown.map((event) => renderEventCard(event, ctx))));
	}

	return h(
		'div',
		{ class: 'ic-list' },
		content,
		events.length > shown.length &&
			h(
				'div',
				{ class: 'ic-list__more' },
				h('p', { class: 'ic-muted' }, i18n.t('showing', { shown: shown.length, total: events.length })),
				h('button', { type: 'button', class: 'ic-btn ic-btn--outline', dataset: { focusKey: 'load-more' }, onClick: onLoadMore }, i18n.t('load_more')),
			),
	);
}
