import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createDefaultState, readStateFromUrl, writeStateToUrl } from '../ipsc-calendar/assets/js/state.js';
import { eventLastDay, monthGridRange, parseDateTime, resolvePeriod, toYmd } from '../ipsc-calendar/assets/js/date.js';
import { createTranslator } from '../ipsc-calendar/assets/js/i18n.js';

const today = new Date(2026, 10, 24); // 24 Nov 2026, Tuesday
const defaults = createDefaultState({ view: 'list', period: 'upcoming' }, today);

test('URL round trip keeps only non-default values', () => {
	const state = {
		...defaults,
		search: 'puchar',
		period: 'past',
		sort: 'title-asc',
		selections: { ...defaults.selections, categories: ['level-ii', 'level-iii'], cities: ['Łódź'] },
	};
	const href = writeStateToUrl(state, defaults, 'https://example.com/kalendarz/?page_id=5');
	const url = new URL(href);
	assert.equal(url.searchParams.get('page_id'), '5');
	assert.equal(url.searchParams.get('ic_view'), null);
	assert.deepEqual(url.searchParams.getAll('ic_cat'), ['level-ii', 'level-iii']);

	const restored = readStateFromUrl(url.search, defaults);
	assert.equal(restored.search, 'puchar');
	assert.equal(restored.period, 'past');
	assert.equal(restored.sort, 'title-asc');
	assert.deepEqual(restored.selections.cities, ['Łódź']);
});

test('invalid URL values fall back to defaults', () => {
	const restored = readStateFromUrl('?ic_view=table&ic_sort=random&ic_from=2026-02-31&ic_month=2026-13', defaults);
	assert.equal(restored.view, 'list');
	assert.equal(restored.sort, 'date-asc');
	assert.equal(restored.from, '');
	assert.equal(restored.month, '2026-11');
});

test('past period defaults to newest first', () => {
	assert.equal(readStateFromUrl('?ic_period=past', defaults).sort, 'date-desc');
});

test('period presets', () => {
	const fmt = ({ from, to }) => `${toYmd(from)}..${toYmd(to)}`;
	assert.equal(fmt(resolvePeriod('upcoming', today)), '2026-11-24..2027-11-23');
	assert.equal(fmt(resolvePeriod('next7', today)), '2026-11-24..2026-11-30');
	assert.equal(fmt(resolvePeriod('month', today)), '2026-11-01..2026-11-30');
	assert.equal(fmt(resolvePeriod('next3', today)), '2026-11-24..2027-02-23');
	assert.equal(fmt(resolvePeriod('past', today)), '2025-11-24..2026-11-23');
	assert.equal(fmt(resolvePeriod('custom', today, { from: '2026-12-10', to: '2026-12-01' })), '2026-12-10..2026-12-10');
});

test('month grid starts on Monday', () => {
	const { from, to } = monthGridRange(new Date(2026, 10, 1), 1);
	assert.equal(toYmd(from), '2026-10-26');
	assert.equal(toYmd(to), '2026-12-06');
});

test('event ending at midnight belongs to the previous day', () => {
	const last = eventLastDay(parseDateTime('2026-05-10T18:00:00'), parseDateTime('2026-05-11T00:00:00'));
	assert.equal(toYmd(last), '2026-05-10');
});

test('Polish plural forms', () => {
	const pl = createTranslator('pl');
	assert.equal(pl.tn('events_count', 1), '1 wydarzenie');
	assert.equal(pl.tn('events_count', 3), '3 wydarzenia');
	assert.equal(pl.tn('events_count', 5), '5 wydarzeń');
	assert.equal(pl.tn('events_count', 22), '22 wydarzenia');
	assert.equal(createTranslator('en').tn('events_count', 1), '1 event');
	assert.equal(createTranslator('de').lang, 'en');
});

test('both dictionaries define the same keys', async () => {
	const pl = createTranslator('pl');
	const en = createTranslator('en');
	// Every English key must resolve to a Polish text different from the raw key.
	const source = await import('node:fs').then((fs) =>
		fs.readFileSync(new URL('../ipsc-calendar/assets/js/i18n.js', import.meta.url), 'utf8'),
	);
	const enBlock = source.slice(source.indexOf('en: {'), source.indexOf('pl: {'));
	const keys = [...enBlock.matchAll(/^\t\t(\w+):/gm)].map((m) => m[1]);
	assert.ok(keys.length > 50);
	const plBlock = source.slice(source.indexOf('pl: {'));
	for (const key of keys) {
		assert.match(plBlock, new RegExp(`^\\t\\t${key}:`, 'm'), `missing Polish translation: ${key}`);
		assert.notEqual(en.t(key), key);
		assert.notEqual(pl.t(key), key);
	}
});
