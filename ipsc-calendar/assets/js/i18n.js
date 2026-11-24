/**
 * UI translations. Plural forms follow Intl.PluralRules categories
 * (Polish uses one / few / many / other).
 */

export const SUPPORTED_LANGS = ['pl', 'en'];

const LOCALES = { pl: 'pl-PL', en: 'en-GB' };

const dictionaries = {
	en: {
		language: 'Language',
		search_label: 'Search events',
		search_placeholder: 'Search by name, venue, city, organizer…',
		view_label: 'View',
		view_list: 'List',
		view_month: 'Month',
		sort_label: 'Sort',
		sort_date_asc: 'Date – earliest first',
		sort_date_desc: 'Date – latest first',
		sort_title_asc: 'Name A–Z',
		sort_title_desc: 'Name Z–A',
		sort_added_desc: 'Recently added',
		filters: 'Filters',
		filters_close: 'Close filters',
		filters_apply: { one: 'Show {n} event', other: 'Show {n} events' },
		clear_all: 'Clear all',
		period: 'When',
		period_upcoming: 'Upcoming',
		period_next7: 'Next 7 days',
		period_month: 'This month',
		period_next3: 'Next 3 months',
		period_year: 'This year',
		period_past: 'Past events',
		period_custom: 'Custom range',
		date_from: 'From',
		date_to: 'To',
		featured_only: 'Featured only',
		featured: 'Featured',
		ongoing: 'Ongoing',
		facet_categories: 'Category',
		facet_locations: 'Location',
		facet_cities: 'City',
		facet_venues: 'Venue',
		facet_organizers: 'Organizer',
		facet_tags: 'Tags',
		show_more_options: 'Show {n} more',
		show_fewer_options: 'Show fewer',
		events_count: { one: '{n} event', other: '{n} events' },
		days_count: { one: '{n} day', other: '{n} days' },
		showing: 'Showing {shown} of {total}',
		load_more: 'Show more events',
		loading: 'Loading events…',
		load_error: 'Could not load events.',
		retry: 'Try again',
		empty_title: 'No events match your filters',
		empty_hint: 'Try a different date range or remove some filters.',
		remove_filter: 'Remove filter: {label}',
		search_chip: 'Search: “{q}”',
		all_day: 'All day',
		details: 'Details',
		hide_details: 'Hide details',
		when: 'When',
		where: 'Where',
		organizer: 'Organizer',
		cost: 'Cost',
		event_page: 'Event page',
		website: 'Website',
		add_google: 'Google Calendar',
		add_ical: 'Download .ics',
		show_map: 'Show on map',
		prev_month: 'Previous month',
		next_month: 'Next month',
		today: 'Today',
		more_events: '+{n} more',
		day_events: 'Events on {date}',
		month_events: 'All events in {month}',
		show_whole_month: 'Show the whole month',
		no_events_day: 'No events on this day.',
		no_events_month: 'No events this month match your filters.',
		close: 'Close',
		subscribe: 'Subscribe to calendar',
		subscribe_hint: 'A subscribed calendar updates automatically with new events.',
		subscribe_google: 'Google Calendar',
		subscribe_ical: 'iCalendar (Apple, Thunderbird…)',
		subscribe_outlook365: 'Outlook 365',
		subscribe_outlook_live: 'Outlook Live',
		subscribe_ics: 'Export .ics file',
		subscribe_copy: 'Copy calendar URL',
		subscribe_copied: 'Copied!',
	},
	pl: {
		language: 'Język',
		search_label: 'Szukaj wydarzeń',
		search_placeholder: 'Szukaj po nazwie, miejscu, mieście, organizatorze…',
		view_label: 'Widok',
		view_list: 'Lista',
		view_month: 'Miesiąc',
		sort_label: 'Sortuj',
		sort_date_asc: 'Data – od najbliższych',
		sort_date_desc: 'Data – od najdalszych',
		sort_title_asc: 'Nazwa A–Z',
		sort_title_desc: 'Nazwa Z–A',
		sort_added_desc: 'Ostatnio dodane',
		filters: 'Filtry',
		filters_close: 'Zamknij filtry',
		filters_apply: {
			one: 'Pokaż {n} wydarzenie',
			few: 'Pokaż {n} wydarzenia',
			many: 'Pokaż {n} wydarzeń',
			other: 'Pokaż {n} wydarzenia',
		},
		clear_all: 'Wyczyść wszystko',
		period: 'Termin',
		period_upcoming: 'Nadchodzące',
		period_next7: 'Najbliższe 7 dni',
		period_month: 'Ten miesiąc',
		period_next3: 'Najbliższe 3 miesiące',
		period_year: 'Ten rok',
		period_past: 'Minione',
		period_custom: 'Własny zakres',
		date_from: 'Od',
		date_to: 'Do',
		featured_only: 'Tylko wyróżnione',
		featured: 'Wyróżnione',
		ongoing: 'W trakcie',
		facet_categories: 'Kategoria',
		facet_locations: 'Lokalizacja',
		facet_cities: 'Miejscowość',
		facet_venues: 'Miejsce',
		facet_organizers: 'Organizator',
		facet_tags: 'Tagi',
		show_more_options: 'Pokaż {n} więcej',
		show_fewer_options: 'Pokaż mniej',
		events_count: {
			one: '{n} wydarzenie',
			few: '{n} wydarzenia',
			many: '{n} wydarzeń',
			other: '{n} wydarzenia',
		},
		days_count: { one: '{n} dzień', few: '{n} dni', many: '{n} dni', other: '{n} dnia' },
		showing: 'Wyświetlono {shown} z {total}',
		load_more: 'Pokaż więcej wydarzeń',
		loading: 'Wczytywanie wydarzeń…',
		load_error: 'Nie udało się wczytać wydarzeń.',
		retry: 'Spróbuj ponownie',
		empty_title: 'Brak wydarzeń spełniających kryteria',
		empty_hint: 'Zmień zakres dat lub usuń część filtrów.',
		remove_filter: 'Usuń filtr: {label}',
		search_chip: 'Szukaj: „{q}”',
		all_day: 'Cały dzień',
		details: 'Szczegóły',
		hide_details: 'Ukryj szczegóły',
		when: 'Kiedy',
		where: 'Gdzie',
		organizer: 'Organizator',
		cost: 'Koszt',
		event_page: 'Strona wydarzenia',
		website: 'Strona www',
		add_google: 'Kalendarz Google',
		add_ical: 'Pobierz .ics',
		show_map: 'Pokaż na mapie',
		prev_month: 'Poprzedni miesiąc',
		next_month: 'Następny miesiąc',
		today: 'Dziś',
		more_events: '+{n} więcej',
		day_events: 'Wydarzenia: {date}',
		month_events: 'Wszystkie wydarzenia – {month}',
		show_whole_month: 'Pokaż cały miesiąc',
		no_events_day: 'Brak wydarzeń tego dnia.',
		no_events_month: 'Brak wydarzeń w tym miesiącu spełniających kryteria.',
		close: 'Zamknij',
		subscribe: 'Subskrybuj kalendarz',
		subscribe_hint: 'Zasubskrybowany kalendarz sam aktualizuje się o nowe wydarzenia.',
		subscribe_google: 'Kalendarz Google',
		subscribe_ical: 'iCalendar (Apple, Thunderbird…)',
		subscribe_outlook365: 'Outlook 365',
		subscribe_outlook_live: 'Outlook Live',
		subscribe_ics: 'Eksportuj plik .ics',
		subscribe_copy: 'Kopiuj adres kalendarza',
		subscribe_copied: 'Skopiowano!',
	},
};

