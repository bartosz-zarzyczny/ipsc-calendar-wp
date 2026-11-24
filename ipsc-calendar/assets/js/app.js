/**
 * IPSC Calendar – front-end entry point.
 * Mounts a calendar into every `.ipsc-cal[data-config]` element on the page.
 */

import { h, icon, safeUrl } from 'ipsc-calendar/dom';
import { createTranslator, normalizeLang, SUPPORTED_LANGS } from 'ipsc-calendar/i18n';
import { createApi } from 'ipsc-calendar/api';
import {
	addMonths,
	monthGridRange,
	parseMonthKey,
	resolvePeriod,
	startOfDay,
	startOfMonth,
	toMonthKey,
	toYmd,
} from 'ipsc-calendar/date';
import {
	FACETS,
	SORTS,
	buildCriteria,
	categoryColor,
	computeFacets,
	facetOptionLabel,
	filterEvents,
	prepareData,
	sortEvents,
} from 'ipsc-calendar/filters';
import {
	PERIODS,
	VIEWS,
	cloneState,
	countActiveFilters,
	createDefaultState,
	defaultSortFor,
	readStateFromUrl,
	writeStateToUrl,
} from 'ipsc-calendar/state';
import { renderList } from 'ipsc-calendar/views/list';
import { renderMonth } from 'ipsc-calendar/views/month';
import { renderEventDetails, renderEventHeading } from 'ipsc-calendar/components/event';

const LANG_STORAGE_KEY = 'ipscCalendar.lang';
const SEARCH_DEBOUNCE_MS = 200;
const FACET_PREVIEW_COUNT = 6;
const MOBILE_QUERY = '(max-width: 900px)';
const RANGE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' };

let instanceCount = 0;

function readStoredLang() {
	try {
		return window.localStorage.getItem(LANG_STORAGE_KEY);
	} catch {
		return null;
	}
}

function storeLang(lang) {
	try {
		window.localStorage.setItem(LANG_STORAGE_KEY, lang);
	} catch {
		/* storage unavailable – ignore */
	}
}

export class CalendarApp {
	constructor(root, config = {}) {
		instanceCount += 1;
		this.root = root;
		this.uid = `ic${instanceCount}`;
		this.config = {
			restUrl: '/wp-json/ipsc-calendar/v1/',
			lang: 'en',
			langSwitch: true,
			view: 'list',
			period: 'upcoming',
			perPage: 20,
			restrictCategories: [],
			locationCategories: [],
			syncUrl: true,
			weekStart: 1,
			subscribe: null,
			...config,
		};

		this.api = createApi(this.config.restUrl);
		this.today = startOfDay(new Date());
		this.defaults = createDefaultState(this.config, this.today);
		// Only the first calendar on a page owns the URL.
		this.syncUrl = Boolean(this.config.syncUrl) && instanceCount === 1;
		this.state = this.syncUrl ? readStateFromUrl(window.location.search, this.defaults) : cloneState(this.defaults);

		this.ui = {
			filtersOpen: false,
			selectedDay: null,
			visible: this.config.perPage,
			openFacets: new Set(['tags', 'categories', 'locations']),
			expandedFacets: new Set(),
			expandedEvents: new Set(),
		};
		for (const facet of FACETS) {
			if (this.state.selections[facet.key].length) this.ui.openFacets.add(facet.key);
		}

		this.cache = new Map();
		this.data = null;
		this.dataKey = null;
		this.status = 'loading';
		this.requestSeq = 0;

		// Close the subscribe menu on outside click / Escape.
		document.addEventListener('click', (e) => {
			if (this.subscribeMenu?.open && !this.subscribeMenu.contains(e.target)) this.subscribeMenu.open = false;
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.subscribeMenu?.open) {
				this.subscribeMenu.open = false;
				this.subscribeMenu.querySelector('summary').focus();
			}
		});

