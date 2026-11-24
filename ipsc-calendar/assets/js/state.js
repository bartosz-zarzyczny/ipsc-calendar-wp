/**
 * UI state and its (shareable) representation in the page URL.
 * Parameters are prefixed with "ic_" so they do not clash with WordPress.
 */

import { FACETS, SORTS } from 'ipsc-calendar/filters';
import { parseMonthKey, parseYmd, toMonthKey } from 'ipsc-calendar/date';

export const VIEWS = ['list', 'month'];

export const PERIODS = ['upcoming', 'next7', 'month', 'next3', 'year', 'past', 'custom'];

const PREFIX = 'ic_';

const emptySelections = () => Object.fromEntries(FACETS.map((f) => [f.key, []]));

export const defaultSortFor = (period) => (period === 'past' ? 'date-desc' : 'date-asc');

export function createDefaultState(config, today) {
	return {
		view: VIEWS.includes(config.view) ? config.view : 'list',
		period: PERIODS.includes(config.period) ? config.period : 'upcoming',
		from: '',
		to: '',
		search: '',
		featuredOnly: false,
		sort: defaultSortFor(config.period),
		month: toMonthKey(today),
		selections: emptySelections(),
	};
}

export const cloneState = (state) => ({
	...state,
	selections: Object.fromEntries(Object.entries(state.selections).map(([k, v]) => [k, [...v]])),
});

export function readStateFromUrl(search, defaults) {
	const params = new URLSearchParams(search);
	const state = cloneState(defaults);
	const get = (name) => params.get(PREFIX + name);

	if (VIEWS.includes(get('view'))) state.view = get('view');
	if (PERIODS.includes(get('period'))) {
		state.period = get('period');
		state.sort = defaultSortFor(state.period);
	}
	if (parseYmd(get('from'))) state.from = get('from');
	if (parseYmd(get('to'))) state.to = get('to');
	if (SORTS.includes(get('sort'))) state.sort = get('sort');
	if (parseMonthKey(get('month'))) state.month = get('month');
	if (get('q')) state.search = get('q').slice(0, 200);
	if (get('featured') === '1') state.featuredOnly = true;

	for (const facet of FACETS) {
		state.selections[facet.key] = [...new Set(params.getAll(PREFIX + facet.param).filter(Boolean))];
	}
	return state;
}

/** Returns the current URL with only non-default state written to it. */
export function writeStateToUrl(state, defaults, href) {
	const url = new URL(href);
	for (const key of [...url.searchParams.keys()]) {
		if (key.startsWith(PREFIX)) url.searchParams.delete(key);
	}
	const set = (name, value, fallback) => {
		if (value && value !== fallback) url.searchParams.set(PREFIX + name, value);
	};

	set('view', state.view, defaults.view);
	if (state.view === 'month') {
		set('month', state.month, defaults.month);
	} else {
		set('period', state.period, defaults.period);
		if (state.period === 'custom') {
			set('from', state.from);
			set('to', state.to);
		}
		set('sort', state.sort, defaultSortFor(state.period));
	}
	set('q', state.search.trim());
	if (state.featuredOnly) url.searchParams.set(PREFIX + 'featured', '1');

	for (const facet of FACETS) {
		for (const value of state.selections[facet.key] || []) url.searchParams.append(PREFIX + facet.param, value);
	}
	return url.toString();
}

export function countActiveFilters(state) {
	let count = Object.values(state.selections).reduce((sum, list) => sum + list.length, 0);
	if (state.featuredOnly) count++;
	if (state.search.trim()) count++;
	return count;
}