const interpolate = (text, vars) =>
	text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));

const capitalize = (s) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

export function normalizeLang(lang) {
	const short = String(lang || '').slice(0, 2).toLowerCase();
	return SUPPORTED_LANGS.includes(short) ? short : 'en';
}

/**
 * @param {string} lang 'pl' | 'en'
 */
export function createTranslator(lang) {
	const code = normalizeLang(lang);
	const locale = LOCALES[code];
	const dict = dictionaries[code];
	const plurals = new Intl.PluralRules(locale);
	const formatters = new Map();

	const format = (options) => {
		const key = JSON.stringify(options);
		if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat(locale, options));
		return formatters.get(key);
	};

	return {
		lang: code,
		locale,

		t(key, vars = {}) {
			const entry = dict[key] ?? dictionaries.en[key] ?? key;
			return interpolate(typeof entry === 'string' ? entry : entry.other, vars);
		},

		/** Pluralized translation; `{n}` is replaced with the count. */
		tn(key, count, vars = {}) {
			const entry = dict[key] ?? dictionaries.en[key];
			if (!entry) return key;
			const text = typeof entry === 'string' ? entry : entry[plurals.select(count)] ?? entry.other;
			return interpolate(text, { n: count, ...vars });
		},

		date: (d, options) => format(options).format(d),

		dateRange(a, b, options) {
			const f = format(options);
			return typeof f.formatRange === 'function' ? f.formatRange(a, b) : `${f.format(a)} – ${f.format(b)}`;
		},

		monthTitle: (d) => capitalize(format({ month: 'long', year: 'numeric' }).format(d)),

		time: (d) => format({ hour: '2-digit', minute: '2-digit' }).format(d),

		compare: (a, b) => a.localeCompare(b, locale, { sensitivity: 'base', numeric: true }),
	};
}