		const stored = this.config.langSwitch ? readStoredLang() : null;
		this.setLanguage(SUPPORTED_LANGS.includes(stored) ? stored : normalizeLang(this.config.lang));
		this.load();
	}

	/* ------------------------------------------------------------------ */
	/* State                                                              */
	/* ------------------------------------------------------------------ */

	currentRange() {
		if (this.state.view === 'month') {
			const month = parseMonthKey(this.state.month) || startOfMonth(this.today);
			return monthGridRange(month, this.config.weekStart);
		}
		return resolvePeriod(this.state.period, this.today, this.state);
	}

	update(patch, { resetVisible = true } = {}) {
		Object.assign(this.state, patch);
		if (resetVisible) this.ui.visible = this.config.perPage;
		this.writeUrl();
		this.refresh();
	}

	refresh() {
		const { from, to } = this.currentRange();
		if (`${toYmd(from)}|${toYmd(to)}` !== this.dataKey) this.load();
		else this.render();
	}

	writeUrl() {
		if (!this.syncUrl) return;
		const next = writeStateToUrl(this.state, this.defaults, window.location.href);
		if (next !== window.location.href) window.history.replaceState(window.history.state, '', next);
	}

	setLanguage(lang) {
		this.i18n = createTranslator(lang);
		this.mount();
		this.render();
	}

	setView(view) {
		if (view === this.state.view) return;
		this.ui.selectedDay = null;
		this.update({ view });
	}

	setPeriod(period) {
		const patch = { period };
		if (this.state.sort === defaultSortFor(this.state.period)) patch.sort = defaultSortFor(period);
		if (period === 'custom' && !this.state.from) {
			const { from, to } = this.currentRange();
			patch.from = toYmd(from);
			patch.to = toYmd(to);
		}
		this.update(patch);
	}

	toggleSelection(facetKey, value, checked) {
		const current = this.state.selections[facetKey];
		const next = checked ? [...new Set([...current, value])] : current.filter((v) => v !== value);
		this.update({ selections: { ...this.state.selections, [facetKey]: next } });
	}

	clearFilters() {
		this.searchInput.value = '';
		this.update({ search: '', featuredOnly: false, selections: cloneState(this.defaults).selections });
	}

	navigateMonth(delta) {
		const base = parseMonthKey(this.state.month) || startOfMonth(this.today);
		const month = delta === 'today' ? startOfMonth(this.today) : addMonths(base, delta);
		this.ui.selectedDay = delta === 'today' ? toYmd(this.today) : null;
		this.update({ month: toMonthKey(month) });
	}

	selectDay(ymd) {
		this.ui.selectedDay = ymd;
		this.render();
		if (ymd && window.matchMedia(MOBILE_QUERY).matches) {
			this.results.querySelector('.ic-month__agenda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	toggleFilters(open) {
		this.ui.filtersOpen = open;
		this.app.classList.toggle('filters-open', open);
		this.filtersButton.setAttribute('aria-expanded', String(open));
		document.documentElement.classList.toggle('ic-scroll-lock', open && window.matchMedia(MOBILE_QUERY).matches);
		if (open) this.sidebar.querySelector('.ic-sidebar__close')?.focus();
		else this.filtersButton.focus();
	}

	openEvent(event) {
		const ctx = this.cardContext();
		if (typeof this.dialog.showModal !== 'function') {
			this.selectDay(toYmd(event.startDay));
			return;
		}
		this.dialog.replaceChildren(
			h(
				'div',
				{ class: 'ic-dialog__inner' },
				h(
					'button',
					{ type: 'button', class: 'ic-icon-btn ic-dialog__close', 'aria-label': this.i18n.t('close'), onClick: () => this.dialog.close() },
					icon('close'),
				),
				renderEventHeading(event, ctx),
				renderEventDetails(event, ctx),
			),
		);
		this.dialog.showModal();
	}

	/* ------------------------------------------------------------------ */
	/* Data                                                               */
	/* ------------------------------------------------------------------ */

	async load() {
		const { from, to } = this.currentRange();
		const key = `${toYmd(from)}|${toYmd(to)}`;
		const seq = ++this.requestSeq;

		if (this.cache.has(key)) {
			this.data = this.cache.get(key);
			this.dataKey = key;
			this.status = 'ready';
			this.render();
			return;
		}

		this.status = 'loading';
		this.render();

		try {
			const payload = await this.api.getEvents(toYmd(from), toYmd(to));
			if (seq !== this.requestSeq) return;
			const data = prepareData(payload, { locationCategories: this.config.locationCategories });
			this.cache.set(key, data);
			this.data = data;
			this.dataKey = key;
			this.status = 'ready';
		} catch (error) {
			if (seq !== this.requestSeq) return;
			console.error('[ipsc-calendar]', error);
			this.status = 'error';
		}
		this.render();
	}

	/* ------------------------------------------------------------------ */
	/* Rendering                                                          */
	/* ------------------------------------------------------------------ */

	cardContext() {
		return { i18n: this.i18n, data: this.data, today: this.today, expanded: this.ui.expandedEvents, uid: this.uid };
	}

	/** Builds the static shell. Called again only when the language changes. */
	mount() {
		const { t, lang } = this.i18n;
		const searchId = `${this.uid}-search`;
		const sortId = `${this.uid}-sort`;
		let searchTimer = null;

		this.searchInput = h('input', {
			type: 'search',
			id: searchId,
			class: 'ic-search__input',
			placeholder: t('search_placeholder'),
			value: this.state.search,
			autocomplete: 'off',
			enterkeyhint: 'search',
			onInput: (e) => {
				window.clearTimeout(searchTimer);
				const value = e.target.value;
				searchTimer = window.setTimeout(() => this.update({ search: value }), SEARCH_DEBOUNCE_MS);
			},
		});

		this.filtersBadge = h('span', { class: 'ic-count-badge', hidden: true });
		this.filtersButton = h(
			'button',
			{
				type: 'button',
				class: 'ic-btn ic-btn--outline ic-filters-toggle',
				'aria-controls': `${this.uid}-sidebar`,
				'aria-expanded': 'false',
				onClick: () => this.toggleFilters(true),
			},
			icon('filter'),
			h('span', null, t('filters')),
			this.filtersBadge,
		);

		this.viewButtons = VIEWS.map((view) =>
			h(
				'button',
				{ type: 'button', class: 'ic-segmented__btn', dataset: { view }, onClick: () => this.setView(view) },
				icon(view === 'list' ? 'list' : 'grid'),
				h('span', null, t(`view_${view}`)),
			),
		);

		this.sortSelect = h(
			'select',
			{ id: sortId, class: 'ic-select', onChange: (e) => this.update({ sort: e.target.value }) },
			SORTS.map((sort) => h('option', { value: sort }, t(`sort_${sort.replace('-', '_')}`))),
		);
		this.sortWrap = h('div', { class: 'ic-sort' }, h('label', { class: 'ic-sort__label', for: sortId }, t('sort_label')), this.sortSelect);

		const langSwitch =
			this.config.langSwitch &&
			h(
				'div',
				{ class: 'ic-segmented ic-lang', role: 'group', 'aria-label': t('language') },
				SUPPORTED_LANGS.map((code) =>
					h(
						'button',
						{
							type: 'button',
							class: 'ic-segmented__btn',
							lang: code,
							'aria-pressed': String(code === lang),
							onClick: () => {
								if (code === this.i18n.lang) return;
								storeLang(code);
								this.setLanguage(code);
							},
						},
						code.toUpperCase(),
					),
				),
			);

		const toolbar = h(
			'div',
			{ class: 'ic-toolbar' },
			h('div', { class: 'ic-search' }, h('label', { class: 'ic-sr-only', for: searchId }, t('search_label')), icon('search'), this.searchInput),
			h(
				'div',
				{ class: 'ic-toolbar__controls' },
				this.filtersButton,
				h('div', { class: 'ic-segmented', role: 'group', 'aria-label': t('view_label') }, this.viewButtons),
				this.sortWrap,
				langSwitch,
			),
		);

		this.sidebar = h('aside', { class: 'ic-sidebar', id: `${this.uid}-sidebar`, 'aria-label': t('filters') });
		this.summary = h('p', { class: 'ic-summary', role: 'status', 'aria-live': 'polite' });
		this.chips = h('div', { class: 'ic-chips' });
		this.results = h('div', { class: 'ic-results' });
		this.subscribeMenu = this.renderSubscribe();
		this.dialog = h('dialog', {
			class: 'ic-dialog',
			onClick: (e) => {
				if (e.target === this.dialog) this.dialog.close();
			},
		});

		this.app = h(
			'div',
			{ class: ['ic-app', this.ui.filtersOpen && 'filters-open'], lang },
			toolbar,
			h(
				'div',
				{ class: 'ic-layout' },
				h('div', { class: 'ic-backdrop', onClick: () => this.toggleFilters(false) }),
				this.sidebar,
				h(
					'div',
					{ class: 'ic-main' },
					this.summary,
					this.chips,
					this.results,
					this.subscribeMenu && h('div', { class: 'ic-footer' }, this.subscribeMenu),
				),
			),
			this.dialog,
		);

		this.app.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.ui.filtersOpen) this.toggleFilters(false);
		});

		this.root.replaceChildren(this.app);
	}

	render() {
		this.renderToolbar();
		const loading = this.status === 'loading';
		this.app.classList.toggle('is-loading', loading && Boolean(this.data));

		if (!this.data) {
			this.sidebar.replaceChildren();
			this.summary.textContent = loading ? this.i18n.t('loading') : '';
			this.chips.replaceChildren();
			this.results.replaceChildren(loading ? this.renderSkeleton() : this.renderError());
			return;
		}
		// Keep the previous results visible (dimmed) until new data arrives.
		if (loading) return;

		const active = document.activeElement;
		const focusKey = this.root.contains(active) ? active.dataset?.focusKey : null;

		const range = this.currentRange();
		const criteria = buildCriteria(this.state, range, this.config.restrictCategories);
		const filtered = filterEvents(this.data.events, criteria);
		const facets = computeFacets(this.data.events, criteria);

		this.renderSidebar(facets, filtered.length, range);
		this.renderSummary(filtered.length, range);
		this.renderChips();
		this.results.replaceChildren(this.status === 'error' ? this.renderError() : this.renderResults(filtered, range));

		if (focusKey) {
			const target = this.root.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
			if (target && target !== document.activeElement) target.focus({ preventScroll: true });
		}
	}

	renderToolbar() {
		for (const button of this.viewButtons) {
			button.setAttribute('aria-pressed', String(button.dataset.view === this.state.view));
		}
		this.sortWrap.hidden = this.state.view !== 'list';
		this.sortSelect.value = this.state.sort;
		if (document.activeElement !== this.searchInput && this.searchInput.value !== this.state.search) {
			this.searchInput.value = this.state.search;
		}
		const active = countActiveFilters(this.state) - (this.state.search.trim() ? 1 : 0);
		this.filtersBadge.hidden = active === 0;
		this.filtersBadge.textContent = String(active);
	}

	/** "Subscribe to calendar" menu – same options as The Events Calendar. */
	renderSubscribe() {
		const links = this.config.subscribe;
		if (!links) return null;
		const { t } = this.i18n;

		const items = [
			['google', 'subscribe_google', true],
			['ical', 'subscribe_ical', false],
			['outlook365', 'subscribe_outlook365', true],
			['outlookLive', 'subscribe_outlook_live', true],
			['ics', 'subscribe_ics', false],
		].map(([key, label, external]) => {
			const url = safeUrl(links[key]);
			return (
				url &&
				h(
					'li',
					null,
					h(
						'a',
						{
							class: 'ic-subscribe__item',
							href: url,
							target: external ? '_blank' : null,
							rel: external ? 'noopener noreferrer' : null,
						},
						h('span', null, t(label)),
						external && icon('external'),
					),
				)
			);
		});

		const feedUrl = safeUrl(links.feed);
		const copyItem =
			feedUrl &&
			h(
				'li',
				null,
				h(
					'button',
					{
						type: 'button',
						class: 'ic-subscribe__item',
						onClick: async (e) => {
							const label = e.currentTarget.firstChild;
							try {
								await navigator.clipboard.writeText(feedUrl);
								label.textContent = t('subscribe_copied');
								window.setTimeout(() => (label.textContent = t('subscribe_copy')), 2000);
							} catch {
								window.prompt(t('subscribe_copy'), feedUrl);
							}
						},
					},
					h('span', null, t('subscribe_copy')),
				),
			);

		return h(
			'details',
			{ class: 'ic-subscribe' },
			h('summary', { class: 'ic-btn ic-btn--outline' }, icon('calendar'), t('subscribe'), icon('chevronDown')),
			h(
				'div',
				{ class: 'ic-subscribe__menu' },
				h('p', { class: 'ic-subscribe__hint' }, t('subscribe_hint')),
				h('ul', { class: 'ic-subscribe__list' }, items, copyItem),
			),
		);
	}

	renderSidebar(facets, total, range) {
		const { t, tn, compare } = this.i18n;
		const sections = [];

		if (this.state.view === 'list') {
			const name = `${this.uid}-period`;
			sections.push(
				h(
					'fieldset',
					{ class: 'ic-facet ic-facet--period' },
					h('legend', { class: 'ic-facet__legend' }, t('period')),
					h(
						'div',
						{ class: 'ic-facet__options' },
						PERIODS.map((period) =>
							h(
								'label',
								{ class: 'ic-option ic-option--radio' },
								h('input', {
									type: 'radio',
									name,
									value: period,
									checked: this.state.period === period,
									dataset: { focusKey: `period-${period}` },
									onChange: () => this.setPeriod(period),
								}),
								h('span', { class: 'ic-option__label' }, t(`period_${period}`)),
							),
						),
					),
					this.state.period === 'custom' &&
						h(
							'div',
							{ class: 'ic-daterange' },
							this.renderDateInput('from', t('date_from'), toYmd(range.from)),
							this.renderDateInput('to', t('date_to'), toYmd(range.to)),
						),
				),
			);
		}

		const featuredToggle =
			(facets.hasFeatured || this.state.featuredOnly) &&
				h(
					'div',
					{ class: 'ic-facet ic-facet--toggle' },
					h(
						'label',
						{ class: 'ic-switch' },
						h('input', {
							type: 'checkbox',
							role: 'switch',
							checked: this.state.featuredOnly,
							dataset: { focusKey: 'featured' },
							onChange: (e) => this.update({ featuredOnly: e.target.checked }),
						}),
						h('span', { class: 'ic-switch__track', 'aria-hidden': 'true' }),
						h('span', null, t('featured_only')),
					),
				);

		// Order: period, tags, featured toggle, remaining facets.
		const facetSections = [];
		for (const facet of FACETS) {
			const counts = facets[facet.key];
			const selected = this.state.selections[facet.key];
			for (const value of selected) if (!counts.has(value)) counts.set(value, 0);
			if (counts.size === 0 || (counts.size < 2 && selected.length === 0)) continue;
			facetSections.push({ key: facet.key, node: this.renderFacet(facet.key, counts, selected, compare) });
		}
		sections.push(
			...facetSections.filter((s) => s.key === 'tags').map((s) => s.node),
			featuredToggle,
			...facetSections.filter((s) => s.key !== 'tags').map((s) => s.node),
		);

		const hasFilters = countActiveFilters(this.state) > 0;
		this.sidebar.replaceChildren(
			h(
				'div',
				{ class: 'ic-sidebar__header' },
				h('h2', { class: 'ic-sidebar__title' }, t('filters')),
				h(
					'button',
					{ type: 'button', class: 'ic-icon-btn ic-sidebar__close', 'aria-label': t('filters_close'), onClick: () => this.toggleFilters(false) },
					icon('close'),
				),
			),
			h('div', { class: 'ic-sidebar__body' }, sections),
			h(
				'div',
				{ class: 'ic-sidebar__footer' },
				hasFilters &&
					h('button', { type: 'button', class: 'ic-btn ic-btn--ghost', dataset: { focusKey: 'sidebar-clear' }, onClick: () => this.clearFilters() }, t('clear_all')),
				h('button', { type: 'button', class: 'ic-btn ic-btn--primary ic-sidebar__apply', onClick: () => this.toggleFilters(false) }, tn('filters_apply', total)),
			),
		);
	}

	renderDateInput(field, label, value) {
		const id = `${this.uid}-date-${field}`;
		return h(
			'div',
			{ class: 'ic-field' },
			h('label', { for: id }, label),
			h('input', {
				type: 'date',
				id,
				class: 'ic-input',
				value,
				dataset: { focusKey: `date-${field}` },
				onChange: (e) => {
					if (e.target.value) this.update({ [field]: e.target.value });
				},
			}),
		);
	}

	renderFacet(key, counts, selected, compare) {
		const { t } = this.i18n;
		const title = t(`facet_${key}`);
		const open = this.ui.openFacets.has(key);
		const expanded = this.ui.expandedFacets.has(key);
		const optionsId = `${this.uid}-facet-${key}`;

		const options = [...counts.entries()]
			.map(([value, count]) => ({ value, count, label: facetOptionLabel(key, value, this.data) }))
			.sort((a, b) => compare(a.label, b.label));
		const visible = expanded
			? options
			: options.filter((opt, index) => index < FACET_PREVIEW_COUNT || selected.includes(opt.value));
		const hiddenCount = options.length - visible.length;

		return h(
			'section',
			{ class: ['ic-facet', open && 'is-open'] },
			h(
				'h3',
				{ class: 'ic-facet__heading' },
				h(
					'button',
					{
						type: 'button',
						class: 'ic-facet__toggle',
						'aria-expanded': String(open),
						'aria-controls': optionsId,
						dataset: { focusKey: `facet-${key}` },
						onClick: () => {
							if (open) this.ui.openFacets.delete(key);
							else this.ui.openFacets.add(key);
							this.render();
						},
					},
					h('span', null, title),
					selected.length > 0 && h('span', { class: 'ic-count-badge' }, String(selected.length)),
					icon('chevronDown'),
				),
			),
			open &&
				h(
					'div',
					{ class: 'ic-facet__options', id: optionsId, role: 'group', 'aria-label': title },
					visible.map((opt) => {
						const checked = selected.includes(opt.value);
						const disabled = opt.count === 0 && !checked;
						return h(
							'label',
							{ class: ['ic-option', disabled && 'is-disabled'] },
							h('input', {
								type: 'checkbox',
								checked,
								disabled,
								dataset: { focusKey: `opt-${key}-${opt.value}` },
								onChange: (e) => this.toggleSelection(key, opt.value, e.target.checked),
							}),
							key === 'categories' &&
								h('span', { class: 'ic-option__swatch', style: { '--ic-swatch': categoryColor(this.data.categories.get(opt.value)) } }),
							h('span', { class: 'ic-option__label' }, opt.label),
							h('span', { class: 'ic-option__count' }, String(opt.count)),
						);
					}),
					(hiddenCount > 0 || expanded) &&
						options.length > FACET_PREVIEW_COUNT &&
						h(
							'button',
							{
								type: 'button',
								class: 'ic-link-btn',
								dataset: { focusKey: `facet-more-${key}` },
								onClick: () => {
									if (expanded) this.ui.expandedFacets.delete(key);
									else this.ui.expandedFacets.add(key);
									this.render();
								},
							},
							expanded ? t('show_fewer_options') : t('show_more_options', { n: hiddenCount }),
						),
				),
		);
	}

	renderSummary(count, range) {
		const { tn, dateRange } = this.i18n;
		const parts = [h('strong', null, tn('events_count', count))];
		if (this.state.view === 'list') parts.push(h('span', { class: 'ic-muted' }, ` · ${dateRange(range.from, range.to, RANGE_FORMAT)}`));
		this.summary.replaceChildren(...parts);
	}

	renderChips() {
		const { t } = this.i18n;
		const chips = [];
		const chip = (label, onRemove, key) =>
			h(
				'button',
				{ type: 'button', class: 'ic-chip', 'aria-label': t('remove_filter', { label }), dataset: { focusKey: `chip-${key}` }, onClick: onRemove },
				h('span', null, label),
				icon('close'),
			);

		const search = this.state.search.trim();
		if (search) {
			chips.push(
				chip(t('search_chip', { q: search }), () => {
					this.searchInput.value = '';
					this.update({ search: '' });
				}, 'search'),
			);
		}
		if (this.state.view === 'list' && this.state.period !== this.defaults.period) {
			chips.push(chip(t(`period_${this.state.period}`), () => this.setPeriod(this.defaults.period), 'period'));
		}
		if (this.state.featuredOnly) chips.push(chip(t('featured_only'), () => this.update({ featuredOnly: false }), 'featured'));
		for (const facet of FACETS) {
			for (const value of this.state.selections[facet.key]) {
				chips.push(
					chip(facetOptionLabel(facet.key, value, this.data), () => this.toggleSelection(facet.key, value, false), `${facet.key}-${value}`),
				);
			}
		}
		if (chips.length > 1 || (chips.length === 1 && countActiveFilters(this.state) > 0)) {
			chips.push(h('button', { type: 'button', class: 'ic-link-btn', dataset: { focusKey: 'chips-clear' }, onClick: () => this.clearFilters() }, t('clear_all')));
		}
		this.chips.replaceChildren(...chips);
		this.chips.hidden = chips.length === 0;
	}

	renderResults(filtered, range) {
		const ctx = this.cardContext();

		if (this.state.view === 'month') {
			return renderMonth({
				monthDate: parseMonthKey(this.state.month) || startOfMonth(this.today),
				events: sortEvents(filtered, 'date-asc', this.i18n.compare),
				weekStart: this.config.weekStart,
				selectedDay: this.ui.selectedDay,
				ctx,
				onNavigate: (delta) => this.navigateMonth(delta),
				onSelectDay: (ymd) => this.selectDay(ymd),
				onOpenEvent: (event) => this.openEvent(event),
			});
		}

		if (filtered.length === 0) return this.renderEmpty();

		return renderList({
			events: sortEvents(filtered, this.state.sort, this.i18n.compare),
			sort: this.state.sort,
			visible: this.ui.visible,
			rangeFrom: range.from,
			ctx,
			onLoadMore: () => {
				this.ui.visible += this.config.perPage;
				this.render();
			},
		});
	}

	renderEmpty() {
		const { t } = this.i18n;
		return h(
			'div',
			{ class: 'ic-state' },
			icon('calendar'),
			h('h2', { class: 'ic-state__title' }, t('empty_title')),
			h('p', { class: 'ic-muted' }, t('empty_hint')),
			countActiveFilters(this.state) > 0 &&
				h('button', { type: 'button', class: 'ic-btn ic-btn--outline', onClick: () => this.clearFilters() }, t('clear_all')),
		);
	}

	renderError() {
		const { t } = this.i18n;
		return h(
			'div',
			{ class: 'ic-state ic-state--error', role: 'alert' },
			h('h2', { class: 'ic-state__title' }, t('load_error')),
			h('button', { type: 'button', class: 'ic-btn ic-btn--outline', onClick: () => this.load() }, t('retry')),
		);
	}

	renderSkeleton() {
		return h(
			'div',
			{ class: 'ic-skeleton', 'aria-hidden': 'true' },
			Array.from({ length: 4 }, () => h('div', { class: 'ic-skeleton__card' }, h('span'), h('div', null, h('i'), h('i'), h('i')))),
		);
	}
}

export function boot(scope = document) {
	for (const root of scope.querySelectorAll('.ipsc-cal[data-config]')) {
		if (root.dataset.icMounted) continue;
		root.dataset.icMounted = '1';
		let config = {};
		try {
			config = JSON.parse(root.dataset.config || '{}');
		} catch (error) {
			console.error('[ipsc-calendar] Invalid config', error);
		}
		new CalendarApp(root, config);
	}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
else boot();
