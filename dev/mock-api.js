/**
 * Development-only mock of GET /ipsc-calendar/v1/events.
 * Generates deterministic sample data around the current date and intercepts fetch().
 */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const iso = (d) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

function random(seed) {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) % 4294967296;
		return s / 4294967296;
	};
}

const categories = [
	{ slug: 'level-i', name: 'Level I', color: '' },
	{ slug: 'level-ii', name: 'Level II', color: '' },
	{ slug: 'level-iii', name: 'Level III', color: '' },
	{ slug: 'pistol', name: 'Pistolet', color: '' },
	{ slug: 'rifle', name: 'Karabin', color: '' },
	{ slug: 'shotgun', name: 'Strzelba', color: '' },
	{ slug: 'pcc', name: 'PCC', color: '' },
	{ slug: 'mini-rifle', name: 'Mini Rifle', color: '' },
	{ slug: 'training', name: 'Szkolenie', color: '' },
	// Location categories, as used on the real site.
	...['Dolnośląskie', 'Łódzkie', 'Małopolskie', 'Mazowieckie', 'Podkarpackie', 'Podlaskie', 'Pomorskie', 'Śląskie', 'Wielkopolskie', 'Zagranica', 'Zagranica Strzelba'].map((name) => ({
		slug: name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ł/g, 'l').replace(/\s+/g, '-'),
		name,
		color: '',
	})),
];
const slugOf = (name) => categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.slug;

const tags = [
	{ slug: 'night-match', name: 'Nocne' },
	{ slug: 'beginners', name: 'Dla początkujących' },
	{ slug: 'league', name: 'Liga' },
];

const venues = [
	['Strzelnica Pod Lasem', 'ul. Leśna 12', '05-500', 'Piaseczno', 'mazowieckie'],
	['Centrum Strzeleckie Wisła', 'ul. Nadbrzeżna 3', '30-001', 'Kraków', 'małopolskie'],
	['Strzelnica Miejska', 'ul. Sportowa 8', '90-001', 'Łódź', 'łódzkie'],
	['Ośrodek Strzelecki Odra', 'ul. Portowa 21', '50-001', 'Wrocław', 'dolnośląskie'],
	['Strzelnica Warta', 'ul. Polna 4', '60-001', 'Poznań', 'wielkopolskie'],
	['Strzelnica Bałtyk', 'ul. Morska 77', '80-001', 'Gdańsk', 'pomorskie'],
	['Strzelnica Podkarpacie', 'ul. Górska 2', '35-001', 'Rzeszów', 'podkarpackie'],
	['Strzelnica Puszcza', 'ul. Żubrowa 9', '15-001', 'Białystok', 'podlaskie'],
	['Arena Strzelecka Śląsk', 'ul. Hutnicza 15', '40-001', 'Katowice', 'śląskie'],
].map(([name, address, zip, city, region], i) => ({ id: 100 + i, name, address, zip, city, region, country: 'Polska' }));

const organizers = [
	'Klub Strzelecki Orzeł',
	'Stowarzyszenie Strzeleckie Grot',
	'KS Celność',
	'Akademia Strzelecka Tarcza',
	'Klub Sportowy Dynamika',
	'Fundacja Strzelectwa Praktycznego',
].map((name, i) => ({ id: 200 + i, name, website: 'https://example.org/' }));

const titles = [
	'Puchar {city}',
	'Mistrzostwa Okręgu {region}',
	'Zawody Klubowe {org}',
	'Memoriał im. Jana Kowalskiego',
	'Liga Strzelecka – runda {n}',
	'Grand Prix {city}',
	'Trening otwarty IPSC',
	'Szkolenie wstępne IPSC',
	'Night Shoot {city}',
];

