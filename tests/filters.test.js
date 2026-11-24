import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	buildCriteria,
	computeFacets,
	filterEvents,
	normalizeText,
	prepareData,
	sortEvents,
} from '../ipsc-calendar/assets/js/filters.js';
import { createDefaultState } from '../ipsc-calendar/assets/js/state.js';
import { parseYmd } from '../ipsc-calendar/assets/js/date.js';

const payload = {
	events: [
		{ id: 1, title: 'Puchar Łodzi', start: '2026-05-10T09:00:00', end: '2026-05-10T17:00:00', categories: ['level-i', 'pistol'], tags: [], venue: 10, organizers: [20], featured: false, added: '2026-01-01T00:00:00Z' },
		{ id: 2, title: 'Grand Prix Krakowa', start: '2026-05-15T00:00:00', end: '2026-05-17T23:59:59', allDay: true, categories: ['level-ii', 'rifle'], tags: ['league'], venue: 11, organizers: [21], featured: true, added: '2026-03-01T00:00:00Z' },
		{ id: 3, title: 'Trening otwarty', start: '2026-06-01T10:00:00', end: '2026-06-01T12:00:00', categories: ['training'], tags: [], venue: 10, organizers: [20, 21], featured: false, added: '2026-02-01T00:00:00Z' },
	],
	categories: [
		{ slug: 'level-i', name: 'Level I' },
		{ slug: 'level-ii', name: 'Level II' },
		{ slug: 'pistol', name: 'Pistolet' },
		{ slug: 'rifle', name: 'Karabin' },
		{ slug: 'training', name: 'Szkolenie' },
	],
	tags: [{ slug: 'league', name: 'Liga' }],
	venues: [
		{ id: 10, name: 'Strzelnica Miejska', city: 'Łódź', region: 'łódzkie' },
		{ id: 11, name: 'Centrum Wisła', city: 'Kraków', region: 'małopolskie' },
	],
	organizers: [
		{ id: 20, name: 'KS Orzeł' },
		{ id: 21, name: 'KS Grot' },
	],
};

const data = prepareData(payload);
const range = { from: parseYmd('2026-05-01'), to: parseYmd('2026-06-30') };
const baseState = createDefaultState({ view: 'list', period: 'upcoming' }, new Date(2026, 4, 1));
const withState = (patch) => ({ ...baseState, ...patch, selections: { ...baseState.selections, ...(patch.selections || {}) } });
const ids = (events) => events.map((e) => e.id);

test('normalizeText strips Polish diacritics including ł', () => {
	assert.equal(normalizeText('Łódź Żółć'), 'lodz zolc');
});

test('search matches title, city and organizer without diacritics', () => {
	assert.deepEqual(ids(filterEvents(data.events, buildCriteria(withState({ search: 'lodz' }), range))), [1, 3]);
	assert.deepEqual(ids(filterEvents(data.events, buildCriteria(withState({ search: 'grot krakow' }), range))), [2]);
});

test('categories narrow: every ticked category is required', () => {
	const level = buildCriteria(withState({ selections: { categories: ['level-ii'] } }), range);
	assert.deepEqual(ids(filterEvents(data.events, level)), [2]);

	const levelAndDivision = buildCriteria(withState({ selections: { categories: ['level-ii', 'rifle'] } }), range);
	assert.deepEqual(ids(filterEvents(data.events, levelAndDivision)), [2]);

	const levelAndOtherDivision = buildCriteria(withState({ selections: { categories: ['level-ii', 'pistol'] } }), range);
	assert.deepEqual(ids(filterEvents(data.events, levelAndOtherDivision)), []);
});

test('single-value facets (city) still combine with OR, facets with AND', () => {
	const cities = buildCriteria(withState({ selections: { cities: ['Łódź', 'Kraków'] } }), range);
	assert.deepEqual(ids(filterEvents(data.events, cities)), [1, 2, 3]);

	const cityAndCategory = buildCriteria(withState({ selections: { cities: ['Łódź', 'Kraków'], categories: ['pistol'] } }), range);
	assert.deepEqual(ids(filterEvents(data.events, cityAndCategory)), [1]);
});

test('organizer facet matches events with several organizers', () => {
	const criteria = buildCriteria(withState({ selections: { organizers: ['21'] } }), range);
	assert.deepEqual(ids(filterEvents(data.events, criteria)), [2, 3]);
});

