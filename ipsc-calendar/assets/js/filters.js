/**
 * Pure data logic: preparing the API payload, filtering, faceting and sorting.
 * No DOM access here, so it can be unit-tested in Node.
 */

import { parseDateTime, startOfDay, eventLastDay } from 'ipsc-calendar/date';

/**
 * Facets shown in the sidebar. Different facets are always combined with AND.
 * Within one facet:
 *  - match 'all': every selected value is required, so each tick narrows the
 *    results (Level III + Shotgun = Level III shotgun matches only);
 *  - match 'any': any selected value is enough – used where an event has a
 *    single value (one city, one venue), so AND would always return nothing.
 */
export const FACETS = [
	{ key: 'tags', param: 'tag', match: 'all', values: (e) => e.tags },
	{ key: 'categories', param: 'cat', match: 'all', values: (e) => e.categories },
	{ key: 'locations', param: 'loc', match: 'any', values: (e) => e.locations },
	{ key: 'cities', param: 'city', match: 'any', values: (e) => (e.city ? [e.city] : []) },
	{ key: 'venues', param: 'venue', match: 'any', values: (e) => (e.venue != null ? [String(e.venue)] : []) },
	{ key: 'organizers', param: 'org', match: 'any', values: (e) => e.organizers.map(String) },
];

export const FACET_KEYS = FACETS.map((f) => f.key);

export const SORTS = ['date-asc', 'date-desc', 'title-asc', 'title-desc', 'added-desc'];

/** Lowercase, strip diacritics (incl. Polish "ł") so "lodz" finds "Łódź". */
export function normalizeText(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/ł/g, 'l')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

const VOIVODESHIPS = [
	'dolnoslaskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'lodzkie', 'malopolskie',
	'mazowieckie', 'opolskie', 'podkarpackie', 'podlaskie', 'pomorskie', 'slaskie',
	'swietokrzyskie', 'warminsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie',
];

/**
 * Whether an event category describes a location rather than a type of event.
 * With explicit slugs only those count; otherwise voivodeship names
 * (optionally prefixed with "woj." / "województwo") and names starting with
 * "Zagranica" are detected automatically.
 */
export function isLocationCategory(category, explicitSlugs = []) {
	if (!category) return false;
	if (explicitSlugs.length) return explicitSlugs.includes(category.slug);
	const name = normalizeText(category.name)
		.trim()
		.replace(/^(woj\.?|wojewodztwo)\s+/, '')
		.replace(/[\s-]+/g, '-');
	return VOIVODESHIPS.includes(name) || name.startsWith('zagranica');
}

const byKey = (items, key) => new Map((items || []).map((item) => [item[key], item]));

/**
 * Turns the REST payload into lookup maps and enriched events.
 * Location categories are moved out of `categories` into `locations`,
 * together with the venue's region (duplicates merged, case/diacritics ignored).
 *
 * @param {object} payload
 * @param {{locationCategories?: string[]}} options
 */
export function prepareData(payload, options = {}) {
	const categories = byKey(payload.categories, 'slug');
	const tags = byKey(payload.tags, 'slug');
	const venues = byKey(payload.venues, 'id');
	const organizers = byKey(payload.organizers, 'id');

	const locationSlugs = new Set(
		[...categories.values()].filter((c) => isLocationCategory(c, options.locationCategories || [])).map((c) => c.slug),
	);
	const locationLabels = new Map();
	const locationLabel = (label) => {
		const key = normalizeText(label).trim();
		if (!locationLabels.has(key)) locationLabels.set(key, label);
		return locationLabels.get(key);
	};
	// Category names win over venue regions when both spell the same place.
	for (const slug of locationSlugs) locationLabel(categories.get(slug).name);

	const events = (payload.events || []).map((raw) => {
		const startDate = parseDateTime(raw.start);
		let endDate = parseDateTime(raw.end || raw.start);
		if (endDate < startDate) endDate = startDate;

		const venue = raw.venue != null ? venues.get(raw.venue) || null : null;
		const allCategories = raw.categories || [];
		const eventCategories = allCategories.filter((slug) => !locationSlugs.has(slug));
		const locations = [
			...new Set([
				...allCategories.filter((slug) => locationSlugs.has(slug)).map((slug) => locationLabel(categories.get(slug).name)),
				...(venue?.region ? [locationLabel(venue.region)] : []),
			]),
		];
		const eventTags = raw.tags || [];
		const eventOrganizers = raw.organizers || [];

		const searchable = [
			raw.title,
			raw.excerpt,
			venue && [venue.name, venue.city, venue.region, venue.address],
			allCategories.map((slug) => categories.get(slug)?.name),
			eventTags.map((slug) => tags.get(slug)?.name),
			eventOrganizers.map((id) => organizers.get(id)?.name),
		]
			.flat(2)
			.filter(Boolean)
			.join(' ');

		return {
			...raw,
			categories: eventCategories,
			allCategories,
			locations,
			tags: eventTags,
			organizers: eventOrganizers,
			venueInfo: venue,
			city: venue?.city || '',
			startDate,
			endDate,
			startDay: startOfDay(startDate),
			lastDay: eventLastDay(startDate, endDate),
			addedTime: raw.added ? Date.parse(raw.added) || 0 : 0,
			searchText: normalizeText(searchable),
		};
	});

	return { events, categories, tags, venues, organizers };
}