function generateEvents() {
	const rnd = random(42);
	const pick = (list) => list[Math.floor(rnd() * list.length)];
	const today = new Date();
	const events = [];

	for (let i = 0; i < 160; i++) {
		const offset = Math.floor(rnd() * 540) - 180;
		const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 8 + Math.floor(rnd() * 3), rnd() > 0.5 ? 30 : 0);
		const multiDay = rnd() < 0.18;
		const allDay = !multiDay && rnd() < 0.15;
		const end = multiDay
			? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1 + Math.floor(rnd() * 2), 17, 0)
			: new Date(start.getFullYear(), start.getMonth(), start.getDate(), allDay ? 23 : 15 + Math.floor(rnd() * 3), allDay ? 59 : 0);

		const venue = pick(venues);
		const organizer = pick(organizers);
		const level = pick(['level-i', 'level-i', 'level-i', 'level-ii', 'level-ii', 'level-iii', 'training']);
		const division = pick(['pistol', 'pistol', 'pistol', 'rifle', 'shotgun', 'pcc', 'mini-rifle']);
		const title = pick(titles)
			.replace('{city}', venue.city)
			.replace('{region}', venue.region)
			.replace('{org}', organizer.name)
			.replace('{n}', String(1 + Math.floor(rnd() * 8)));
		const abroad = rnd() < 0.1;

		events.push({
			id: 1000 + i,
			title,
			url: `https://example.org/wydarzenie/${1000 + i}/`,
			start: iso(start),
			end: allDay ? `${ymd(start)}T23:59:59` : iso(end),
			allDay,
			timezone: 'Europe/Warsaw',
			excerpt: 'Zawody strzeleckie rozgrywane zgodnie z przepisami IPSC. Zapisy przez system rejestracji, limit miejsc. Na miejscu sędziowie, catering i parking.',
			image: rnd() < 0.3 ? `https://picsum.photos/seed/ipsc${i}/400/280` : '',
			cost: level === 'training' ? '' : `${pick([80, 100, 120, 150, 200])} zł`,
			featured: rnd() < 0.08,
			website: rnd() < 0.5 ? 'https://example.org/' : '',
			categories: [
				...(level === 'training' ? [level] : [level, division]),
				...(abroad ? [division === 'shotgun' ? 'zagranica-strzelba' : 'zagranica'] : [slugOf(venue.region)]),
			].filter(Boolean),
			tags: rnd() < 0.3 ? [pick(tags).slug] : [],
			venue: !abroad && rnd() < 0.95 ? venue.id : null,
			organizers: [organizer.id],
			gcal: 'https://www.google.com/calendar/event?action=TEMPLATE',
			ical: `https://example.org/wydarzenie/${1000 + i}/?ical=1`,
			added: new Date(Date.now() - Math.floor(rnd() * 90) * 86400000).toISOString(),
		});
	}
	return events.sort((a, b) => a.start.localeCompare(b.start));
}

const allEvents = generateEvents();

function respond(from, to) {
	const rangeStart = `${from}T00:00:00`;
	const rangeEnd = `${to}T23:59:59`;
	const events = allEvents.filter((e) => e.start <= rangeEnd && e.end >= rangeStart);
	const used = (key) => new Set(events.flatMap((e) => [].concat(e[key] ?? [])));
	const usedCats = used('categories');
	const usedTags = used('tags');
	const usedVenues = used('venue');
	const usedOrgs = used('organizers');
	return {
		from,
		to,
		generatedAt: new Date().toISOString(),
		events,
		categories: categories.filter((c) => usedCats.has(c.slug)),
		tags: tags.filter((t) => usedTags.has(t.slug)),
		venues: venues.filter((v) => usedVenues.has(v.id)),
		organizers: organizers.filter((o) => usedOrgs.has(o.id)),
	};
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
	const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
	if (!url.pathname.endsWith('/ipsc-calendar/v1/events')) return realFetch(input, init);
	await new Promise((resolve) => setTimeout(resolve, 350));
	const body = JSON.stringify(respond(url.searchParams.get('from'), url.searchParams.get('to')));
	return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
};