test('date range keeps events overlapping the range', () => {
	const narrow = { from: parseYmd('2026-05-16'), to: parseYmd('2026-05-31') };
	assert.deepEqual(ids(filterEvents(data.events, buildCriteria(baseState, narrow))), [2]);
});

test('all-day events ending 23:59:59 stay on their last day', () => {
	const event = data.events.find((e) => e.id === 2);
	assert.equal(event.lastDay.getDate(), 17);
});

test('restricted categories hide everything else', () => {
	assert.deepEqual(ids(filterEvents(data.events, buildCriteria(baseState, range, ['training']))), [3]);
});

test('featured only', () => {
	assert.deepEqual(ids(filterEvents(data.events, buildCriteria(withState({ featuredOnly: true }), range))), [2]);
});

test('facet counts show what remains after ticking an option', () => {
	const criteria = buildCriteria(withState({ selections: { categories: ['level-i'], cities: ['Łódź'] } }), range);
	const facets = computeFacets(data.events, criteria);
	// Categories narrow, so counts keep the current category selection.
	assert.equal(facets.categories.get('level-i'), 1);
	assert.equal(facets.categories.get('pistol'), 1);
	assert.equal(facets.categories.get('training'), 0);
	assert.equal(facets.categories.get('level-ii'), 0);
	// City counts are computed with the category filter only.
	assert.equal(facets.cities.get('Łódź'), 1);
	assert.equal(facets.cities.get('Kraków'), 0);
	assert.equal(facets.hasFeatured, true);
});

test('sorting', () => {
	const compare = (a, b) => a.localeCompare(b, 'pl');
	assert.deepEqual(ids(sortEvents(data.events, 'date-desc', compare)), [3, 2, 1]);
	assert.deepEqual(ids(sortEvents(data.events, 'title-asc', compare)), [2, 1, 3]);
	assert.deepEqual(ids(sortEvents(data.events, 'added-desc', compare)), [2, 3, 1]);
});

test('location categories move from Category to Location and merge with venue regions', () => {
	const located = prepareData({
		events: [
			{ id: 1, title: 'A', start: '2026-05-10T09:00:00', end: '2026-05-10T17:00:00', categories: ['level-i', 'lodzkie'], tags: [], venue: 10, organizers: [] },
			{ id: 2, title: 'B', start: '2026-05-11T09:00:00', end: '2026-05-11T17:00:00', categories: ['zagranica-strzelba', 'shotgun'], tags: [], venue: null, organizers: [] },
			{ id: 3, title: 'C', start: '2026-05-12T09:00:00', end: '2026-05-12T17:00:00', categories: ['woj-slaskie'], tags: [], venue: null, organizers: [] },
		],
		categories: [
			{ slug: 'level-i', name: 'Level I' },
			{ slug: 'lodzkie', name: 'Łódzkie' },
			{ slug: 'zagranica-strzelba', name: 'Zagranica Strzelba' },
			{ slug: 'shotgun', name: 'Strzelba' },
			{ slug: 'woj-slaskie', name: 'woj. śląskie' },
		],
		venues: [{ id: 10, name: 'Strzelnica', city: 'Łódź', region: 'łódzkie' }],
	});
	const [a, b, c] = located.events;
	assert.deepEqual(a.categories, ['level-i']);
	assert.deepEqual(a.locations, ['Łódzkie']); // category label wins, venue region merged
	assert.deepEqual(b.categories, ['shotgun']);
	assert.deepEqual(b.locations, ['Zagranica Strzelba']);
	assert.deepEqual(c.locations, ['woj. śląskie']);

	const criteria = buildCriteria(withState({ selections: { locations: ['Łódzkie'] } }), null);
	assert.deepEqual(ids(filterEvents(located.events, criteria)), [1]);
	// Shortcode restriction still works with a location category.
	assert.deepEqual(ids(filterEvents(located.events, buildCriteria(baseState, null, ['lodzkie']))), [1]);
});

test('explicit location category list overrides auto-detection', () => {
	const located = prepareData(
		{
			events: [{ id: 1, title: 'A', start: '2026-05-10T09:00:00', end: '2026-05-10T17:00:00', categories: ['lodzkie', 'abroad'], tags: [], organizers: [] }],
			categories: [{ slug: 'lodzkie', name: 'Łódzkie' }, { slug: 'abroad', name: 'Abroad' }],
		},
		{ locationCategories: ['abroad'] },
	);
	assert.deepEqual(located.events[0].categories, ['lodzkie']);
	assert.deepEqual(located.events[0].locations, ['Abroad']);
});