/**
 * @param {object} state  UI state (search, featuredOnly, selections)
 * @param {{from: Date, to: Date}|null} range  Day range to keep.
 * @param {string[]} restrictCategories  Hard restriction from the shortcode.
 */
export function buildCriteria(state, range, restrictCategories = []) {
	return {
		range,
		restrictCategories,
		featuredOnly: Boolean(state.featuredOnly),
		terms: normalizeText(state.search).split(/\s+/).filter(Boolean),
		selections: state.selections || {},
	};
}

/** Whether the event passes the criteria, optionally ignoring one facet. */
export function matchesEvent(event, criteria, ignoreFacet = null) {
	const { range, restrictCategories, featuredOnly, terms, selections } = criteria;

	if (restrictCategories.length && !event.allCategories.some((c) => restrictCategories.includes(c))) return false;
	if (range && (event.lastDay < range.from || event.startDay > range.to)) return false;
	if (featuredOnly && !event.featured) return false;
	if (terms.length && !terms.every((term) => event.searchText.includes(term))) return false;

	for (const facet of FACETS) {
		if (facet.key === ignoreFacet) continue;
		const selected = selections[facet.key];
		if (!selected || !selected.length) continue;
		const values = facet.values(event);
		const ok = facet.match === 'all' ? selected.every((v) => values.includes(v)) : selected.some((v) => values.includes(v));
		if (!ok) return false;
	}
	return true;
}

export const filterEvents = (events, criteria) => events.filter((e) => matchesEvent(e, criteria));

/**
 * For every facet: value -> number of events that would be shown if that value
 * were also ticked. For 'any' facets the facet's own selection is ignored
 * (ticking adds results); for 'all' facets it is kept (ticking narrows).
 * Also returns every value present in the base set, so options with a zero
 * count can still be rendered.
 */
export function computeFacets(events, criteria) {
	const base = events.filter((e) =>
		matchesEvent(e, { ...criteria, featuredOnly: false, terms: [], selections: {} }),
	);

	const result = {};
	for (const facet of FACETS) {
		const counts = new Map();
		for (const event of base) {
			for (const value of facet.values(event)) if (!counts.has(value)) counts.set(value, 0);
		}
		for (const event of base) {
			if (!matchesEvent(event, criteria, facet.match === 'all' ? null : facet.key)) continue;
			for (const value of new Set(facet.values(event))) counts.set(value, counts.get(value) + 1);
		}
		result[facet.key] = counts;
	}
	result.hasFeatured = base.some((e) => e.featured);
	return result;
}

/**
 * @param {Array} events
 * @param {string} sort  One of SORTS.
 * @param {(a: string, b: string) => number} compareText  Locale-aware comparison.
 */
export function sortEvents(events, sort, compareText = (a, b) => a.localeCompare(b)) {
	const byStart = (a, b) => a.startDate - b.startDate || compareText(a.title, b.title);
	const comparators = {
		'date-asc': byStart,
		'date-desc': (a, b) => -byStart(a, b),
		'title-asc': (a, b) => compareText(a.title, b.title) || byStart(a, b),
		'title-desc': (a, b) => compareText(b.title, a.title) || byStart(a, b),
		'added-desc': (a, b) => b.addedTime - a.addedTime || byStart(a, b),
	};
	return [...events].sort(comparators[sort] || byStart);
}

/** Stable color per category when the server does not provide one. */
export function categoryColor(category) {
	if (category?.color) return category.color;
	const slug = category?.slug || '';
	let hash = 0;
	for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
	return `hsl(${hash % 360} 62% 40%)`;
}

/** Display label of a facet option. */
export function facetOptionLabel(facetKey, value, data) {
	switch (facetKey) {
		case 'categories':
			return data.categories.get(value)?.name || value;
		case 'tags':
			return data.tags.get(value)?.name || value;
		case 'venues':
			return data.venues.get(Number(value))?.name || value;
		case 'organizers':
			return data.organizers.get(Number(value))?.name || value;
		default:
			return value;
	}
}
